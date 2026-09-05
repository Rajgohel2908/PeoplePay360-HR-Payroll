// server/routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAttendance,
  getTodayAttendance,
  checkIn,
  checkOut,
  correctAttendance
} = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

router.get('/', getAttendance);
router.get('/today', getTodayAttendance);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/correct/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER]), correctAttendance);
router.post('/manual', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER]), correctAttendance);

module.exports = router;
