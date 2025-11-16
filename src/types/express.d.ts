/**
 * Express type extensions
 */

declare global {
  namespace Express {
    interface Request {
      id?: string;
      /** Unique request ID for tracing and logging */
      requestId?: string;
    }
  }
}

export {};
