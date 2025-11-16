/**
 * Express application setup
 *
 * Configures middleware, routes, and error handling.
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { corsMiddleware } from '@/middleware/cors.middleware';
import { rateLimiter } from '@/middleware/rate-limit.middleware';
import { requestIdMiddleware } from '@/middleware/request-id.middleware';
import { errorHandler } from '@/middleware/error-handler.middleware';
import routes from '@/routes/index';

// Load environment variables
dotenv.config();

const app: Application = express();

// Request ID middleware (first, so it's available in all subsequent middleware)
app.use(requestIdMiddleware);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(corsMiddleware);

// Rate limiting (skip for health check)
app.use((req, res, next) => {
  if (req.path === '/health') {
    next();
  } else {
    rateLimiter()(req, res, next);
  }
});

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    requestId: req.requestId,
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
