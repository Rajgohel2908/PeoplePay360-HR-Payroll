// server/services/notificationService.js
const db = require('../database/connection');

/**
 * Creates in-app notifications for a user or group of users by role.
 * @param {object} params
 */
async function createNotification({ userId, role, type, title, message, link, metadata }) {
  try {
    if (userId) {
      await db('notifications').insert({
        user_id: userId,
        type,
        title,
        message,
        link,
        is_read: false,
        metadata: metadata ? JSON.stringify(metadata) : null
      });
    } else if (role) {
      const users = await db('users').where('role', role).select('id');
      for (const u of users) {
        await db('notifications').insert({
          user_id: u.id,
          type,
          title,
          message,
          link,
          is_read: false,
          metadata: metadata ? JSON.stringify(metadata) : null
        });
      }
    }
  } catch (err) {
    console.error('Notification write error:', err.message);
  }
}

module.exports = { createNotification };
