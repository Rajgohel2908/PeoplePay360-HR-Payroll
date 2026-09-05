// server/routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployeeById,
  getEmployee360,
  getEmployeeMeta,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employeeController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requireSelfOrHR } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

// Static routes before dynamic
router.get('/meta', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), getEmployeeMeta);
router.get('/', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), getEmployees);
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), createEmployee);

// 360 view (before /:id so "360" isn't captured as ID)
router.get('/360/:id', requireSelfOrHR('id'), getEmployee360);

// Dynamic employee ID routes
router.get('/:id', requireSelfOrHR('id'), getEmployeeById);
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER]), updateEmployee);
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), deleteEmployee);

module.exports = router;
