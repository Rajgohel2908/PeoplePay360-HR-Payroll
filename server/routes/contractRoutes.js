// server/routes/contractRoutes.js
const express = require('express');
const router = express.Router();
const {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract
} = require('../controllers/contractController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

router.get('/', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), getContracts);
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), createContract);
router.get('/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER]), getContractById);
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), updateContract);
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), deleteContract);

module.exports = router;
