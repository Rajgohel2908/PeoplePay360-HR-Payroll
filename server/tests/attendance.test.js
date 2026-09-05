// server/tests/attendance.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../database/connection');
const { runMigrations } = require('../database/migrations');
const { seedDatabase } = require('../database/seeders');

let employeeToken = null;
const today = new Date().toISOString().split('T')[0];

beforeAll(async () => {
  await runMigrations();
  await seedDatabase();

  // Login as employee (employee_id: 8, password: emp123)
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'employee', password: 'emp123' });
  employeeToken = loginRes.body.data.token;

  // Clear any existing attendance for employee 8 on today's date for clean test isolation
  await db('attendance')
    .where('employee_id', 8)
    .where('date', today)
    .del();
});

afterAll(async () => {
  // Clean up test attendance
  await db('attendance')
    .where('employee_id', 8)
    .where('date', today)
    .del();
});

describe('PEOPLEPAY360 - Multi-Session Attendance Check-In & Check-Out Engine', () => {
  test('Initial state: Employee is not checked in today', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCheckedIn).toBe(false);
    expect(res.body.data.hasRecord).toBe(false);
    expect(res.body.data.totalWorkedHours).toBe(0);
    expect(res.body.data.sessions.length).toBe(0);
  });

  test('Session 1 Check-In: Successfully starts first session of the day', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCheckedIn).toBe(true);
    expect(res.body.data.sessions.length).toBe(1);
    expect(res.body.data.sessions[0].out).toBeNull();
  });

  test('Duplicate Check-In: Rejected when an active session is already in progress', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ALREADY_CHECKED_IN');
  });

  test('Session 1 Check-Out: Successfully closes session and records worked hours', async () => {
    // Manually set check_in time to 2 hours ago in DB to simulate 2 hours worked
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toTimeString().slice(0, 5);
    await db('attendance')
      .where('employee_id', 8)
      .where('date', today)
      .update({
        check_in: twoHoursAgo,
        notes: JSON.stringify({
          sessions: [{ in: twoHoursAgo, out: null }],
          userNotes: ''
        })
      });

    const res = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCheckedIn).toBe(false);
    expect(res.body.data.worked_hours).toBeGreaterThanOrEqual(1.8);
    expect(res.body.data.sessions[0].out).not.toBeNull();
  });

  test('Duplicate Check-Out: Rejected when already checked out', async () => {
    const res = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ALREADY_CHECKED_OUT');
  });

  test('Session 2 Check-In (Re-checkin after break/errand): Starts second session on same day', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCheckedIn).toBe(true);
    expect(res.body.data.sessions.length).toBe(2);
    expect(res.body.data.sessions[1].out).toBeNull();
  });

  test('Session 2 Check-Out: Accumulates total worked hours across BOTH sessions into worked_hours', async () => {
    // Simulate session 1: 09:00 to 12:00 (3 hours = 180 mins)
    // Simulate session 2: 13:00 to 17:30 (4.5 hours = 270 mins)
    // Total should be 7.5 hours
    await db('attendance')
      .where('employee_id', 8)
      .where('date', today)
      .update({
        check_in: '09:00',
        check_out: null,
        notes: JSON.stringify({
          sessions: [
            { in: '09:00', out: '12:00' },
            { in: '13:00', out: null }
          ],
          userNotes: ''
        })
      });

    // Mock currentTime or verify checkout closes session 2
    const res = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCheckedIn).toBe(false);
    expect(res.body.data.sessions.length).toBe(2);
    expect(res.body.data.sessions[0].out).toBe('12:00');
    expect(res.body.data.sessions[1].out).toBeDefined();
    // At least 3 hours from session 1 + whatever duration between 13:00 and now
    expect(parseFloat(res.body.data.worked_hours)).toBeGreaterThanOrEqual(3.0);
  });

  test('GET /api/attendance/today returns updated sessions and cumulative worked hours', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hasRecord).toBe(true);
    expect(res.body.data.isCheckedIn).toBe(false);
    expect(res.body.data.sessions.length).toBe(2);
    expect(res.body.data.totalWorkedHours).toBeGreaterThanOrEqual(3.0);
  });
});
