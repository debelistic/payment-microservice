import {
  PaymentEvent,
  PaymentEventType,
  PaymentCreatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
  EventHandler,
  IEventBus
} from '../types';
import { logger } from '../utils/logger';

/**
 * Sample event handlers that demonstrate how external services
 * would consume payment events from the event bus
 */

/**
 * Analytics service event handler
 * Tracks payment metrics and statistics
 */
export const analyticsServiceHandler: EventHandler = async (event: PaymentEvent) => {
  logger.info(`[AnalyticsService] Processing event: ${event.eventType} for payment ${event.paymentId}`);
  
  // Simulate analytics processing
  switch (event.eventType) {
    case PaymentEventType.PAYMENT_CREATED:
      const createdEvent = event as PaymentCreatedEvent;
      logger.info(`[AnalyticsService] New payment created: $${createdEvent.data.payment.amount} ${createdEvent.data.payment.currency}`);
      break;
      
    case PaymentEventType.PAYMENT_COMPLETED:
      const completedEvent = event as PaymentCompletedEvent;
      logger.info(`[AnalyticsService] Payment completed in ${completedEvent.data.processingTimeMs}ms`);
      break;
      
    case PaymentEventType.PAYMENT_FAILED:
      const failedEvent = event as PaymentFailedEvent;
      logger.warn(`[AnalyticsService] Payment failed: ${failedEvent.data.failureReason}`);
      break;
      
    default:
      logger.info(`[AnalyticsService] Tracking event: ${event.eventType}`);
  }
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
};

/**
 * Notification service event handler
 * Sends notifications to customers and merchants
 */
export const notificationServiceHandler: EventHandler = async (event: PaymentEvent) => {
  logger.info(`[NotificationService] Processing event: ${event.eventType} for payment ${event.paymentId}`);
  
  switch (event.eventType) {
    case PaymentEventType.PAYMENT_COMPLETED:
      const completedEvent = event as PaymentCompletedEvent;
      logger.info(`[NotificationService] Sending success notification to customer ${completedEvent.data.payment.customerId}`);
      break;
      
    case PaymentEventType.PAYMENT_FAILED:
      const failedEvent = event as PaymentFailedEvent;
      logger.info(`[NotificationService] Sending failure notification to customer ${failedEvent.data.payment.customerId}`);
      break;
      
    case PaymentEventType.PAYMENT_REFUNDED:
      const refundedEvent = event as PaymentRefundedEvent;
      logger.info(`[NotificationService] Sending refund notification: $${refundedEvent.data.refundAmount}`);
      break;
      
    default:
      // Don't send notifications for other event types
      return;
  }
  
  // Simulate notification sending delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
};

/**
 * Accounting service event handler
 * Updates financial records and reconciliation
 */
export const accountingServiceHandler: EventHandler = async (event: PaymentEvent) => {
  logger.info(`[AccountingService] Processing event: ${event.eventType} for payment ${event.paymentId}`);
  
  switch (event.eventType) {
    case PaymentEventType.PAYMENT_COMPLETED:
      const completedEvent = event as PaymentCompletedEvent;
      logger.info(`[AccountingService] Recording revenue: $${completedEvent.data.payment.amount} ${completedEvent.data.payment.currency}`);
      break;
      
    case PaymentEventType.PAYMENT_REFUNDED:
      const refundedEvent = event as PaymentRefundedEvent;
      logger.info(`[AccountingService] Recording refund: $${refundedEvent.data.refundAmount}`);
      break;
      
    default:
      // Only process completed and refunded payments
      return;
  }
  
  // Simulate accounting processing delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
};

/**
 * Fraud detection service event handler
 * Analyzes payments for potential fraud
 */
export const fraudDetectionHandler: EventHandler = async (event: PaymentEvent) => {
  if (event.eventType !== PaymentEventType.PAYMENT_CREATED) {
    return; // Only analyze new payments
  }
  
  const createdEvent = event as PaymentCreatedEvent;
  const payment = createdEvent.data.payment;
  
  logger.info(`[FraudDetection] Analyzing payment ${payment.id} for fraud indicators`);
  
  // Simulate fraud analysis
  const riskScore = Math.random() * 100;
  const isHighRisk = riskScore > 80;
  
  if (isHighRisk) {
    logger.warn(`[FraudDetection] HIGH RISK payment detected: ${payment.id} (score: ${riskScore.toFixed(2)})`);
    // In a real system, this might trigger additional verification or block the payment
  } else {
    logger.info(`[FraudDetection] Payment ${payment.id} passed fraud check (score: ${riskScore.toFixed(2)})`);
  }
  
  // Simulate analysis delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 300));
};

/**
 * Monitoring service event handler
 * Tracks system health and performance metrics
 */
export const monitoringServiceHandler: EventHandler = async (event: PaymentEvent) => {
  logger.info(`[MonitoringService] Recording metric for event: ${event.eventType}`);
  
  // Simulate different monitoring actions based on event type
  switch (event.eventType) {
    case PaymentEventType.PAYMENT_FAILED:
      const failedEvent = event as PaymentFailedEvent;
      logger.warn(`[MonitoringService] ALERT: Payment failure rate may be increasing`);
      logger.info(`[MonitoringService] Failure reason: ${failedEvent.data.failureReason}`);
      break;
      
    case PaymentEventType.PAYMENT_COMPLETED:
      const completedEvent = event as PaymentCompletedEvent;
      if (completedEvent.data.processingTimeMs > 5000) {
        logger.warn(`[MonitoringService] ALERT: Slow payment processing detected: ${completedEvent.data.processingTimeMs}ms`);
      }
      break;
      
    default:
      logger.info(`[MonitoringService] Event recorded: ${event.eventType}`);
  }
  
  // Simulate metric recording delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
};

/**
 * Register all demo event handlers with the event bus
 */
export function registerDemoEventHandlers(eventBus: IEventBus): void {
  logger.info('[EventHandlers] Registering demo event handlers...');
  
  // Register analytics handler for all events
  Object.values(PaymentEventType).forEach(eventType => {
    eventBus.subscribe(eventType, analyticsServiceHandler);
  });
  
  // Register notification handler for relevant events
  eventBus.subscribe(PaymentEventType.PAYMENT_COMPLETED, notificationServiceHandler);
  eventBus.subscribe(PaymentEventType.PAYMENT_FAILED, notificationServiceHandler);
  eventBus.subscribe(PaymentEventType.PAYMENT_REFUNDED, notificationServiceHandler);
  
  // Register accounting handler for financial events
  eventBus.subscribe(PaymentEventType.PAYMENT_COMPLETED, accountingServiceHandler);
  eventBus.subscribe(PaymentEventType.PAYMENT_REFUNDED, accountingServiceHandler);
  
  // Register fraud detection for new payments
  eventBus.subscribe(PaymentEventType.PAYMENT_CREATED, fraudDetectionHandler);
  
  // Register monitoring for all events
  Object.values(PaymentEventType).forEach(eventType => {
    eventBus.subscribe(eventType, monitoringServiceHandler);
  });
  
  logger.info('[EventHandlers] Demo event handlers registered successfully');
}
