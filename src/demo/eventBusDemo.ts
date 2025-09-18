#!/usr/bin/env ts-node

/**
 * Event Bus Demonstration Script
 * 
 * This script demonstrates the mock event bus functionality by:
 * 1. Creating a payment service with event bus
 * 2. Registering sample event handlers
 * 3. Creating and processing payments
 * 4. Showing emitted events and handler responses
 */

import { PaymentService } from '../services/paymentService';
import { PaymentPersistenceService } from '../services/persistence';
import { createEventBus } from '../services/eventBus';
import { registerDemoEventHandlers } from '../services/eventHandlers';
import { PaymentMethod, PaymentEventType } from '../types';

async function demonstrateEventBus() {
  console.log('🚀 Event Bus Demonstration Starting...\n');

  // Initialize services
  const persistence = new PaymentPersistenceService({
    dataFile: './demo-data/payments.json',
    enableFilePersistence: false // Use in-memory for demo
  });

  const eventBus = createEventBus({
    enableHistory: true,
    maxHistorySize: 100,
    enableLogging: true,
    retryAttempts: 2,
    retryDelayMs: 500
  });

  const paymentService = new PaymentService(persistence, eventBus);

  // Register demo event handlers to simulate external services
  console.log('📡 Registering demo event handlers (simulating external services)...');
  registerDemoEventHandlers(eventBus);
  console.log('✅ Event handlers registered\n');

  // Create a sample payment
  console.log('💳 Creating a new payment...');
  const paymentRequest = {
    amount: 125.50,
    currency: 'USD',
    paymentMethod: PaymentMethod.CREDIT_CARD,
    description: 'Demo payment for event bus testing',
    customerId: '123e4567-e89b-12d3-a456-426614174000',
    merchantId: '987fcdeb-51a2-43d1-b789-123456789abc',
    metadata: {
      orderId: 'DEMO-ORDER-001',
      source: 'event-bus-demo'
    }
  };

  const payment = await paymentService.createPayment(paymentRequest);
  console.log(`✅ Payment created: ${payment.id}`);
  console.log(`   Amount: $${payment.amount} ${payment.currency}`);
  console.log(`   Status: ${payment.status}\n`);

  // Wait a bit for event processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // Update payment status to processing
  console.log('⚙️  Updating payment status to processing...');
  await paymentService.updatePayment(payment.id, { 
    status: 'processing' as any 
  });
  console.log('✅ Payment status updated to processing\n');

  // Wait a bit for event processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // Complete the payment
  console.log('✅ Completing the payment...');
  await paymentService.updatePayment(payment.id, { 
    status: 'completed' as any,
    transactionId: 'TXN-DEMO-12345'
  });
  console.log('✅ Payment completed successfully\n');

  // Wait a bit for event processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // Show event history
  console.log('📊 Event History Summary:');
  const events = eventBus.getEmittedEvents();
  console.log(`   Total events emitted: ${events.length}`);
  
  events.forEach((event, index) => {
    console.log(`   ${index + 1}. ${event.eventType} (${event.timestamp.toISOString()})`);
  });

  console.log('\n🎯 Event Types Breakdown:');
  const eventTypeCounts = events.reduce((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(eventTypeCounts).forEach(([eventType, count]) => {
    console.log(`   ${eventType}: ${count} events`);
  });

  // Demonstrate custom event subscription
  console.log('\n🔔 Demonstrating custom event subscription...');
  let customEventCount = 0;
  
  const customSubscriptionId = eventBus.subscribe(
    PaymentEventType.PAYMENT_COMPLETED,
    async (event) => {
      customEventCount++;
      console.log(`   🎉 Custom handler received completion event #${customEventCount}!`);
      console.log(`      Payment ID: ${event.paymentId}`);
      if ('data' in event && 'transactionId' in event.data) {
        console.log(`      Transaction ID: ${event.data.transactionId}`);
      }
    }
  );

  // Create another payment to trigger the custom handler
  console.log('\n💳 Creating another payment to demonstrate custom handler...');
  const payment2 = await paymentService.createPayment({
    ...paymentRequest,
    amount: 75.00,
    description: 'Second demo payment',
    metadata: { orderId: 'DEMO-ORDER-002' }
  });

  await paymentService.updatePayment(payment2.id, { 
    status: 'completed' as any,
    transactionId: 'TXN-DEMO-67890'
  });

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // Unsubscribe the custom handler
  console.log('\n🔇 Unsubscribing custom handler...');
  const unsubscribed = eventBus.unsubscribe(PaymentEventType.PAYMENT_COMPLETED, customSubscriptionId);
  console.log(`   Unsubscribed successfully: ${unsubscribed}`);

  // Final statistics
  console.log('\n📈 Final Statistics:');
  const finalEvents = eventBus.getEmittedEvents();
  console.log(`   Total events in history: ${finalEvents.length}`);
  console.log(`   Custom handler triggered: ${customEventCount} times`);

  // Show payment stats
  const stats = await paymentService.getPaymentStats();
  console.log(`   Total payments created: ${stats.totalPayments}`);
  console.log(`   Total amount processed: $${stats.totalAmount}`);
  console.log(`   Completed payments: ${stats.statusCounts.completed || 0}`);

  console.log('\n🎊 Event Bus Demonstration Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('✅ Event emission on payment lifecycle changes');
  console.log('✅ Multiple event handlers processing events concurrently');
  console.log('✅ Event history tracking');
  console.log('✅ Custom event subscription and unsubscription');
  console.log('✅ Graceful error handling in event handlers');
  console.log('✅ External service simulation (analytics, notifications, etc.)');
  console.log('\nThis mock event bus can be replaced with real message brokers like:');
  console.log('• Apache Kafka • RabbitMQ • AWS SQS/SNS • Google Pub/Sub • Azure Service Bus');
}

// Run the demonstration
if (require.main === module) {
  demonstrateEventBus().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

export { demonstrateEventBus };
