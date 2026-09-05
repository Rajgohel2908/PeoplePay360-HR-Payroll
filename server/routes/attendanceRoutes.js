// server/routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAttendance,
  checkIn,
  checkOut,
  correctAttendance,
  createManualAttendance
} = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

router.get('/', getAttendance);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/correct/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER]), correctAttendance);
router.post('/manual', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER]), createManualAttendance);

module.exports = router;
