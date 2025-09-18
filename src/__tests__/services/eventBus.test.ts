import { createEventBus } from '../../services/eventBus';
import { PaymentEventFactory } from '../../utils/eventFactory';
import { 
  IEventBus, 
  PaymentEventType, 
  PaymentStatus, 
  PaymentMethod,
  Payment,
  EventHandler
} from '../../types';

describe('EventBus', () => {
  let eventBus: IEventBus;
  let mockPayment: Payment;

  beforeEach(() => {
    eventBus = createEventBus({
      enableHistory: true,
      maxHistorySize: 100,
      enableLogging: false,
      retryAttempts: 1,
      retryDelayMs: 0
    });

    mockPayment = {
      id: 'test-payment-id',
      amount: 100.00,
      currency: 'USD',
      status: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      merchantId: '987fcdeb-51a2-43d1-b789-123456789abc',
      description: 'Test payment',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  afterEach(() => {
    eventBus.clearHistory();
  });

  describe('event emission', () => {
    it('should emit and store events in history', async () => {
      const createdEvent = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      
      await eventBus.emit(createdEvent);
      
      const emittedEvents = eventBus.getEmittedEvents();
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0]).toEqual(createdEvent);
    });

    it('should emit multiple events and maintain order', async () => {
      const createdEvent = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      const processingEvent = PaymentEventFactory.createPaymentProcessingEvent(mockPayment);
      
      await eventBus.emit(createdEvent);
      await eventBus.emit(processingEvent);
      
      const emittedEvents = eventBus.getEmittedEvents();
      expect(emittedEvents).toHaveLength(2);
      expect(emittedEvents[0]?.eventType).toBe(PaymentEventType.PAYMENT_CREATED);
      expect(emittedEvents[1]?.eventType).toBe(PaymentEventType.PAYMENT_PROCESSING);
    });

    it('should handle event emission without handlers gracefully', async () => {
      const createdEvent = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      
      // Should not throw even with no handlers
      await expect(eventBus.emit(createdEvent)).resolves.toBeUndefined();
      
      const emittedEvents = eventBus.getEmittedEvents();
      expect(emittedEvents).toHaveLength(1);
    });
  });

  describe('event subscription', () => {
    it('should subscribe and receive events', async () => {
      const receivedEvents: any[] = [];
      const handler: EventHandler = async (event) => {
        receivedEvents.push(event);
      };

      const subscriptionId = eventBus.subscribe(PaymentEventType.PAYMENT_CREATED, handler);
      expect(subscriptionId).toBeDefined();

      const createdEvent = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      await eventBus.emit(createdEvent);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toEqual(createdEvent);
    });

    it('should support multiple subscribers for same event', async () => {
      const receivedEvents1: any[] = [];
      const receivedEvents2: any[] = [];
      
      const handler1: EventHandler = async (event) => {
        receivedEvents1.push(event);
      };
      
      const handler2: EventHandler = async (event) => {
        receivedEvents2.push(event);
      };

      eventBus.subscribe(PaymentEventType.PAYMENT_CREATED, handler1);
      eventBus.subscribe(PaymentEventType.PAYMENT_CREATED, handler2);

      const createdEvent = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      await eventBus.emit(createdEvent);

      expect(receivedEvents1).toHaveLength(1);
      expect(receivedEvents2).toHaveLength(1);
      expect(receivedEvents1[0]).toEqual(createdEvent);
      expect(receivedEvents2[0]).toEqual(createdEvent);
    });

    it('should only send events to correct subscribers', async () => {
      const createdEvents: any[] = [];
      const completedEvents: any[] = [];
      
      const createdHandler: EventHandler = async (event) => {
        createdEvents.push(event);
      };
      
      const completedHandler: EventHandler = async (event) => {
        completedEvents.push(event);
      };

      eventBus.subscribe(PaymentEventType.PAYMENT_CREATED, createdHandler);
      eventBus.subscribe(PaymentEventType.PAYMENT_COMPLETED, completedHandler);

      const createdEvent = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      await eventBus.emit(createdEvent);

      expect(createdEvents).toHaveLength(1);
      expect(completedEvents).toHaveLength(0);
    });
  });

  describe('event unsubscription', () => {
    it('should unsubscribe handlers successfully', async () => {
      const receivedEvents: any[] = [];
      const handler: EventHandler = async (event) => {
        receivedEvents.push(event);
      };

      const subscriptionId = eventBus.subscribe(PaymentEventType.PAYMENT_CREATED, handler);
      
      // Emit event - should be received
      const createdEvent1 = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      await eventBus.emit(createdEvent1);
      expect(receivedEvents).toHaveLength(1);

      // Unsubscribe
      const unsubscribed = eventBus.unsubscribe(PaymentEventType.PAYMENT_CREATED, subscriptionId);
      expect(unsubscribed).toBe(true);

      // Emit another event - should not be received
      const createdEvent2 = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      await eventBus.emit(createdEvent2);
      expect(receivedEvents).toHaveLength(1); // Still only 1
    });

    it('should return false for invalid unsubscription', () => {
      const result = eventBus.unsubscribe(PaymentEventType.PAYMENT_CREATED, 'invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('event history management', () => {
    it('should maintain event history', async () => {
      const events = [
        PaymentEventFactory.createPaymentCreatedEvent(mockPayment),
        PaymentEventFactory.createPaymentProcessingEvent(mockPayment),
        PaymentEventFactory.createPaymentCompletedEvent(mockPayment, 'TXN-123', 1000)
      ];

      for (const event of events) {
        await eventBus.emit(event);
      }

      const history = eventBus.getEmittedEvents();
      expect(history).toHaveLength(3);
      expect(history.map(e => e.eventType)).toEqual([
        PaymentEventType.PAYMENT_CREATED,
        PaymentEventType.PAYMENT_PROCESSING,
        PaymentEventType.PAYMENT_COMPLETED
      ]);
    });

    it('should clear event history', async () => {
      const createdEvent = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      await eventBus.emit(createdEvent);
      
      expect(eventBus.getEmittedEvents()).toHaveLength(1);
      
      eventBus.clearHistory();
      
      expect(eventBus.getEmittedEvents()).toHaveLength(0);
    });

    it('should respect max history size limit', async () => {
      const limitedEventBus = createEventBus({
        enableHistory: true,
        maxHistorySize: 2,
        enableLogging: false
      });

      // Emit 3 events
      for (let i = 0; i < 3; i++) {
        const event = PaymentEventFactory.createPaymentCreatedEvent({
          ...mockPayment,
          id: `payment-${i}`
        });
        await limitedEventBus.emit(event);
      }

      const history = limitedEventBus.getEmittedEvents();
      expect(history).toHaveLength(2); // Should only keep the last 2
      expect(history[0]?.paymentId).toBe('payment-1'); // First event should be removed
      expect(history[1]?.paymentId).toBe('payment-2');
    });
  });

  describe('error handling', () => {
    it('should handle handler errors gracefully', async () => {
      // Suppress console.error for this test
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      const receivedEvents: any[] = [];
      const workingHandler: EventHandler = async (event) => {
        receivedEvents.push(event);
      };
      
      const errorHandler: EventHandler = async () => {
        throw new Error('Handler error');
      };

      eventBus.subscribe(PaymentEventType.PAYMENT_CREATED, workingHandler);
      eventBus.subscribe(PaymentEventType.PAYMENT_CREATED, errorHandler);

      const createdEvent = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
      
      // Should not throw despite one handler failing
      await expect(eventBus.emit(createdEvent)).resolves.toBeUndefined();
      
      // Working handler should still receive the event
      expect(receivedEvents).toHaveLength(1);
      
      // Restore console.error
      console.error = originalConsoleError;
    });
  });
});

describe('PaymentEventFactory', () => {
  let mockPayment: Payment;

  beforeEach(() => {
    mockPayment = {
      id: 'test-payment-id',
      amount: 100.00,
      currency: 'USD',
      status: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      merchantId: '987fcdeb-51a2-43d1-b789-123456789abc',
      description: 'Test payment',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  it('should create payment created event', () => {
    const event = PaymentEventFactory.createPaymentCreatedEvent(mockPayment);
    
    expect(event.eventId).toBeDefined();
    expect(event.eventType).toBe(PaymentEventType.PAYMENT_CREATED);
    expect(event.paymentId).toBe(mockPayment.id);
    expect(event.data.payment).toEqual(mockPayment);
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('should create payment completed event', () => {
    const transactionId = 'TXN-123';
    const processingTime = 1500;
    
    const event = PaymentEventFactory.createPaymentCompletedEvent(
      mockPayment, 
      transactionId, 
      processingTime
    );
    
    expect(event.eventType).toBe(PaymentEventType.PAYMENT_COMPLETED);
    expect(event.data.payment).toEqual(mockPayment);
    expect(event.data.transactionId).toBe(transactionId);
    expect(event.data.processingTimeMs).toBe(processingTime);
  });

  it('should create payment failed event', () => {
    const failureReason = 'Insufficient funds';
    const processingTime = 800;
    
    const event = PaymentEventFactory.createPaymentFailedEvent(
      mockPayment, 
      failureReason, 
      processingTime
    );
    
    expect(event.eventType).toBe(PaymentEventType.PAYMENT_FAILED);
    expect(event.data.payment).toEqual(mockPayment);
    expect(event.data.failureReason).toBe(failureReason);
    expect(event.data.processingTimeMs).toBe(processingTime);
  });

  it('should create status change events automatically', () => {
    const completedPayment = { ...mockPayment, status: PaymentStatus.COMPLETED };
    
    const event = PaymentEventFactory.createEventForStatusChange(
      completedPayment,
      PaymentStatus.PENDING,
      { transactionId: 'TXN-123' }
    );
    
    expect(event).toBeDefined();
    expect(event?.eventType).toBe(PaymentEventType.PAYMENT_COMPLETED);
  });
});
