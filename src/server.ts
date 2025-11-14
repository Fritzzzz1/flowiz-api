/**
 * Server entry point
 *
 * Starts the HTTP server and initializes WebSocket connections.
 */

import http from 'http';
import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// WebSocket initialization will be added here
// initializeWebSocket(server);

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔍 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string): void => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});

export default server;
