// server/routes/timeOffRoutes.js
const express = require('express');
const router = express.Router();
const {
  getTimeOffTypes,
  createTimeOffType,
  updateTimeOffType,
  getAllocations,
  createAllocation,
  updateAllocation,
  getRequests,
  submitRequest,
  approveRequest,
  refuseRequest,
  cancelRequest
} = require('../controllers/timeOffController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

// Types
router.get('/types', getTimeOffTypes);
router.post('/types', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), createTimeOffType);
router.put('/types/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), updateTimeOffType);

// Allocations
router.get('/allocations', getAllocations);
router.post('/allocations', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), createAllocation);
router.put('/allocations/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), updateAllocation);

// Requests
router.get('/requests', getRequests);
router.post('/requests', submitRequest);
router.post('/requests/:id/approve', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER]), approveRequest);
router.post('/requests/:id/refuse', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER]), refuseRequest);
router.post('/requests/:id/cancel', cancelRequest);

module.exports = router;
