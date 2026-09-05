// server/routes/salaryStructureRoutes.js
const express = require('express');
const router = express.Router();
const {
  getStructures,
  getStructureById,
  createStructure,
  duplicateStructure
} = require('../controllers/salaryStructureController');
const {
  getRulesByStructure,
  createRule,
  updateRule,
  deleteRule,
  simulateRules
} = require('../controllers/salaryRuleController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

router.get('/', getStructures);
router.get('/:id', getStructureById);
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), createStructure);
router.post('/:id/duplicate', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), duplicateStructure);

// Rules endpoints
router.get('/:structure_id/rules', getRulesByStructure);
router.post('/:structure_id/rules', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), createRule);
router.put('/rules/:id', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), updateRule);
router.delete('/rules/:id', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), deleteRule);
router.post('/simulate', simulateRules);

module.exports = router;
