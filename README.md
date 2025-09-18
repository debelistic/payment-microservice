# Payment Microservice

A robust Node.js microservice for payment processing simulation built with Express.js, TypeScript, and comprehensive testing. This service demonstrates modern microservice architecture patterns including error handling, validation, logging, and asynchronous processing.

## Features

- 🚀 **RESTful API** with Express.js and TypeScript
- 🔒 **Input Validation** using Joi schemas
- 📊 **Comprehensive Error Handling** with custom error classes
- 📝 **Structured Logging** with Winston
- 💾 **Dual Persistence** (in-memory and file-based JSON)
- ⚡ **Asynchronous Payment Processing** with realistic simulation
- 🧪 **Full Test Coverage** with Jest and Supertest
- 📖 **API Documentation** with Swagger/OpenAPI
- 🛡️ **Security Middleware** with Helmet and CORS
- 🔄 **Graceful Shutdown** handling

## Architecture

```
src/
├── types/           # TypeScript interfaces and types
├── services/        # Business logic and persistence
├── routes/          # Express route handlers
├── middleware/      # Custom middleware (validation, error handling)
├── utils/           # Utility functions (validation, logging)
├── config/          # Configuration files (Swagger)
├── __tests__/       # Test files
└── data/           # JSON persistence files
```

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Validation**: Joi
- **Testing**: Jest + Supertest
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd payment-microservice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3000`

### Development

For development with hot reloading:

```bash
npm run dev
```

### Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Interactive Documentation
Visit `http://localhost:3000/api-docs` for the interactive Swagger UI documentation.

### Health Check
```
GET /health
```

## API Endpoints

### Payments

#### Create Payment
```http
POST /api/v1/payments
Content-Type: application/json

{
  "amount": 99.99,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "description": "Payment for services",
  "customerId": "123e4567-e89b-12d3-a456-426614174000",
  "merchantId": "987fcdeb-51a2-43d1-b789-123456789abc",
  "metadata": {
    "orderId": "ORD-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "amount": 99.99,
    "currency": "USD",
    "status": "pending",
    "paymentMethod": "credit_card",
    "description": "Payment for services",
    "customerId": "123e4567-e89b-12d3-a456-426614174000",
    "merchantId": "987fcdeb-51a2-43d1-b789-123456789abc",
    "metadata": {
      "orderId": "ORD-123"
    },
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Get Payment by ID
```http
GET /api/v1/payments/{id}
```

#### Get Payments (with filters and pagination)
```http
GET /api/v1/payments?page=1&limit=10&status=pending&currency=USD&customerId=123e4567-e89b-12d3-a456-426614174000
```

#### Update Payment
```http
PUT /api/v1/payments/{id}
Content-Type: application/json

{
  "status": "processing",
  "transactionId": "TXN-123456"
}
```

#### Partial Update Payment
```http
PATCH /api/v1/payments/{id}
Content-Type: application/json

{
  "status": "completed"
}
```

#### Delete Payment
```http
DELETE /api/v1/payments/{id}
```

#### Get Payment Statistics
```http
GET /api/v1/payments/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPayments": 150,
    "totalAmount": 25000.50,
    "averageAmount": 166.67,
    "statusCounts": {
      "pending": 10,
      "processing": 5,
      "completed": 120,
      "failed": 10,
      "cancelled": 3,
      "refunded": 2
    },
    "currencyCounts": {
      "USD": 100,
      "EUR": 30,
      "GBP": 20
    },
    "methodCounts": {
      "credit_card": 80,
      "debit_card": 40,
      "bank_transfer": 20,
      "digital_wallet": 8,
      "cryptocurrency": 2
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Payment Processing Simulation

The service simulates realistic payment processing with:

- **Asynchronous Processing**: Payments are processed in the background
- **Status Transitions**: Enforced state machine for payment status changes
- **Failure Simulation**: 15% failure rate with various failure scenarios
- **Processing Delays**: 1-4 second random delays to simulate real processing
- **Business Rules**: Amount limits, currency validation, duplicate detection

### Payment Status Flow

```
pending → processing → completed
   ↓           ↓           ↓
cancelled   failed    refunded
```

### Supported Payment Methods

- `credit_card`
- `debit_card`
- `bank_transfer`
- `digital_wallet`
- `cryptocurrency`

### Supported Currencies

- USD, EUR, GBP, JPY, CAD, AUD

## Error Handling

The service provides comprehensive error handling with standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed: [details]",
    "details": {
      "field": "amount",
      "message": "Amount must be a positive number"
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Codes

- `VALIDATION_ERROR` (400): Input validation failed
- `PAYMENT_NOT_FOUND` (404): Payment with given ID not found
- `INVALID_STATUS_TRANSITION` (400): Invalid payment status change
- `PAYMENT_PROCESSING_ERROR` (422): Payment processing failed
- `INSUFFICIENT_FUNDS` (422): Insufficient funds for payment
- `DUPLICATE_PAYMENT` (409): Payment with same transaction ID exists
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `NODE_ENV` | development | Environment |
| `LOG_LEVEL` | info | Logging level |
| `API_BASE_URL` | http://localhost:3000 | Base URL for API docs |
| `CORS_ORIGIN` | * | CORS origin |

### Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output (in development)

## Testing

### Test Structure

```
src/__tests__/
├── setup.ts                    # Test configuration
├── services/
│   └── paymentService.test.ts  # Service layer tests
└── routes/
    └── paymentRoutes.test.ts   # API endpoint tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test paymentService.test.ts
```

### Test Coverage

The test suite covers:
- ✅ Payment creation and validation
- ✅ Payment retrieval and filtering
- ✅ Payment updates and status transitions
- ✅ Payment deletion rules
- ✅ Error handling and edge cases
- ✅ API endpoint integration tests
- ✅ Business logic validation

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start the production server |
| `npm run dev` | Start development server with hot reload |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors automatically |

## Data Persistence

The service supports two persistence modes:

### In-Memory (Default for Testing)
- Fast and ephemeral
- Data lost on restart
- Used automatically in test environment

### File-Based JSON
- Persistent across restarts
- Data stored in `./data/payments.json`
- Automatic backup and recovery

## Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Joi schema validation
- **Error Sanitization**: Safe error responses
- **Rate Limiting**: Built-in Express rate limiting

## Performance Considerations

- **Async Processing**: Non-blocking payment processing
- **Pagination**: Efficient data retrieval
- **Logging**: Structured logging with rotation
- **Memory Management**: Efficient in-memory storage
- **Error Recovery**: Graceful error handling

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the repository
---

**Built with ❤️ using Node.js, Express, and TypeScript**
