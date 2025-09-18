import { PaymentService } from '../../services/paymentService';
import { PaymentPersistenceService } from '../../services/persistence';
import { createEventBus } from '../../services/eventBus';
import { PaymentRequest, PaymentStatus, PaymentMethod, IEventBus } from '../../types';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let persistenceService: PaymentPersistenceService;
  let eventBus: IEventBus;

  beforeEach(() => {
    persistenceService = new PaymentPersistenceService({
      dataFile: './test-data/payments.json',
      enableFilePersistence: false // Use in-memory for tests
    });
    
    eventBus = createEventBus({
      enableHistory: true,
      maxHistorySize: 100,
      enableLogging: false, // Disable logging in tests
      retryAttempts: 1,
      retryDelayMs: 0
    });
    
    paymentService = new PaymentService(persistenceService, eventBus);
  });

  afterEach(async () => {
    await persistenceService.clearAll();
    eventBus.clearHistory();
  });

  describe('createPayment', () => {
    const validPaymentRequest: PaymentRequest = {
      amount: 99.99,
      currency: 'USD',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      description: 'Test payment',
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      merchantId: '987fcdeb-51a2-43d1-b789-123456789abc',
      metadata: { orderId: 'ORD-123' }
    };

    it('should create a payment successfully', async () => {
      const payment = await paymentService.createPayment(validPaymentRequest);

      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(99.99);
      expect(payment.currency).toBe('USD');
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
      expect(payment.customerId).toBe(validPaymentRequest.customerId);
      expect(payment.merchantId).toBe(validPaymentRequest.merchantId);
      expect(payment.description).toBe(validPaymentRequest.description);
      expect(payment.metadata).toEqual(validPaymentRequest.metadata);
      expect(payment.createdAt).toBeInstanceOf(Date);
      expect(payment.updatedAt).toBeInstanceOf(Date);
    });

    it('should emit payment created event', async () => {
      const payment = await paymentService.createPayment(validPaymentRequest);
      
      const emittedEvents = eventBus.getEmittedEvents();
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0]?.eventType).toBe('payment.created');
      expect(emittedEvents[0]?.paymentId).toBe(payment.id);
    });

    it('should reject payment with invalid amount', async () => {
      const invalidRequest = { ...validPaymentRequest, amount: -10 };

      await expect(paymentService.createPayment(invalidRequest))
        .rejects.toThrow('Payment amount must be positive');
    });

    it('should reject payment with unsupported currency', async () => {
      const invalidRequest = { ...validPaymentRequest, currency: 'XYZ' };

      await expect(paymentService.createPayment(invalidRequest))
        .rejects.toThrow('Unsupported currency: XYZ');
    });

    it('should reject payment with amount exceeding limit', async () => {
      const invalidRequest = { ...validPaymentRequest, amount: 2000000 };

      await expect(paymentService.createPayment(invalidRequest))
        .rejects.toThrow('Payment amount exceeds maximum limit');
    });

    it('should reject payment with invalid customer ID', async () => {
      const invalidRequest = { ...validPaymentRequest, customerId: 'invalid-uuid' };

      await expect(paymentService.createPayment(invalidRequest))
        .rejects.toThrow('Invalid customer ID format');
    });

    it('should reject payment with invalid merchant ID', async () => {
      const invalidRequest = { ...validPaymentRequest, merchantId: 'invalid-uuid' };

      await expect(paymentService.createPayment(invalidRequest))
        .rejects.toThrow('Invalid merchant ID format');
    });

    it('should reject duplicate payment with same transaction ID', async () => {
      const requestWithTransactionId = {
        ...validPaymentRequest,
        metadata: { transactionId: 'TXN-123' }
      };

      // Create first payment with transactionId in metadata
      const firstPayment = await paymentService.createPayment(requestWithTransactionId);
      
      // Update the first payment to have the transactionId field set (simulating completion)
      await paymentService.updatePayment(firstPayment.id, { 
        transactionId: 'TXN-123' 
      });

      // Now try to create another payment with same transactionId - should fail
      await expect(paymentService.createPayment(requestWithTransactionId))
        .rejects.toThrow('Payment with transaction ID TXN-123 already exists');
    });
  });

  describe('getPayment', () => {
    it('should return payment by ID', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 50.00,
        currency: 'EUR',
        paymentMethod: PaymentMethod.DEBIT_CARD,
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
      };

      const createdPayment = await paymentService.createPayment(paymentRequest);
      const retrievedPayment = await paymentService.getPayment(createdPayment.id);

      // In test environment, payment should stay pending
      expect(retrievedPayment.id).toBe(createdPayment.id);
      expect(retrievedPayment.amount).toBe(createdPayment.amount);
      expect(retrievedPayment.status).toBe(PaymentStatus.PENDING);
    });

    it('should throw error for non-existent payment', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await expect(paymentService.getPayment(nonExistentId))
        .rejects.toThrow(`Payment with ID ${nonExistentId} not found`);
    });
  });

  describe('updatePayment', () => {
    it('should update payment status', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 75.50,
        currency: 'GBP',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
      };

      const createdPayment = await paymentService.createPayment(paymentRequest);
      
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updatedPayment = await paymentService.updatePayment(
        createdPayment.id,
        { status: PaymentStatus.COMPLETED }
      );

      expect(updatedPayment.status).toBe(PaymentStatus.COMPLETED);
      expect(updatedPayment.updatedAt.getTime()).toBeGreaterThan(
        createdPayment.updatedAt.getTime()
      );
    });

    it('should emit payment status change events', async () => {
      eventBus.clearHistory(); // Clear any events from creation
      
      const createdPayment = await paymentService.createPayment({
        amount: 75.50,
        currency: 'GBP',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
      });
      
      eventBus.clearHistory(); // Clear creation event, focus on update events
      
      await paymentService.updatePayment(
        createdPayment.id,
        { status: PaymentStatus.COMPLETED }
      );

      const emittedEvents = eventBus.getEmittedEvents();
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0]?.eventType).toBe('payment.completed');
      expect(emittedEvents[0]?.paymentId).toBe(createdPayment.id);
    });

    it('should reject invalid status transition', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
      };

      const createdPayment = await paymentService.createPayment(paymentRequest);

      // First update to completed (valid now)
      await paymentService.updatePayment(createdPayment.id, {
        status: PaymentStatus.COMPLETED
      });

      // Try to go from COMPLETED to PENDING (should fail)
      await expect(
        paymentService.updatePayment(createdPayment.id, {
          status: PaymentStatus.PENDING
        })
      ).rejects.toThrow('Cannot change payment status from completed to pending');
    });

    it('should allow valid status transition', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 25.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
      };

      const createdPayment = await paymentService.createPayment(paymentRequest);

      // PENDING -> PROCESSING (valid transition)
      const updatedPayment = await paymentService.updatePayment(
        createdPayment.id,
        { status: PaymentStatus.PROCESSING }
      );

      expect(updatedPayment.status).toBe(PaymentStatus.PROCESSING);
    });
  });

  describe('getPayments', () => {
    beforeEach(async () => {
      // Create test payments
      const payments = [
        {
          amount: 10.00,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        },
        {
          amount: 20.00,
          currency: 'EUR',
          paymentMethod: PaymentMethod.DEBIT_CARD,
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        },
        {
          amount: 30.00,
          currency: 'USD',
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          customerId: '456e7890-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        }
      ];

      for (const paymentRequest of payments) {
        await paymentService.createPayment(paymentRequest);
      }
    });

    it('should return all payments with pagination', async () => {
      const result = await paymentService.getPayments({ page: 1, limit: 2 });

      expect(result.payments).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should filter payments by currency', async () => {
      const result = await paymentService.getPayments({ currency: 'USD' });

      expect(result.payments).toHaveLength(2);
      expect(result.payments.every(p => p.currency === 'USD')).toBe(true);
    });

    it('should filter payments by customer ID', async () => {
      const result = await paymentService.getPayments({
        customerId: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result.payments).toHaveLength(2);
      expect(result.payments.every(p => p.customerId === '123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });
  });

  describe('getPaymentStats', () => {
    it('should return correct payment statistics', async () => {
      // Create test payments
      const payments = [
        { amount: 100.00, currency: 'USD', paymentMethod: PaymentMethod.CREDIT_CARD, customerId: '123e4567-e89b-12d3-a456-426614174000', merchantId: '987fcdeb-51a2-43d1-b789-123456789abc' },
        { amount: 200.00, currency: 'EUR', paymentMethod: PaymentMethod.DEBIT_CARD, customerId: '123e4567-e89b-12d3-a456-426614174000', merchantId: '987fcdeb-51a2-43d1-b789-123456789abc' },
        { amount: 300.00, currency: 'USD', paymentMethod: PaymentMethod.BANK_TRANSFER, customerId: '456e7890-e89b-12d3-a456-426614174000', merchantId: '987fcdeb-51a2-43d1-b789-123456789abc' }
      ];

      for (const paymentRequest of payments) {
        await paymentService.createPayment(paymentRequest);
      }

      const stats = await paymentService.getPaymentStats();

      expect(stats.totalPayments).toBe(3);
      expect(stats.totalAmount).toBe(600.00);
      expect(stats.averageAmount).toBe(200.00);
      expect(stats.statusCounts[PaymentStatus.PENDING]).toBe(3);
      expect(stats.currencyCounts.USD).toBe(2);
      expect(stats.currencyCounts.EUR).toBe(1);
      expect(stats.methodCounts[PaymentMethod.CREDIT_CARD]).toBe(1);
      expect(stats.methodCounts[PaymentMethod.DEBIT_CARD]).toBe(1);
      expect(stats.methodCounts[PaymentMethod.BANK_TRANSFER]).toBe(1);
    });
  });

  describe('deletePayment', () => {
    it('should delete pending payment', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 50.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
      };

      const createdPayment = await paymentService.createPayment(paymentRequest);
      // Ensure payment stays in pending status in test environment
      expect(createdPayment.status).toBe(PaymentStatus.PENDING);
      
      const deleted = await paymentService.deletePayment(createdPayment.id);

      expect(deleted).toBe(true);
      await expect(paymentService.getPayment(createdPayment.id))
        .rejects.toThrow('Payment with ID');
    });

    it('should not delete completed payment', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 50.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
      };

      const createdPayment = await paymentService.createPayment(paymentRequest);
      await paymentService.updatePayment(createdPayment.id, { status: PaymentStatus.COMPLETED });

      await expect(paymentService.deletePayment(createdPayment.id))
        .rejects.toThrow('Cannot change payment status from completed to deleted');
    });
  });
});
