// server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getNotifications);
router.put('/:id/read', markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);

module.exports = router;
