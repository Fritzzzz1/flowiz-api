/**
 * Error handler middleware tests
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../src/middleware/error-handler.middleware';
import {
  ValidationError,
  ParseError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
  InternalError,
} from '../../../src/utils/errors';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });

    mockRequest = {
      path: '/test',
      method: 'GET',
      id: 'test-request-id',
    };

    mockResponse = {
      status: statusSpy,
    };

    mockNext = jest.fn();
  });

  it('should handle ValidationError with 400 status', () => {
    const error = new ValidationError('Invalid input', [
      { field: 'email', issue: 'Invalid email format' },
    ]);

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: [{ field: 'email', issue: 'Invalid email format' }],
        }),
      })
    );
  });

  it('should handle ParseError with 400 status', () => {
    const error = new ParseError('YAML parsing failed');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'PARSE_ERROR',
          message: 'YAML parsing failed',
        }),
      })
    );
  });

  it('should handle NotFoundError with 404 status', () => {
    const error = new NotFoundError('Resource not found');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Resource not found',
        }),
      })
    );
  });

  it('should handle UnauthorizedError with 401 status', () => {
    const error = new UnauthorizedError('Authentication required');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledWith(401);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        }),
      })
    );
  });

  it('should handle RateLimitError with 429 status and retryAfter', () => {
    const error = new RateLimitError('Too many requests', 300);

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledWith(429);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: 300,
        }),
      })
    );
  });

  it('should handle InternalError with 500 status', () => {
    const error = new InternalError('Something went wrong');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        }),
      })
    );
  });

  it('should handle generic Error with 500 status', () => {
    const error = new Error('Unexpected error');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
        }),
      })
    );
  });

  it('should include request ID in metadata', () => {
    const error = new ValidationError('Test error');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          requestId: 'test-request-id',
        }),
      })
    );
  });

  it('should include timestamp in metadata', () => {
    const error = new ValidationError('Test error');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      })
    );
  });
});
