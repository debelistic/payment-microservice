import { v4 as uuidv4 } from 'uuid';
import {
  Payment,
  PaymentStatus,
  PaymentEvent,
  PaymentEventType,
  PaymentCreatedEvent,
  PaymentUpdatedEvent,
  PaymentProcessingEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentCancelledEvent,
  PaymentRefundedEvent,
  PaymentDeletedEvent
} from '../types';

/**
 * Base event properties that are common to all payment events
 */
interface BaseEventProps {
  paymentId: string;
  timestamp?: Date;
  version?: string;
  source?: string;
}

/**
 * Factory class for creating payment events
 */
export class PaymentEventFactory {
  private static readonly DEFAULT_VERSION = '1.0';
  private static readonly DEFAULT_SOURCE = 'payment-microservice';

  /**
   * Create a payment created event
   */
  static createPaymentCreatedEvent(
    payment: Payment,
    options: Partial<BaseEventProps> = {}
  ): PaymentCreatedEvent {
    return {
      eventId: uuidv4(),
      eventType: PaymentEventType.PAYMENT_CREATED,
      timestamp: options.timestamp || new Date(),
      paymentId: payment.id,
      version: options.version || this.DEFAULT_VERSION,
      source: options.source || this.DEFAULT_SOURCE,
      data: {
        payment
      }
    };
  }

  /**
   * Create a payment updated event
   */
  static createPaymentUpdatedEvent(
    payment: Payment,
    previousStatus: PaymentStatus | undefined,
    changes: Record<string, unknown>,
    options: Partial<BaseEventProps> = {}
  ): PaymentUpdatedEvent {
    return {
      eventId: uuidv4(),
      eventType: PaymentEventType.PAYMENT_UPDATED,
      timestamp: options.timestamp || new Date(),
      paymentId: payment.id,
      version: options.version || this.DEFAULT_VERSION,
      source: options.source || this.DEFAULT_SOURCE,
      data: {
        payment,
        previousStatus,
        changes
      }
    };
  }

  /**
   * Create a payment processing event
   */
  static createPaymentProcessingEvent(
    payment: Payment,
    options: Partial<BaseEventProps> = {}
  ): PaymentProcessingEvent {
    return {
      eventId: uuidv4(),
      eventType: PaymentEventType.PAYMENT_PROCESSING,
      timestamp: options.timestamp || new Date(),
      paymentId: payment.id,
      version: options.version || this.DEFAULT_VERSION,
      source: options.source || this.DEFAULT_SOURCE,
      data: {
        payment
      }
    };
  }

  /**
   * Create a payment completed event
   */
  static createPaymentCompletedEvent(
    payment: Payment,
    transactionId: string,
    processingTimeMs: number,
    options: Partial<BaseEventProps> = {}
  ): PaymentCompletedEvent {
    return {
      eventId: uuidv4(),
      eventType: PaymentEventType.PAYMENT_COMPLETED,
      timestamp: options.timestamp || new Date(),
      paymentId: payment.id,
      version: options.version || this.DEFAULT_VERSION,
      source: options.source || this.DEFAULT_SOURCE,
      data: {
        payment,
        transactionId,
        processingTimeMs
      }
    };
  }

  /**
   * Create a payment failed event
   */
  static createPaymentFailedEvent(
    payment: Payment,
    failureReason: string,
    processingTimeMs: number,
    options: Partial<BaseEventProps> = {}
  ): PaymentFailedEvent {
    return {
      eventId: uuidv4(),
      eventType: PaymentEventType.PAYMENT_FAILED,
      timestamp: options.timestamp || new Date(),
      paymentId: payment.id,
      version: options.version || this.DEFAULT_VERSION,
      source: options.source || this.DEFAULT_SOURCE,
      data: {
        payment,
        failureReason,
        processingTimeMs
      }
    };
  }

  /**
   * Create a payment cancelled event
   */
  static createPaymentCancelledEvent(
    payment: Payment,
    reason?: string,
    options: Partial<BaseEventProps> = {}
  ): PaymentCancelledEvent {
    return {
      eventId: uuidv4(),
      eventType: PaymentEventType.PAYMENT_CANCELLED,
      timestamp: options.timestamp || new Date(),
      paymentId: payment.id,
      version: options.version || this.DEFAULT_VERSION,
      source: options.source || this.DEFAULT_SOURCE,
      data: {
        payment,
        reason
      }
    };
  }

  /**
   * Create a payment refunded event
   */
  static createPaymentRefundedEvent(
    payment: Payment,
    refundAmount: number,
    refundReason?: string,
    options: Partial<BaseEventProps> = {}
  ): PaymentRefundedEvent {
    return {
      eventId: uuidv4(),
      eventType: PaymentEventType.PAYMENT_REFUNDED,
      timestamp: options.timestamp || new Date(),
      paymentId: payment.id,
      version: options.version || this.DEFAULT_VERSION,
      source: options.source || this.DEFAULT_SOURCE,
      data: {
        payment,
        refundAmount,
        refundReason
      }
    };
  }

  /**
   * Create a payment deleted event
   */
  static createPaymentDeletedEvent(
    paymentId: string,
    customerId: string,
    merchantId: string,
    options: Partial<BaseEventProps> = {}
  ): PaymentDeletedEvent {
    return {
      eventId: uuidv4(),
      eventType: PaymentEventType.PAYMENT_DELETED,
      timestamp: options.timestamp || new Date(),
      paymentId,
      version: options.version || this.DEFAULT_VERSION,
      source: options.source || this.DEFAULT_SOURCE,
      data: {
        paymentId,
        customerId,
        merchantId
      }
    };
  }

  /**
   * Create an event based on payment status change
   */
  static createEventForStatusChange(
    payment: Payment,
    previousStatus: PaymentStatus | undefined,
    additionalData: Record<string, unknown> = {},
    options: Partial<BaseEventProps> = {}
  ): PaymentEvent | null {
    const changes = { status: payment.status, ...additionalData };

    // Create specific status events based on new status
    switch (payment.status) {
      case PaymentStatus.PROCESSING:
        return this.createPaymentProcessingEvent(payment, options);
      
      case PaymentStatus.COMPLETED:
        const processingTime = this.calculateProcessingTime(payment);
        const transactionId = payment.transactionId || additionalData.transactionId as string || 'TXN-UNKNOWN';
        return this.createPaymentCompletedEvent(
          payment,
          transactionId,
          processingTime,
          options
        );
      
      case PaymentStatus.FAILED:
        const failedProcessingTime = this.calculateProcessingTime(payment);
        return this.createPaymentFailedEvent(
          payment,
          payment.failureReason || 'Unknown error',
          failedProcessingTime,
          options
        );
      
      case PaymentStatus.CANCELLED:
        return this.createPaymentCancelledEvent(
          payment,
          additionalData.reason as string,
          options
        );
      
      case PaymentStatus.REFUNDED:
        return this.createPaymentRefundedEvent(
          payment,
          additionalData.refundAmount as number || payment.amount,
          additionalData.refundReason as string,
          options
        );
      
      default:
        // For other status changes or if status hasn't changed, create updated event
        return this.createPaymentUpdatedEvent(
          payment,
          previousStatus,
          changes,
          options
        );
    }
  }

  /**
   * Calculate processing time for a payment
   */
  private static calculateProcessingTime(payment: Payment): number {
    const startTime = payment.createdAt.getTime();
    const endTime = payment.processedAt?.getTime() || Date.now();
    return endTime - startTime;
  }
}
