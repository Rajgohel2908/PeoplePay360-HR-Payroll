// server/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/scheduleController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticateToken);

router.get('/', getSchedules);
router.get('/:id', getScheduleById);
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), createSchedule);
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), updateSchedule);
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), deleteSchedule);

module.exports = router;
