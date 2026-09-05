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
  markPaid
} = require('../controllers/payrunController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

router.get('/', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), getPayruns);
router.get('/:id', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), getPayrunById);
router.post('/eligible-employees', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), findEligibleEmployees);
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), createPayrun);
router.post('/:id/compute', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), triggerCompute);
router.post('/:id/validate', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), validatePayrun);
router.post('/issues/:issue_id/resolve', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), resolveValidationIssue);
router.post('/:id/approve', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), approvePayrun);
router.post('/:id/pay', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), markPaid);

module.exports = router;
