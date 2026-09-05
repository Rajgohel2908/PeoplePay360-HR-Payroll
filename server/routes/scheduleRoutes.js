// server/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const {
  getSchedules,
  getScheduleById,
  createSchedule
} = require('../controllers/scheduleController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

router.get('/', getSchedules);
router.get('/:id', getScheduleById);
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), createSchedule);

module.exports = router;
