import request from 'supertest';
import express from 'express';
import { PaymentService } from '../../services/paymentService';
import { PaymentPersistenceService } from '../../services/persistence';
import { createPaymentRoutes } from '../../routes/paymentRoutes';
import { errorHandler } from '../../middleware/errorHandler';
import { PaymentMethod } from '../../types';

describe('Payment Routes', () => {
  let app: express.Application;
  let paymentService: PaymentService;
  let persistenceService: PaymentPersistenceService;

  beforeEach(() => {
    persistenceService = new PaymentPersistenceService({
      dataFile: './test-data/payments.json',
      enableFilePersistence: false
    });
    paymentService = new PaymentService(persistenceService);
    
    app = express();
    app.use(express.json());
    app.use('/payments', createPaymentRoutes(paymentService));
    app.use(errorHandler);
  });

  afterEach(async () => {
    await persistenceService.clearAll();
  });

  describe('POST /payments', () => {
    const validPaymentData = {
      amount: 99.99,
      currency: 'USD',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      description: 'Test payment',
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      merchantId: '987fcdeb-51a2-43d1-b789-123456789abc',
      metadata: { orderId: 'ORD-123' }
    };

    it('should create a payment successfully', async () => {
      const response = await request(app)
        .post('/payments')
        .send(validPaymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.amount).toBe(99.99);
      expect(response.body.data.currency).toBe('USD');
      expect(response.body.data.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should reject payment with invalid data', async () => {
      const invalidData = { ...validPaymentData, amount: -10 };

      const response = await request(app)
        .post('/payments')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject payment with missing required fields', async () => {
      const incompleteData = { amount: 100 };

      const response = await request(app)
        .post('/payments')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /payments/:id', () => {
    it('should return payment by ID', async () => {
      // First create a payment
      const createResponse = await request(app)
        .post('/payments')
        .send({
          amount: 50.00,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        })
        .expect(201);

      const paymentId = createResponse.body.data.id;

      // Then retrieve it
      const response = await request(app)
        .get(`/payments/${paymentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(paymentId);
      expect(response.body.data.amount).toBe(50.00);
    });

    it('should return 404 for non-existent payment', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/payments/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_NOT_FOUND');
    });

    it('should reject invalid payment ID format', async () => {
      const response = await request(app)
        .get('/payments/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /payments', () => {
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
        }
      ];

      for (const paymentData of payments) {
        await request(app)
          .post('/payments')
          .send(paymentData);
      }
    });

    it('should return list of payments with pagination', async () => {
      const response = await request(app)
        .get('/payments?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(1);
      expect(response.body.data.hasMore).toBe(true);
    });

    it('should filter payments by currency', async () => {
      const response = await request(app)
        .get('/payments?currency=USD')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.payments[0].currency).toBe('USD');
    });

    it('should handle invalid query parameters', async () => {
      const response = await request(app)
        .get('/payments?page=0&limit=200')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /payments/:id', () => {
    it('should update payment status', async () => {
      // First create a payment
      const createResponse = await request(app)
        .post('/payments')
        .send({
          amount: 75.50,
          currency: 'GBP',
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        })
        .expect(201);

      const paymentId = createResponse.body.data.id;

      // Then update it
      const response = await request(app)
        .put(`/payments/${paymentId}`)
        .send({ status: 'processing' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('processing');
    });

    it('should reject update with invalid status transition', async () => {
      // First create a payment
      const createResponse = await request(app)
        .post('/payments')
        .send({
          amount: 100.00,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        })
        .expect(201);

      const paymentId = createResponse.body.data.id;

      // First update to completed
      await request(app)
        .put(`/payments/${paymentId}`)
        .send({ status: 'completed' })
        .expect(200);

      // Try invalid status transition from completed to pending
      const response = await request(app)
        .put(`/payments/${paymentId}`)
        .send({ status: 'pending' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should return 404 for non-existent payment', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .put(`/payments/${nonExistentId}`)
        .send({ status: 'processing' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('DELETE /payments/:id', () => {
    it('should delete pending payment', async () => {
      // First create a payment
      const createResponse = await request(app)
        .post('/payments')
        .send({
          amount: 50.00,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        })
        .expect(201);

      const paymentId = createResponse.body.data.id;

      // Then delete it
      const response = await request(app)
        .delete(`/payments/${paymentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);

      // Verify it's deleted
      await request(app)
        .get(`/payments/${paymentId}`)
        .expect(404);
    });

    it('should not delete completed payment', async () => {
      // First create and complete a payment
      const createResponse = await request(app)
        .post('/payments')
        .send({
          amount: 50.00,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        })
        .expect(201);

      const paymentId = createResponse.body.data.id;

      // Update to processing first (valid transition)
      await request(app)
        .put(`/payments/${paymentId}`)
        .send({ status: 'processing' })
        .expect(200);

      // Then complete it (valid transition)
      await request(app)
        .put(`/payments/${paymentId}`)
        .send({ status: 'completed' })
        .expect(200);

      // Try to delete completed payment
      const response = await request(app)
        .delete(`/payments/${paymentId}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('GET /payments/stats', () => {
    beforeEach(async () => {
      // Create test payments
      const payments = [
        {
          amount: 100.00,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        },
        {
          amount: 200.00,
          currency: 'EUR',
          paymentMethod: PaymentMethod.DEBIT_CARD,
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          merchantId: '987fcdeb-51a2-43d1-b789-123456789abc'
        }
      ];

      for (const paymentData of payments) {
        await request(app)
          .post('/payments')
          .send(paymentData);
      }
    });

    it('should return payment statistics', async () => {
      const response = await request(app)
        .get('/payments/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalPayments).toBe(2);
      expect(response.body.data.totalAmount).toBe(300.00);
      expect(response.body.data.averageAmount).toBe(150.00);
      expect(response.body.data.statusCounts.pending).toBe(2);
      expect(response.body.data.currencyCounts.USD).toBe(1);
      expect(response.body.data.currencyCounts.EUR).toBe(1);
    });
  });
});
