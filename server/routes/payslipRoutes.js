// server/routes/payslipRoutes.js
const express = require('express');
const router = express.Router();
const {
  getPayslips,
  getPayslipById,
  downloadPayslipPdf,
  sendBulkPayslipEmails,
  getEmailLogs
} = require('../controllers/payslipController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

router.get('/', getPayslips);
router.get('/logs/email', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), getEmailLogs);
router.get('/:id', getPayslipById);
router.get('/:id/pdf', downloadPayslipPdf);
router.post('/send-emails', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), sendBulkPayslipEmails);

module.exports = router;
