// server/tests/api.test.js
const request = require('supertest');
const app = require('../app');
const { runMigrations } = require('../database/migrations');
const { seedDatabase } = require('../database/seeders');

beforeAll(async () => {
  await runMigrations();
  await seedDatabase();
});

describe('PEOPLEPAY360 - Authentication & API RBAC Security', () => {
  test('Health check endpoint returns healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('Demo accounts list is publicly accessible', async () => {
    const res = await request(app).get('/api/auth/demo-accounts');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(5);
  });

  test('Login succeeds with valid credentials and returns JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
  });

  test('Login fails with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Unauthorized requests without token are rejected with 401', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.statusCode).toBe(401);
  });
});
