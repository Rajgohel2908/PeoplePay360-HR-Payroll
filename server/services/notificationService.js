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

/**
 * Automatically evaluates real-time operational exceptions (Missing bank info, expired contracts,
 * attendance exceptions, pending leave, payroll blockers) and ensures they are delivered as notifications
 * to administrators, HR managers, and payroll managers.
 */
async function syncOperationalWarningsToNotifications(userId, userRole) {
  try {
    // Only administrators and managers receive platform operational warnings
    if (!['admin', 'hr_manager', 'payroll_manager', 'payroll_user'].includes(userRole)) {
      return;
    }

    const now = new Date();

    // 1. Missing Bank Details (BLOCKER)
    const missingBankEmps = await db('employees')
      .whereNull('bank_name')
      .orWhereNull('account_number')
      .select('id', 'employee_id as emp_code', 'first_name', 'last_name');

    if (missingBankEmps.length > 0) {
      const type = 'BLOCKER_MISSING_BANK';
      const existing = await db('notifications')
        .where({ user_id: userId, type })
        .where('is_read', false)
        .first();

      if (!existing) {
        const names = missingBankEmps.slice(0, 3).map(e => `${e.first_name} ${e.last_name}`).join(', ');
        const extra = missingBankEmps.length > 3 ? ` and ${missingBankEmps.length - 3} more` : '';
        await db('notifications').insert({
          user_id: userId,
          type,
          title: `🔴 [BLOCKER] Missing Bank Information (${missingBankEmps.length} Staff)`,
          message: `Payment disbursements will fail without valid bank account details for ${names}${extra}.`,
          link: '/employees',
          is_read: false,
          metadata: JSON.stringify({ severity: 'blocker', count: missingBankEmps.length })
        });
      }
    }

    // 2. Expired Contracts (BLOCKER)
    const expiredContracts = await db('contracts as c')
      .join('employees as e', 'c.employee_id', 'e.id')
      .where('c.status', 'expired')
      .select('c.id', 'c.contract_id', 'e.first_name', 'e.last_name', 'c.end_date');

    if (expiredContracts.length > 0) {
      const type = 'BLOCKER_EXPIRED_CONTRACT';
      const existing = await db('notifications')
        .where({ user_id: userId, type })
        .where('is_read', false)
        .first();

      if (!existing) {
        const cNames = expiredContracts.slice(0, 2).map(c => `${c.first_name} ${c.last_name} (${c.contract_id})`).join(', ');
        await db('notifications').insert({
          user_id: userId,
          type,
          title: `🔴 [BLOCKER] Expired Contract(s) Require Renewal`,
          message: `Employees with expired contracts cannot be included in verified payroll: ${cNames}.`,
          link: '/contracts',
          is_read: false,
          metadata: JSON.stringify({ severity: 'blocker', count: expiredContracts.length })
        });
      }
    }

    // 3. Attendance Exceptions (Missing Checkouts) (WARNING)
    const missingCheckouts = await db('attendance as a')
      .join('employees as e', 'a.employee_id', 'e.id')
      .where('a.status', 'missing_checkout')
      .select('a.id', 'a.date', 'e.first_name', 'e.last_name');

    if (missingCheckouts.length > 0) {
      const type = 'WARNING_MISSING_CHECKOUT';
      const existing = await db('notifications')
        .where({ user_id: userId, type })
        .where('is_read', false)
        .first();

      if (!existing) {
        const aNames = missingCheckouts.slice(0, 2).map(a => `${a.first_name} ${a.last_name} on ${a.date}`).join(', ');
        await db('notifications').insert({
          user_id: userId,
          type,
          title: `🟠 [WARNING] Unresolved Missing Checkout(s)`,
          message: `Attendance verification needed: ${aNames}.`,
          link: '/attendance',
          is_read: false,
          metadata: JSON.stringify({ severity: 'warning', count: missingCheckouts.length })
        });
      }
    }

    // 4. Pending Leave Requests (WARNING)
    const pendingLeaves = await db('time_off_requests')
      .where('status', 'submitted')
      .count('id as count')
      .first();

    const pendingCount = parseInt(pendingLeaves?.count || 0, 10);
    if (pendingCount > 0) {
      const type = 'WARNING_PENDING_LEAVES';
      const existing = await db('notifications')
        .where({ user_id: userId, type })
        .where('is_read', false)
        .first();

      if (!existing) {
        await db('notifications').insert({
          user_id: userId,
          type,
          title: `🟠 [WARNING] ${pendingCount} Pending Leave Request(s)`,
          message: 'Review and approve/decline leave requests to ensure accurate payable day calculations.',
          link: '/time-off',
          is_read: false,
          metadata: JSON.stringify({ severity: 'warning', count: pendingCount })
        });
      }
    }

    // 5. Active Payroll Validation Issues
    const validationIssues = await db('payroll_validation_issues')
      .where('is_resolved', false)
      .limit(5);

    for (const issue of validationIssues) {
      const type = `VALIDATION_ISSUE_${issue.id}`;
      const existing = await db('notifications')
        .where({ user_id: userId, type })
        .first();

      if (!existing) {
        const isBlocker = issue.severity === 'blocker';
        await db('notifications').insert({
          user_id: userId,
          type,
          title: `${isBlocker ? '🔴 [BLOCKER]' : '🟠 [WARNING]'} ${issue.title}`,
          message: `${issue.description} Recommended Action: ${issue.recommended_action || 'Review issue.'}`,
          link: `/payroll/validation/${issue.payrun_id}`,
          is_read: false,
          metadata: JSON.stringify({ severity: issue.severity, issueId: issue.id, payrunId: issue.payrun_id })
        });
      }
    }

  } catch (err) {
    console.error('Error syncing operational warnings to notifications:', err.message);
  }
}

module.exports = { 
  createNotification,
  syncOperationalWarningsToNotifications
};
