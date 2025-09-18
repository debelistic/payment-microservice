import { Payment, PaymentStatus } from './payment';

/**
 * Base interface for all payment events
 */
export interface BasePaymentEvent {
  eventId: string;
  eventType: PaymentEventType;
  timestamp: Date;
  paymentId: string;
  version: string;
  source: string;
}

/**
 * Payment event types that can be emitted
 */
export enum PaymentEventType {
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_UPDATED = 'payment.updated',
  PAYMENT_PROCESSING = 'payment.processing',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_DELETED = 'payment.deleted'
}

/**
 * Event emitted when a payment is created
 */
export interface PaymentCreatedEvent extends BasePaymentEvent {
  eventType: PaymentEventType.PAYMENT_CREATED;
  data: {
    payment: Payment;
  };
}

/**
 * Event emitted when a payment is updated
 */
export interface PaymentUpdatedEvent extends BasePaymentEvent {
  eventType: PaymentEventType.PAYMENT_UPDATED;
  data: {
    payment: Payment;
    previousStatus?: PaymentStatus;
    changes: Record<string, unknown>;
  };
}

/**
 * Event emitted when payment processing starts
 */
export interface PaymentProcessingEvent extends BasePaymentEvent {
  eventType: PaymentEventType.PAYMENT_PROCESSING;
  data: {
    payment: Payment;
  };
}

/**
 * Event emitted when a payment is completed successfully
 */
export interface PaymentCompletedEvent extends BasePaymentEvent {
  eventType: PaymentEventType.PAYMENT_COMPLETED;
  data: {
    payment: Payment;
    transactionId: string;
    processingTimeMs: number;
  };
}

/**
 * Event emitted when a payment fails
 */
export interface PaymentFailedEvent extends BasePaymentEvent {
  eventType: PaymentEventType.PAYMENT_FAILED;
  data: {
    payment: Payment;
    failureReason: string;
    processingTimeMs: number;
  };
}

/**
 * Event emitted when a payment is cancelled
 */
export interface PaymentCancelledEvent extends BasePaymentEvent {
  eventType: PaymentEventType.PAYMENT_CANCELLED;
  data: {
    payment: Payment;
    reason?: string;
  };
}

/**
 * Event emitted when a payment is refunded
 */
export interface PaymentRefundedEvent extends BasePaymentEvent {
  eventType: PaymentEventType.PAYMENT_REFUNDED;
  data: {
    payment: Payment;
    refundAmount: number;
    refundReason?: string;
  };
}

/**
 * Event emitted when a payment is deleted
 */
export interface PaymentDeletedEvent extends BasePaymentEvent {
  eventType: PaymentEventType.PAYMENT_DELETED;
  data: {
    paymentId: string;
    customerId: string;
    merchantId: string;
  };
}

/**
 * Union type for all payment events
 */
export type PaymentEvent = 
  | PaymentCreatedEvent
  | PaymentUpdatedEvent
  | PaymentProcessingEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | PaymentCancelledEvent
  | PaymentRefundedEvent
  | PaymentDeletedEvent;

/**
 * Event handler function type
 */
export type EventHandler<T extends PaymentEvent = PaymentEvent> = (event: T) => Promise<void> | void;

/**
 * Event bus interface for dependency injection
 */
export interface IEventBus {
  /**
   * Emit an event to all registered handlers
   */
  emit<T extends PaymentEvent>(event: T): Promise<void>;

  /**
   * Subscribe to a specific event type
   */
  subscribe<T extends PaymentEvent>(
    eventType: PaymentEventType,
    handler: EventHandler<T>
  ): string;

  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: PaymentEventType, subscriptionId: string): boolean;

  /**
   * Get all events that have been emitted (for testing/debugging)
   */
  getEmittedEvents(): PaymentEvent[];

  /**
   * Clear all emitted events history (for testing)
   */
  clearHistory(): void;
}

/**
 * Configuration for the event bus
 */
export interface EventBusConfig {
  enableHistory: boolean;
  maxHistorySize: number;
  enableLogging: boolean;
  retryAttempts: number;
  retryDelayMs: number;
}
