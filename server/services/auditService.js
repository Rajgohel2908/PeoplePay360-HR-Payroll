// server/services/auditService.js
const db = require('../database/connection');

/**
 * Records an immutable audit log entry.
 * @param {object} params
 */
async function logAudit({ userId, userName, userRole, action, entity, entityId, oldValues, newValues, reason, ipAddress }) {
  try {
    await db('audit_logs').insert({
      user_id: userId || null,
      user_name: userName || 'System',
      user_role: userRole || 'system',
      action: action,
      entity: entity,
      entity_id: String(entityId || ''),
      old_values: oldValues ? (typeof oldValues === 'string' ? oldValues : JSON.stringify(oldValues)) : null,
      new_values: newValues ? (typeof newValues === 'string' ? newValues : JSON.stringify(newValues)) : null,
      reason: reason || null,
      ip_address: ipAddress || '127.0.0.1'
    });
  } catch (err) {
    console.error('Audit log write error:', err.message);
  }
}

module.exports = { logAudit };
