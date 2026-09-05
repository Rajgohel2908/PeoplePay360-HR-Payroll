// server/routes/timeOffRoutes.js
const express = require('express');
const router = express.Router();
const {
  getTimeOffTypes,
  getAllocations,
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

router.get('/types', getTimeOffTypes);
router.get('/allocations', getAllocations);
router.get('/requests', getRequests);
router.post('/requests', submitRequest);
router.post('/requests/:id/approve', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER]), approveRequest);
router.post('/requests/:id/refuse', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER]), refuseRequest);
router.post('/requests/:id/cancel', cancelRequest);

module.exports = router;
