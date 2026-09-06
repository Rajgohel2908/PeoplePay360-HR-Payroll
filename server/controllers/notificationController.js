// server/controllers/notificationController.js
const db = require('../database/connection');
const { syncOperationalWarningsToNotifications } = require('../services/notificationService');

async function getNotifications(req, res, next) {
  try {
    // Automatically sync real-time operational warnings & blockers into notifications
    if (req.user?.id) {
      await syncOperationalWarningsToNotifications(req.user.id, req.user.role);
    }

    const notifications = await db('notifications')
      .where('user_id', req.user.id)
      .orWhereNull('user_id')
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(40);

    const unreadCountResult = await db('notifications')
      .where((builder) => {
        builder.where('user_id', req.user.id).orWhereNull('user_id');
      })
      .where('is_read', false)
      .count('id as count')
      .first();

    res.json({
      success: true,
      data: notifications,
      unreadCount: parseInt(unreadCountResult?.count || 0, 10)
    });
  } catch (err) {
    next(err);
  }
}

async function markNotificationAsRead(req, res, next) {
  try {
    const { id } = req.params;
    await db('notifications').where('id', id).update({ is_read: true });
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsAsRead(req, res, next) {
  try {
    await db('notifications')
      .where((builder) => {
        builder.where('user_id', req.user.id).orWhereNull('user_id');
      })
      .update({ is_read: true });

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
