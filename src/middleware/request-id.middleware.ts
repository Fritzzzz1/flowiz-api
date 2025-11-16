/**
 * Request ID Middleware
 *
 * Generates and attaches a unique request ID to each incoming request
 */

import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * Generates a unique request ID
 *
 * @returns Request ID in format: req_<timestamp>_<random>
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `req_${timestamp}_${random}`;
}

/**
 * Request ID middleware
 * Adds a unique request ID to each request and includes it in the response headers
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if request already has an ID (from client or upstream proxy)
  const existingId = req.get('X-Request-ID') || req.get('X-Request-Id');

  // Use existing ID or generate new one
  const requestId = existingId || generateRequestId();

  // Attach to request object
  req.requestId = requestId;

  // Add to response headers for tracking
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Helper to get request ID from request object
 *
 * @param req - Express request object
 * @returns Request ID or undefined if not set
 */
export function getRequestId(req: Request): string | undefined {
  return req.requestId;
}
