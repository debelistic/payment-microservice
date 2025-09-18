import { v4 as uuidv4 } from 'uuid';
import {
  IEventBus,
  PaymentEvent,
  PaymentEventType,
  EventHandler,
  EventBusConfig
} from '../types/events';

/**
 * Mock implementation of an event bus for simulating message publishing
 * In a real system, this would integrate with actual message brokers like:
 * - Apache Kafka
 * - RabbitMQ
 * - AWS SQS/SNS
 * - Google Pub/Sub
 * - Azure Service Bus
 */
export class MockEventBus implements IEventBus {
  private handlers: Map<PaymentEventType, Map<string, EventHandler>> = new Map();
  private eventHistory: PaymentEvent[] = [];
  private config: EventBusConfig;

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = {
      enableHistory: true,
      maxHistorySize: 1000,
      enableLogging: true,
      retryAttempts: 3,
      retryDelayMs: 1000,
      ...config
    };

    // Initialize handler maps for all event types
    Object.values(PaymentEventType).forEach(eventType => {
      this.handlers.set(eventType, new Map());
    });
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit<T extends PaymentEvent>(event: T): Promise<void> {
    if (this.config.enableLogging) {
      console.log(`[EventBus] Emitting event: ${event.eventType} for payment ${event.paymentId}`);
    }

    // Store event in history
    if (this.config.enableHistory) {
      this.eventHistory.push(event);
      
      // Maintain history size limit
      if (this.eventHistory.length > this.config.maxHistorySize) {
        this.eventHistory.shift();
      }
    }

    // Get handlers for this event type
    const eventHandlers = this.handlers.get(event.eventType);
    if (!eventHandlers || eventHandlers.size === 0) {
      if (this.config.enableLogging) {
        console.log(`[EventBus] No handlers registered for event type: ${event.eventType}`);
      }
      return;
    }

    // Execute all handlers concurrently with retry logic
    const handlerPromises = Array.from(eventHandlers.entries()).map(([subscriptionId, handler]) =>
      this.executeHandlerWithRetry(handler, event, subscriptionId)
    );

    try {
      await Promise.allSettled(handlerPromises);
    } catch (error) {
      console.error(`[EventBus] Error executing handlers for event ${event.eventType}:`, error);
    }

    // Simulate external service notifications
    await this.simulateExternalNotifications(event);
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe<T extends PaymentEvent>(
    eventType: PaymentEventType,
    handler: EventHandler<T>
  ): string {
    const subscriptionId = uuidv4();
    const eventHandlers = this.handlers.get(eventType);
    
    if (eventHandlers) {
      eventHandlers.set(subscriptionId, handler as EventHandler);
      
      if (this.config.enableLogging) {
        console.log(`[EventBus] Subscribed to ${eventType} with ID: ${subscriptionId}`);
      }
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: PaymentEventType, subscriptionId: string): boolean {
    const eventHandlers = this.handlers.get(eventType);
    
    if (eventHandlers && eventHandlers.has(subscriptionId)) {
      eventHandlers.delete(subscriptionId);
      
      if (this.config.enableLogging) {
        console.log(`[EventBus] Unsubscribed from ${eventType} with ID: ${subscriptionId}`);
      }
      
      return true;
    }

    return false;
  }

  /**
   * Get all events that have been emitted (for testing/debugging)
   */
  getEmittedEvents(): PaymentEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear all emitted events history (for testing)
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get subscription count for an event type
   */
  getSubscriptionCount(eventType: PaymentEventType): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }

  /**
   * Get total number of events emitted
   */
  getTotalEventsEmitted(): number {
    return this.eventHistory.length;
  }

  /**
   * Execute handler with retry logic
   */
  private async executeHandlerWithRetry(
    handler: EventHandler,
    event: PaymentEvent,
    subscriptionId: string
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await handler(event);
        return; // Success, no need to retry
      } catch (error) {
        lastError = error as Error;
        
        if (this.config.enableLogging) {
          console.warn(
            `[EventBus] Handler ${subscriptionId} failed (attempt ${attempt}/${this.config.retryAttempts}):`,
            error
          );
        }

        // Don't wait after the last attempt
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }

    // All retries failed
    console.error(
      `[EventBus] Handler ${subscriptionId} failed after ${this.config.retryAttempts} attempts:`,
      lastError
    );
  }

  /**
   * Simulate notifications to external services
   */
  private async simulateExternalNotifications(event: PaymentEvent): Promise<void> {
    // Simulate different external service integrations based on event type
    const notifications: string[] = [];

    switch (event.eventType) {
      case PaymentEventType.PAYMENT_CREATED:
        notifications.push('fraud-detection-service', 'analytics-service');
        break;
      case PaymentEventType.PAYMENT_COMPLETED:
        notifications.push('accounting-service', 'notification-service', 'analytics-service');
        break;
      case PaymentEventType.PAYMENT_FAILED:
        notifications.push('notification-service', 'analytics-service', 'monitoring-service');
        break;
      case PaymentEventType.PAYMENT_REFUNDED:
        notifications.push('accounting-service', 'notification-service');
        break;
      default:
        notifications.push('analytics-service');
    }

    // Simulate async notifications to external services
    const notificationPromises = notifications.map(service =>
      this.simulateServiceNotification(service, event)
    );

    await Promise.allSettled(notificationPromises);
  }

  /**
   * Simulate notification to a specific external service
   */
  private async simulateServiceNotification(
    serviceName: string,
    event: PaymentEvent
  ): Promise<void> {
    // Simulate network delay
    const delay = Math.random() * 200 + 50; // 50-250ms
    await this.delay(delay);

    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error(`Failed to notify ${serviceName}`);
    }

    if (this.config.enableLogging) {
      console.log(`[EventBus] Notified ${serviceName} about ${event.eventType}`);
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a configured event bus instance
 */
export function createEventBus(config: Partial<EventBusConfig> = {}): IEventBus {
  return new MockEventBus(config);
}

/**
 * Singleton event bus instance for the application
 */
let eventBusInstance: IEventBus | null = null;

/**
 * Get or create the singleton event bus instance
 */
export function getEventBus(config: Partial<EventBusConfig> = {}): IEventBus {
  if (!eventBusInstance) {
    eventBusInstance = createEventBus(config);
  }
  return eventBusInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetEventBus(): void {
  eventBusInstance = null;
}
