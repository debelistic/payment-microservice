import { v4 as uuidv4 } from 'uuid';
import { 
  Payment, 
  PaymentRequest, 
  PaymentUpdateRequest, 
  PaymentStatus, 
  PaymentMethod,
  PaymentStats,
  PaymentListResponse,
  PaymentNotFoundError,
  InvalidPaymentStatusError,
  PaymentProcessingError,
  InsufficientFundsError,
  DuplicatePaymentError,
  IEventBus
} from '../types';
import { PaymentPersistenceService } from './persistence';
import { PaymentEventFactory } from '../utils/eventFactory';

export class PaymentService {
  private persistence: PaymentPersistenceService;
  private eventBus: IEventBus;

  constructor(persistence: PaymentPersistenceService, eventBus: IEventBus) {
    this.persistence = persistence;
    this.eventBus = eventBus;
  }

  async createPayment(request: PaymentRequest): Promise<Payment> {
    // simulate validation checks
    await this.validatePaymentRequest(request);

    // check for duplicate transaction (if transactionId is provided)
    if (request.metadata?.transactionId) {
      const existing = await this.persistence.findByTransactionId(
        request.metadata.transactionId as string
      );
      if (existing) {
        throw new DuplicatePaymentError(request.metadata.transactionId as string);
      }
    }

    const payment: Payment = {
      id: uuidv4(),
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      status: PaymentStatus.PENDING,
      paymentMethod: request.paymentMethod,
      description: request.description,
      customerId: request.customerId,
      merchantId: request.merchantId,
      metadata: request.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdPayment = await this.persistence.create(payment);

    // Emit payment created event
    try {
      const createdEvent = PaymentEventFactory.createPaymentCreatedEvent(createdPayment);
      await this.eventBus.emit(createdEvent);
    } catch (error) {
      console.error(`Failed to emit payment created event for ${createdPayment.id}:`, error);
    }

    // only start async processing in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      this.processPaymentAsync(createdPayment.id).catch(error => {
        console.error(`Failed to process payment ${createdPayment.id}:`, error);
      });
    }

    return createdPayment;
  }

  async getPayment(id: string): Promise<Payment> {
    const payment = await this.persistence.findById(id);
    if (!payment) {
      throw new PaymentNotFoundError(id);
    }
    return payment;
  }

  async updatePayment(id: string, updates: PaymentUpdateRequest): Promise<Payment> {
    const existingPayment = await this.persistence.findById(id);
    if (!existingPayment) {
      throw new PaymentNotFoundError(id);
    }

    // validate status transitions
    if (updates.status && !this.isValidStatusTransition(existingPayment.status, updates.status)) {
      throw new InvalidPaymentStatusError(existingPayment.status, updates.status);
    }

    const updateData: Partial<Payment> = {
      ...updates,
      updatedAt: new Date()
    };

    // set processedAt when status changes to completed or failed
    if (updates.status === PaymentStatus.COMPLETED || updates.status === PaymentStatus.FAILED) {
      updateData.processedAt = new Date();
    }

    const updatedPayment = await this.persistence.update(id, updateData);
    if (!updatedPayment) {
      throw new PaymentNotFoundError(id);
    }

    // Emit payment status change event
    try {
      const statusChangeEvent = PaymentEventFactory.createEventForStatusChange(
        updatedPayment,
        existingPayment.status,
        updates as Record<string, unknown>
      );
      if (statusChangeEvent) {
        await this.eventBus.emit(statusChangeEvent);
      }
    } catch (error) {
      console.error(`Failed to emit payment updated event for ${updatedPayment.id}:`, error);
    }

    return updatedPayment;
  }

  async getPayments(filters: {
    page?: number;
    limit?: number;
    status?: string;
    currency?: string;
    customerId?: string;
    merchantId?: string;
  } = {}): Promise<PaymentListResponse> {
    const { page = 1, limit = 10, ...otherFilters } = filters;
    
    const payments = await this.persistence.findAll({
      ...otherFilters,
      page,
      limit
    });

    const total = await this.persistence.count();
    const hasMore = (page * limit) < total;

    return {
      payments,
      total,
      page,
      limit,
      hasMore
    };
  }

  async getPaymentStats(): Promise<PaymentStats> {
    const allPayments = await this.persistence.findAll();
    
    const totalPayments = allPayments.length;
    const totalAmount = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;

    const statusCounts = Object.values(PaymentStatus).reduce((acc, status) => {
      acc[status] = allPayments.filter(p => p.status === status).length;
      return acc;
    }, {} as Record<PaymentStatus, number>);

    const currencyCounts = allPayments.reduce((acc, payment) => {
      acc[payment.currency] = (acc[payment.currency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const methodCounts = Object.values(PaymentMethod).reduce((acc, method) => {
      acc[method] = allPayments.filter(p => p.paymentMethod === method).length;
      return acc;
    }, {} as Record<PaymentMethod, number>);

    return {
      totalPayments,
      totalAmount,
      averageAmount,
      statusCounts,
      currencyCounts,
      methodCounts
    };
  }

  async deletePayment(id: string): Promise<boolean> {
    const payment = await this.persistence.findById(id);
    if (!payment) {
      throw new PaymentNotFoundError(id);
    }

    // only allow deletion of pending or cancelled payments
    if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.CANCELLED) {
      throw new InvalidPaymentStatusError(
        payment.status, 
        'deleted'
      );
    }

    const deleted = await this.persistence.delete(id);
    
    // Emit payment deleted event
    if (deleted) {
      try {
        const deletedEvent = PaymentEventFactory.createPaymentDeletedEvent(
          payment.id,
          payment.customerId,
          payment.merchantId
        );
        await this.eventBus.emit(deletedEvent);
      } catch (error) {
        console.error(`Failed to emit payment deleted event for ${payment.id}:`, error);
      }
    }

    return deleted;
  }

  private async validatePaymentRequest(request: PaymentRequest): Promise<void> {
    // simulate business validation
    if (request.amount <= 0) {
      throw new PaymentProcessingError('Payment amount must be positive');
    }

    if (request.amount > 1000000) {
      throw new PaymentProcessingError('Payment amount exceeds maximum limit');
    }

    // simulate currency validation
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
    if (!supportedCurrencies.includes(request.currency.toUpperCase())) {
      throw new PaymentProcessingError(`Unsupported currency: ${request.currency}`);
    }

    // simulate customer validation (in a real system, this would check against a customer service)
    if (!this.isValidUuid(request.customerId)) {
      throw new PaymentProcessingError('Invalid customer ID format');
    }

    if (!this.isValidUuid(request.merchantId)) {
      throw new PaymentProcessingError('Invalid merchant ID format');
    }
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private isValidStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): boolean {
    // allow same status (no change)
    if (currentStatus === newStatus) {
      return true;
    }

    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED, PaymentStatus.COMPLETED],
      [PaymentStatus.PROCESSING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
      [PaymentStatus.COMPLETED]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [PaymentStatus.PENDING],
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.REFUNDED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  private async processPaymentAsync(paymentId: string): Promise<void> {
    const processingStartTime = Date.now();
    
    try {
      // update status to processing
      await this.updatePayment(paymentId, { status: PaymentStatus.PROCESSING });

      // simulate payment processing delay
      await this.delay(Math.random() * 3000 + 1000); // 1-4 seconds

      const payment = await this.getPayment(paymentId);
      
      // simulate processing logic
      const success = await this.simulatePaymentProcessing(payment);
      
      const processingTime = Date.now() - processingStartTime;
      
      if (success) {
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await this.updatePayment(paymentId, { 
          status: PaymentStatus.COMPLETED,
          transactionId
        });
      } else {
        await this.updatePayment(paymentId, { 
          status: PaymentStatus.FAILED,
          failureReason: 'Payment processing failed - insufficient funds or network error'
        });
      }
    } catch (error) {
      console.error(`Error processing payment ${paymentId}:`, error);
      await this.updatePayment(paymentId, { 
        status: PaymentStatus.FAILED,
        failureReason: 'Payment processing failed due to system error'
      });
    }
  }

  private async simulatePaymentProcessing(payment: Payment): Promise<boolean> {
    // simulate various failure scenarios
    const failureRate = 0.15;
    
    if (Math.random() < failureRate) {
      return false;
    }

    // simulate insufficient funds for large amounts
    if (payment.amount > 50000 && Math.random() < 0.3) {
      return false;
    }

    // simulate network timeouts for certain payment methods
    if (payment.paymentMethod === 'cryptocurrency' && Math.random() < 0.2) {
      return false;
    }

    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
