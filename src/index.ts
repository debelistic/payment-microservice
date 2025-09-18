import { app } from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3667', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Graceful shutdown handling
const gracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  process.exit(0);
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, HOST, () => {
  logger.info(`Payment Microservice started on ${HOST}:${PORT}`);
  logger.info(`API Documentation available at http://${HOST}:${PORT}/api-docs`);
  logger.info(`Health check available at http://${HOST}:${PORT}/health`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error('Server error:', error);
  }
  process.exit(1);
});

export default server;
