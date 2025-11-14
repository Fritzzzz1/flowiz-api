/**
 * API routes integration tests
 */

import request from 'supertest';
import app from '../../../src/app';

describe('API Routes', () => {
  describe('GET /api/v1', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api/v1').expect(200);

      expect(response.body).toHaveProperty('name', 'FloWiz API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('parse');
      expect(response.body.endpoints).toHaveProperty('analysis');
      expect(response.body.endpoints).toHaveProperty('github');
      expect(response.body.endpoints).toHaveProperty('gitlab');
    });
  });

  describe('Rate Limiting', () => {
    it('should set rate limit headers', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should not rate limit health check', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).not.toHaveProperty('x-ratelimit-limit');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent').expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message', 'Route not found');
    });

    it('should include metadata in error responses', async () => {
      const response = await request(app).get('/api/v1/nonexistent').expect(404);

      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
    });
  });

  describe('CORS', () => {
    it('should set CORS headers', async () => {
      const response = await request(app)
        .get('/api/v1')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Security Headers', () => {
    it('should set security headers from helmet', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});
