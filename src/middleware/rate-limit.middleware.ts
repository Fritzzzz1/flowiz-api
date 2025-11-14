/**
 * Rate limiting middleware
 *
 * Prevents abuse by limiting the number of requests per IP address.
 * Default: 100 requests per 15 minutes
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '@/utils/errors';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting
// In production, use Redis for distributed rate limiting
const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 *
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function rateLimiter(options?: {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
}) {
  const windowMs = options?.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
  const maxRequests =
    options?.maxRequests || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
  const skipSuccessfulRequests = options?.skipSuccessfulRequests || false;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Get client identifier (IP address)
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';

    const now = Date.now();
    const record = store[identifier];

    // Initialize or reset if window expired
    if (!record || record.resetTime < now) {
      store[identifier] = {
        count: 1,
        resetTime: now + windowMs,
      };

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      // Optionally skip incrementing on successful requests
      if (skipSuccessfulRequests) {
        res.on('finish', () => {
          if (res.statusCode < 400 && store[identifier]) {
            store[identifier].count--;
          }
        });
      }

      next();
      return;
    }

    // Increment count
    record.count++;

    // Calculate remaining requests
    const remaining = Math.max(0, maxRequests - record.count);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    // Check if limit exceeded
    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);

      next(new RateLimitError('Too many requests. Please try again later.', retryAfter));
      return;
    }

    // Optionally skip incrementing on successful requests
    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400 && store[identifier]) {
          store[identifier].count--;
        }
      });
    }

    next();
  };
}

/**
 * Reset rate limit for a specific identifier (for testing)
 */
export function resetRateLimit(identifier: string): void {
  delete store[identifier];
}

/**
 * Get current rate limit info for an identifier (for testing)
 */
export function getRateLimitInfo(identifier: string): {
  count: number;
  resetTime: number;
} | null {
  return store[identifier] || null;
}
