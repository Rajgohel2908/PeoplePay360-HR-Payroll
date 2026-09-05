// server/routes/payrunRoutes.js
const express = require('express');
const router = express.Router();
const {
  getPayruns,
  getPayrunById,
  findEligibleEmployees,
  createPayrun,
  triggerCompute,
  validatePayrun,
  resolveValidationIssue,
  approvePayrun,
  markPaid,
  cancelPayrun,
  sendPayslips
} = require('../controllers/payrunController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

// Static routes MUST come before dynamic /:id routes (Express 5 route ordering)
router.get('/', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), getPayruns);
router.post('/eligible-employees', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), findEligibleEmployees);
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), createPayrun);

// Issue resolve — static segment "issues" before dynamic /:id
router.post('/issues/:issue_id/resolve', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), resolveValidationIssue);

// Dynamic payrun by ID
router.get('/:id', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), getPayrunById);
router.post('/:id/compute', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), triggerCompute);
router.post('/:id/validate', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), validatePayrun);
router.post('/:id/approve', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), approvePayrun);
router.post('/:id/pay', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), markPaid);
router.post('/:id/cancel', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), cancelPayrun);
router.post('/:id/send-payslips', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), sendPayslips);

module.exports = router;
