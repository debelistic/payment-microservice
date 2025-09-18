#!/usr/bin/env node

// Demo script to test the Payment Microservice API
const axios = require('axios');

const BASE_URL = 'http://localhost:3667/api/v1';

async function runDemo() {
  console.log('🚀 Payment Microservice Demo');
  console.log('============================\n');

  try {
    // 1. Health Check
    console.log('1. Health Check...');
    const health = await axios.get('http://localhost:3667/health');
    console.log('✅ Health:', health.data.status);
    console.log();

    // 2. Create a payment
    console.log('2. Creating a payment...');
    const paymentData = {
      amount: 99.99,
      currency: 'USD',
      paymentMethod: 'credit_card',
      description: 'Demo payment for testing',
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      merchantId: '987fcdeb-51a2-43d1-b789-123456789abc',
      metadata: {
        orderId: 'DEMO-001',
        customerEmail: 'demo@example.com'
      }
    };

    const createResponse = await axios.post(`${BASE_URL}/payments`, paymentData);
    const paymentId = createResponse.data.data.id;
    console.log('✅ Payment created:', paymentId);
    console.log('   Status:', createResponse.data.data.status);
    console.log('   Amount:', createResponse.data.data.amount, createResponse.data.data.currency);
    console.log();

    // 3. Get the payment
    console.log('3. Retrieving payment...');
    const getResponse = await axios.get(`${BASE_URL}/payments/${paymentId}`);
    console.log('✅ Payment retrieved:', getResponse.data.data.id);
    console.log('   Current status:', getResponse.data.data.status);
    console.log();

    // 4. Update payment status
    console.log('4. Updating payment to processing...');
    const updateResponse = await axios.put(`${BASE_URL}/payments/${paymentId}`, {
      status: 'processing'
    });
    console.log('✅ Payment updated:', updateResponse.data.data.status);
    console.log();

    // 5. Complete the payment
    console.log('5. Completing payment...');
    const completeResponse = await axios.put(`${BASE_URL}/payments/${paymentId}`, {
      status: 'completed',
      transactionId: 'TXN_DEMO_' + Date.now()
    });
    console.log('✅ Payment completed:', completeResponse.data.data.status);
    console.log('   Transaction ID:', completeResponse.data.data.transactionId);
    console.log();

    // 6. Create more payments for stats
    console.log('6. Creating additional payments for statistics...');
    const additionalPayments = [
      { amount: 25.50, currency: 'EUR', paymentMethod: 'debit_card' },
      { amount: 150.00, currency: 'USD', paymentMethod: 'bank_transfer' },
      { amount: 75.25, currency: 'GBP', paymentMethod: 'digital_wallet' }
    ];

    for (const payment of additionalPayments) {
      await axios.post(`${BASE_URL}/payments`, {
        ...payment,
        customerId: '456e7890-e89b-12d3-a456-426614174000',
        merchantId: '987fcdeb-51a2-43d1-b789-123456789abc',
        description: 'Additional demo payment'
      });
    }
    console.log('✅ Created 3 additional payments');
    console.log();

    // 7. Get payment statistics
    console.log('7. Getting payment statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/payments/stats`);
    const stats = statsResponse.data.data;
    console.log('✅ Payment Statistics:');
    console.log('   Total Payments:', stats.totalPayments);
    console.log('   Total Amount:', stats.totalAmount.toFixed(2));
    console.log('   Average Amount:', stats.averageAmount.toFixed(2));
    console.log('   Status Counts:', stats.statusCounts);
    console.log('   Currency Counts:', stats.currencyCounts);
    console.log('   Method Counts:', stats.methodCounts);
    console.log();

    // 8. List payments with pagination
    console.log('8. Listing payments (page 1, limit 2)...');
    const listResponse = await axios.get(`${BASE_URL}/payments?page=1&limit=2`);
    console.log('✅ Retrieved', listResponse.data.data.payments.length, 'payments');
    console.log('   Total:', listResponse.data.data.total);
    console.log('   Has More:', listResponse.data.data.hasMore);
    console.log();

    // 9. Filter payments by currency
    console.log('9. Filtering payments by USD currency...');
    const filterResponse = await axios.get(`${BASE_URL}/payments?currency=USD`);
    console.log('✅ Found', filterResponse.data.data.payments.length, 'USD payments');
    console.log();

    console.log('🎉 Demo completed successfully!');
    console.log('\n📖 API Documentation available at: http://localhost:3667/api-docs');

  } catch (error) {
    console.error('❌ Demo failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get('http://localhost:3667/health');
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('Checking if server is running...');
  const isRunning = await checkServer();
  
  if (!isRunning) {
    console.log('❌ Server is not running. Please start it with: npm run dev');
    console.log('   Then run this demo again with: node demo.js');
    process.exit(1);
  }

  await runDemo();
}

if (require.main === module) {
  main();
}
