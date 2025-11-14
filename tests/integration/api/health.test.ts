/**
 * Health endpoint integration tests
 */

import request from 'supertest';
import app from '../../../src/app';

describe('GET /health', () => {
  it('should return 200 and health status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('version');
  });

  it('should return valid timestamp format', async () => {
    const response = await request(app).get('/health');

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it('should return positive uptime', async () => {
    const response = await request(app).get('/health');

    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });
});
