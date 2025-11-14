/**
 * Custom error classes for the application
 *
 * Provides consistent error handling with proper status codes
 * and operational error tracking.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, isOperational = true, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, true, details);
    this.name = 'ValidationError';
  }
}

export class ParseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, true, details);
    this.name = 'ParseError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, true);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message, true);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message, true);
    this.name = 'ForbiddenError';
  }
}

export class ExternalAPIError extends AppError {
  constructor(message: string, details?: unknown) {
    super(502, message, true, details);
    this.name = 'ExternalAPIError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfter?: number) {
    super(429, message, true, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class InternalError extends AppError {
  constructor(message: string, details?: unknown) {
    super(500, message, false, details);
    this.name = 'InternalError';
  }
}
