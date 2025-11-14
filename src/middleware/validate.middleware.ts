/**
 * Validation middleware
 *
 * Validates request body, query parameters, and route params
 * using Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@/utils/errors';

type ValidationType = 'body' | 'query' | 'params';

interface ValidationDetails {
  field: string;
  issue: string;
}

/**
 * Create validation middleware for a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param type - What to validate (body, query, or params)
 * @returns Express middleware function
 */
export function validate(schema: ZodSchema, type: ValidationType = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[type];
      const validated = schema.parse(data);

      // Replace the request data with validated data
      req[type] = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a user-friendly format
        const zodError = error as ZodError<unknown>;
        const details: ValidationDetails[] = zodError.issues.map((err) => ({
          field: err.path.join('.'),
          issue: err.message,
        }));

        const message = `Validation failed: ${details.map((d) => `${d.field} - ${d.issue}`).join(', ')}`;

        next(new ValidationError(message, details));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate multiple parts of the request
 *
 * @param schemas - Object with schemas for body, query, and/or params
 * @returns Express middleware function
 */
export function validateMultiple(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validators: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    if (schemas.body) {
      validators.push(validate(schemas.body, 'body'));
    }
    if (schemas.query) {
      validators.push(validate(schemas.query, 'query'));
    }
    if (schemas.params) {
      validators.push(validate(schemas.params, 'params'));
    }

    // Execute validators sequentially
    let index = 0;
    const executeNext = (): void => {
      if (index >= validators.length) {
        next();
        return;
      }

      const validator = validators[index++];
      validator(req, res, (err?: unknown) => {
        if (err) {
          next(err);
        } else {
          executeNext();
        }
      });
    };

    executeNext();
  };
}
