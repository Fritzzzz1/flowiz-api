/**
 * Validation middleware tests
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateMultiple } from '../../../src/middleware/validate.middleware';
import { ValidationError } from '../../../src/utils/errors';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validate()', () => {
    it('should validate valid request body', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = { name: 'John', age: 30 };

      const middleware = validate(schema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'John', age: 30 });
    });

    it('should call next with ValidationError for invalid body', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = { name: 'John', age: 'thirty' };

      const middleware = validate(schema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('Validation failed');
    });

    it('should validate query parameters', () => {
      const schema = z.object({
        page: z.string(),
        limit: z.string(),
      });

      mockRequest.query = { page: '1', limit: '10' };

      const middleware = validate(schema, 'query');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ page: '1', limit: '10' });
    });

    it('should validate route params', () => {
      const schema = z.object({
        id: z.string(),
      });

      mockRequest.params = { id: '123' };

      const middleware = validate(schema, 'params');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.params).toEqual({ id: '123' });
    });

    it('should provide detailed error messages', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      mockRequest.body = { email: 'invalid-email', password: 'short' };

      const middleware = validate(schema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as ValidationError;
      expect(error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'password' }),
        ])
      );
    });

    it('should handle nested validation errors', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });

      mockRequest.body = { user: { name: 'John', email: 'invalid' } };

      const middleware = validate(schema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as ValidationError;
      expect(error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'user.email' })])
      );
    });
  });

  describe('validateMultiple()', () => {
    it('should validate multiple request parts', () => {
      const schemas = {
        body: z.object({ name: z.string() }),
        query: z.object({ page: z.string() }),
        params: z.object({ id: z.string() }),
      };

      mockRequest.body = { name: 'John' };
      mockRequest.query = { page: '1' };
      mockRequest.params = { id: '123' };

      const middleware = validateMultiple(schemas);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail on first validation error', () => {
      const schemas = {
        body: z.object({ name: z.string() }),
        query: z.object({ page: z.number() }),
      };

      mockRequest.body = { name: 'John' };
      mockRequest.query = { page: 'invalid' };

      const middleware = validateMultiple(schemas);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate only specified parts', () => {
      const schemas = {
        body: z.object({ name: z.string() }),
      };

      mockRequest.body = { name: 'John' };
      mockRequest.query = { invalid: 'data' }; // Not validated

      const middleware = validateMultiple(schemas);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
