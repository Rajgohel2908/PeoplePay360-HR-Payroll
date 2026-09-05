// server/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const {
  getPayrollSummaryReport,
  getDepartmentPayrollReport,
  getAttendanceReport,
  getLeaveReport,
  getContractExpiryReport
} = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);
router.use(requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER, ROLES.HR_MANAGER]));

router.get('/payroll-summary', getPayrollSummaryReport);
router.get('/department-cost', getDepartmentPayrollReport);
router.get('/attendance', getAttendanceReport);
router.get('/leave', getLeaveReport);
router.get('/contracts-expiry', getContractExpiryReport);

module.exports = router;
