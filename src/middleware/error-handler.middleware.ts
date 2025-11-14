/**
 * Error handler middleware
 *
 * Global error handling for Express application.
 * Catches all errors, logs them, and returns consistent error responses.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryAfter?: number;
  };
  metadata: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Map error name to error code
 */
function getErrorCode(error: Error): string {
  const errorCodeMap: Record<string, string> = {
    ValidationError: 'VALIDATION_ERROR',
    ParseError: 'PARSE_ERROR',
    NotFoundError: 'NOT_FOUND',
    UnauthorizedError: 'UNAUTHORIZED',
    ForbiddenError: 'FORBIDDEN',
    ExternalAPIError: 'EXTERNAL_API_ERROR',
    RateLimitError: 'RATE_LIMIT_EXCEEDED',
    InternalError: 'INTERNAL_ERROR',
  };

  return errorCodeMap[error.name] || 'INTERNAL_ERROR';
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Determine if this is an operational error
  const isOperational = err instanceof AppError ? err.isOperational : false;
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const details = err instanceof AppError ? err.details : undefined;

  // Log the error
  if (isOperational) {
    logger.warn('Operational error occurred', {
      error: err.message,
      statusCode,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unexpected error occurred', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Don't leak error details in production for non-operational errors
  const message =
    isOperational || process.env.NODE_ENV !== 'production'
      ? err.message
      : 'An unexpected error occurred';

  // Build error object
  const errorObj: {
    code: string;
    message: string;
    details?: unknown;
    retryAfter?: number;
  } = {
    code: getErrorCode(err),
    message,
  };

  if (details) {
    errorObj.details = details;
  }

  // Add retryAfter for rate limit errors
  if (
    err.name === 'RateLimitError' &&
    details &&
    typeof details === 'object' &&
    'retryAfter' in details
  ) {
    errorObj.retryAfter = (details as { retryAfter: number }).retryAfter;
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: errorObj,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: (req as { id?: string }).id,
    },
  };

  // Send response
  res.status(statusCode).json(errorResponse);
}
