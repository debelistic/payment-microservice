import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { PaymentService } from './services/paymentService';
import { PaymentPersistenceService } from './services/persistence';
import { getEventBus } from './services/eventBus';
import { registerDemoEventHandlers } from './services/eventHandlers';
import { createPaymentRoutes } from './routes/paymentRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { swaggerSpec } from './config/swagger';

const app = express();

// Initialize services
const persistenceService = new PaymentPersistenceService({
  dataFile: './data/payments.json',
  enableFilePersistence: process.env.NODE_ENV !== 'test'
});

// Initialize event bus with configuration
const eventBus = getEventBus({
  enableHistory: true,
  maxHistorySize: 1000,
  enableLogging: process.env.NODE_ENV !== 'test',
  retryAttempts: 3,
  retryDelayMs: 1000
});

const paymentService = new PaymentService(persistenceService, eventBus);

// Register demo event handlers to simulate external services
if (process.env.NODE_ENV !== 'test') {
  registerDemoEventHandlers(eventBus);
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/v1/payments', createPaymentRoutes(paymentService));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app, paymentService, persistenceService, eventBus };
