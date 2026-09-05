// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  getSettings,
  updateSetting,
  getAuditLogs,
  globalSearch,
  getDepartments,
  createDepartment,
  updateDepartment,
  getPositions,
  createPosition,
  updatePosition
} = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

// Global search available to authenticated users
router.get('/search', globalSearch);

// Audit logs
router.get('/audit-logs', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), getAuditLogs);

// Users management
router.get('/users', requireRole([ROLES.ADMIN]), getUsers);
router.post('/users', requireRole([ROLES.ADMIN]), createUser);
router.put('/users/:id', requireRole([ROLES.ADMIN]), updateUser);

// Settings
router.get('/settings', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), getSettings);
router.put('/settings', requireRole([ROLES.ADMIN]), updateSetting);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), createDepartment);
router.put('/departments/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), updateDepartment);

// Job Positions
router.get('/positions', getPositions);
router.post('/positions', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), createPosition);
router.put('/positions/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), updatePosition);

module.exports = router;
