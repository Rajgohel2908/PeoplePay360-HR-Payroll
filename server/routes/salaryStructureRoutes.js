// server/routes/salaryStructureRoutes.js
const express = require('express');
const router = express.Router();
const {
  getStructures,
  getStructureById,
  createStructure,
  updateStructure,
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

// Static routes FIRST — critical for Express 5 compatibility
// /simulate must come before /:id to prevent "simulate" being captured as a dynamic ID
router.post('/simulate', simulateRules);

// Structure CRUD
router.get('/', getStructures);
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), createStructure);

// Dynamic structure routes
router.get('/:id', getStructureById);
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), updateStructure);
router.post('/:id/duplicate', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), duplicateStructure);

// Rules endpoints under a structure
router.get('/:structure_id/rules', getRulesByStructure);
router.post('/:structure_id/rules', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), createRule);

// Rule-level operations (no structure prefix)
router.put('/rules/:id', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), updateRule);
router.delete('/rules/:id', requireRole([ROLES.ADMIN, ROLES.HR_PAYROLL_MANAGER]), deleteRule);

module.exports = router;
