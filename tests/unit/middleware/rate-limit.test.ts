/**
 * Rate limiting middleware tests
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimiter, resetRateLimit } from '../../../src/middleware/rate-limit.middleware';
import { RateLimitError } from '../../../src/utils/errors';

describe('Rate Limiting Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;
  let setHeaderSpy: jest.Mock;

  beforeEach(() => {
    setHeaderSpy = jest.fn();

    mockRequest = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
    };

    mockResponse = {
      setHeader: setHeaderSpy,
      on: jest.fn(),
    };

    mockNext = jest.fn();

    // Reset rate limit for test IP
    resetRateLimit('127.0.0.1');
  });

  afterEach(() => {
    resetRateLimit('127.0.0.1');
  });

  it('should allow first request', () => {
    const middleware = rateLimiter({ windowMs: 60000, maxRequests: 5 });
    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
  });

  it('should track multiple requests', () => {
    const middleware = rateLimiter({ windowMs: 60000, maxRequests: 5 });

    // First request
    middleware(mockRequest as Request, mockResponse as Response, mockNext);
    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);

    // Second request
    mockNext.mockClear();
    setHeaderSpy.mockClear();
    middleware(mockRequest as Request, mockResponse as Response, mockNext);
    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 3);

    // Third request
    mockNext.mockClear();
    setHeaderSpy.mockClear();
    middleware(mockRequest as Request, mockResponse as Response, mockNext);
    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);
  });

  it('should block requests after limit exceeded', () => {
    const middleware = rateLimiter({ windowMs: 60000, maxRequests: 3 });

    // Make 3 allowed requests
    for (let i = 0; i < 3; i++) {
      mockNext.mockClear();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    }

    // 4th request should be blocked
    mockNext.mockClear();
    setHeaderSpy.mockClear();
    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(RateLimitError));
    expect(setHeaderSpy).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('should set rate limit headers', () => {
    const middleware = rateLimiter({ windowMs: 60000, maxRequests: 10 });
    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
  });

  it('should use environment variables for defaults', () => {
    const originalWindowMs = process.env.RATE_LIMIT_WINDOW_MS;
    const originalMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS;

    process.env.RATE_LIMIT_WINDOW_MS = '30000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '5';

    const middleware = rateLimiter();
    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', 5);

    // Restore environment variables
    process.env.RATE_LIMIT_WINDOW_MS = originalWindowMs;
    process.env.RATE_LIMIT_MAX_REQUESTS = originalMaxRequests;
  });

  it('should handle different IP addresses separately', () => {
    const middleware = rateLimiter({ windowMs: 60000, maxRequests: 2 });

    // IP 1: Make 2 requests
    const mockRequest1: Partial<Request> = {
      ip: '192.168.1.1',
      socket: { remoteAddress: '192.168.1.1' } as any,
    };
    middleware(mockRequest1 as Request, mockResponse as Response, mockNext);
    middleware(mockRequest1 as Request, mockResponse as Response, mockNext);

    // IP 2: Should have full quota
    const mockRequest2: Partial<Request> = {
      ip: '192.168.1.2',
      socket: { remoteAddress: '192.168.1.2' } as any,
    };
    mockNext.mockClear();
    setHeaderSpy.mockClear();
    middleware(mockRequest2 as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);

    // Clean up
    resetRateLimit('192.168.1.1');
    resetRateLimit('192.168.1.2');
  });

  it('should reset after window expires', () => {
    jest.useFakeTimers();

    const middleware = rateLimiter({ windowMs: 1000, maxRequests: 2 });

    // Make 2 requests
    middleware(mockRequest as Request, mockResponse as Response, mockNext);
    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    // 3rd request should be blocked
    mockNext.mockClear();
    middleware(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(RateLimitError));

    // Fast forward past window
    jest.advanceTimersByTime(1100);

    // Should allow new requests
    mockNext.mockClear();
    middleware(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith();

    jest.useRealTimers();
  });
});
