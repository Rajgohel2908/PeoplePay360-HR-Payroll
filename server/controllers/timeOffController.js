// server/controllers/timeOffController.js
const db = require('../database/connection');
const { TIME_OFF_STATUS, ROLES } = require('../config/constants');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { sendLeaveRequestSubmittedEmail, sendLeaveDecisionEmail } = require('../services/emailService');

async function getTimeOffTypes(req, res, next) {
  try {
    const types = await db('time_off_types').where('is_active', true);
    res.json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
}

async function getAllocations(req, res, next) {
  try {
    const { employee_id, year = new Date().getFullYear() } = req.query;

    let query = db('time_off_allocations as a')
      .join('employees as e', 'a.employee_id', 'e.id')
      .join('time_off_types as t', 'a.leave_type_id', 't.id')
      .select(
        'a.*',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'e.avatar_url',
        't.name as leave_type_name',
        't.code as leave_type_code',
        't.color as leave_color',
        't.paid as is_paid'
      )
      .where('a.year', year);

    if (req.user.role === ROLES.EMPLOYEE) {
      query = query.where('a.employee_id', req.user.employee_id);
    } else if (employee_id) {
      query = query.where('a.employee_id', employee_id);
    }

    const allocations = await query.orderBy('a.id', 'desc');

    res.json({ success: true, data: allocations });
  } catch (err) {
    next(err);
  }
}

async function getRequests(req, res, next) {
  try {
    const { employee_id, status, department_id } = req.query;

    let query = db('time_off_requests as r')
      .join('employees as e', 'r.employee_id', 'e.id')
      .join('time_off_types as t', 'r.leave_type_id', 't.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('users as u', 'r.approver_id', 'u.id')
      .select(
        'r.*',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'e.avatar_url',
        'd.name as department_name',
        't.name as leave_type_name',
        't.code as leave_type_code',
        't.color as leave_color',
        't.paid as is_paid',
        'u.username as approver_name'
      );

    if (req.user.role === ROLES.EMPLOYEE) {
      query = query.where('r.employee_id', req.user.employee_id);
    } else if (employee_id) {
      query = query.where('r.employee_id', employee_id);
    }

    if (status) {
      query = query.where('r.status', status);
    }
    if (department_id) {
      query = query.where('e.department_id', department_id);
    }

    const requests = await query
      .orderBy('r.created_at', 'desc')
      .orderBy('r.id', 'desc');

    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

async function submitRequest(req, res, next) {
  try {
    let targetEmpId = null;
    if (req.user.role === ROLES.EMPLOYEE && req.user.employee_id) {
      targetEmpId = req.user.employee_id;
    } else {
      targetEmpId = req.body.employee_id || req.user.employee_id;
    }

    if (!targetEmpId) {
      return res.status(400).json({
        success: false,
        code: 'EMPLOYEE_REQUIRED',
        message: 'Please select an employee for this leave request.'
      });
    }

    const employeeId = targetEmpId;
    const { leave_type_id, start_date, end_date, duration_days, reason } = req.body;

    if (!leave_type_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Leave type, start date, and end date are required.'
      });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DATES',
        message: 'End date cannot be earlier than start date.'
      });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const calculatedDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const duration = parseFloat(duration_days) > 0 ? parseFloat(duration_days) : calculatedDays;

    // Check overlap with existing active requests
    const overlapping = await db('time_off_requests')
      .where('employee_id', employeeId)
      .whereIn('status', [TIME_OFF_STATUS.SUBMITTED, TIME_OFF_STATUS.APPROVED])
      .andWhere((builder) => {
        builder.where('start_date', '<=', end_date)
          .andWhere('end_date', '>=', start_date);
      });

    if (overlapping.length > 0) {
      const conflict = overlapping[0];
      return res.status(400).json({
        success: false,
        code: 'OVERLAPPING_REQUEST',
        message: `An existing ${conflict.status.toUpperCase()} leave request already covers these dates (${conflict.start_date} to ${conflict.end_date}). Please select non-conflicting dates.`
      });
    }

    const leaveType = await db('time_off_types').where('id', leave_type_id).first();
    const currentYear = new Date(start_date).getFullYear();

    // If type requires allocation, check remaining balance
    if (leaveType && leaveType.requires_allocation) {
      const alloc = await db('time_off_allocations')
        .where('employee_id', employeeId)
        .where('leave_type_id', leave_type_id)
        .where('year', currentYear)
        .first();

      if (!alloc || parseFloat(alloc.remaining_days) < duration) {
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient leave balance. Available remaining: ${alloc ? alloc.remaining_days : 0} days, Requested: ${duration} days.`
        });
      }

      // Update pending days
      await db('time_off_allocations')
        .where('id', alloc.id)
        .update({
          pending_days: parseFloat(alloc.pending_days || 0) + duration,
          updated_at: new Date()
        });
    }

    const [newId] = await db('time_off_requests').insert({
      employee_id: employeeId,
      leave_type_id,
      start_date,
      end_date,
      duration_days: duration,
      reason: reason || 'Personal time off',
      status: TIME_OFF_STATUS.SUBMITTED
    }).returning('id');

    const requestId = newId?.id || newId;

    // Fetch employee details to send comprehensive notifications
    const employee = await db('employees').where('id', employeeId).first();
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Employee';
    const employeeCode = employee?.employee_id || `EMP-${employeeId}`;

    // Find all HR managers and Admins to notify
    const hrUsers = await db('users')
      .whereIn('role', [ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER])
      .select('id', 'email', 'username', 'role');

    // Also include employee direct reporting manager if configured
    if (employee && employee.manager_id) {
      const managerUser = await db('users').where('employee_id', employee.manager_id).first();
      if (managerUser && !hrUsers.some(u => u.id === managerUser.id)) {
        hrUsers.push(managerUser);
      }
    }

    // In-app notifications to all HR/Managers
    for (const u of hrUsers) {
      createNotification({
        userId: u.id,
        type: 'LEAVE_REQUEST_SUBMITTED',
        title: 'New Leave Request',
        message: `${employeeName} (${employeeCode}) requested ${duration} day(s) of ${leaveType?.name || 'Leave'}.`,
        link: '/time-off'
      }).catch((e) => console.error('Notification error:', e.message));
    }

    // Send Real Email to HR
    sendLeaveRequestSubmittedEmail({
      employeeName,
      employeeCode,
      leaveType: leaveType?.name || 'Leave',
      startDate: start_date,
      endDate: end_date,
      durationDays: duration,
      reason: reason || 'Personal time off',
      hrEmails: hrUsers.map(u => u.email).filter(Boolean)
    }).catch((e) => console.error('Email dispatch error:', e.message));

    const created = await db('time_off_requests').where('id', requestId).first();
    res.status(201).json({
      success: true,
      message: 'Time off request submitted successfully and sent to your HR department.',
      data: created
    });
  } catch (err) {
    next(err);
  }
}

async function approveRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { approver_comment } = req.body;

    const request = await db('time_off_requests as r')
      .join('time_off_types as t', 'r.leave_type_id', 't.id')
      .select('r.*', 't.requires_allocation', 't.name as leave_name')
      .where('r.id', id)
      .first();

    if (!request) {
      return res.status(404).json({
        success: false,
        code: 'REQUEST_NOT_FOUND',
        message: 'Leave request not found.'
      });
    }

    if (request.status === TIME_OFF_STATUS.APPROVED) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_APPROVED',
        message: 'This leave request is already approved.'
      });
    }

    const currentYear = new Date(request.start_date).getFullYear();

    const finalComment = (approver_comment && approver_comment.trim()) ? approver_comment.trim() : 'Approved by Management';

    await db.transaction(async (trx) => {
      // 1. Update Request
      await trx('time_off_requests')
        .where('id', id)
        .update({
          status: TIME_OFF_STATUS.APPROVED,
          approver_id: req.user.id,
          approver_comment: finalComment,
          approved_at: new Date(),
          updated_at: new Date()
        });

      // 2. If requires allocation, deduct from remaining and add to used
      if (request.requires_allocation) {
        const alloc = await trx('time_off_allocations')
          .where('employee_id', request.employee_id)
          .where('leave_type_id', request.leave_type_id)
          .where('year', currentYear)
          .first();

        if (alloc) {
          const used = parseFloat(alloc.used_days) + parseFloat(request.duration_days);
          const pending = Math.max(0, parseFloat(alloc.pending_days) - (request.status === TIME_OFF_STATUS.SUBMITTED ? parseFloat(request.duration_days) : 0));
          const remaining = Math.max(0, parseFloat(alloc.allocated_days) - used);

          await trx('time_off_allocations')
            .where('id', alloc.id)
            .update({
              used_days: used,
              pending_days: pending,
              remaining_days: remaining,
              updated_at: new Date()
            });
        }
      }
    });

    // Post-transaction notifications and email (runs without holding table lock)
    try {
      const empUser = await db('users').where('employee_id', request.employee_id).first();
      const employee = await db('employees').where('id', request.employee_id).first();
      const recipientEmail = empUser?.email || employee?.email;
      const empFullName = employee ? `${employee.first_name} ${employee.last_name}` : 'Employee';

      if (empUser) {
        createNotification({
          userId: empUser.id,
          type: 'LEAVE_REQUEST_APPROVED',
          title: 'Leave Request Approved',
          message: `Your request for ${request.leave_name} (${request.duration_days} days) has been APPROVED.`,
          link: '/time-off'
        }).catch((e) => console.error('Notification write error:', e.message));
      }

      // Send Real Decision Email to Employee
      if (recipientEmail) {
        sendLeaveDecisionEmail({
          employeeEmail: recipientEmail,
          employeeName: empFullName,
          leaveType: request.leave_name,
          startDate: request.start_date,
          endDate: request.end_date,
          durationDays: request.duration_days,
          status: 'approved',
          approverName: req.user.username || 'HR Manager',
          approverComment: finalComment
        }).catch((e) => console.error('Decision email error:', e.message));
      }

      logAudit({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'APPROVE_LEAVE_REQUEST',
        entity: 'TimeOffRequest',
        entityId: id,
        newValues: JSON.stringify({ status: 'approved', approver_id: req.user.id }),
        reason: finalComment,
        ipAddress: req.ip
      }).catch((e) => console.error('Audit log write error:', e.message));
    } catch (postTrxErr) {
      console.error('Post-approval hook non-fatal error:', postTrxErr.message);
    }

    const updated = await db('time_off_requests').where('id', id).first();
    res.json({
      success: true,
      message: 'Time off request approved successfully and allocation balances updated.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

async function refuseRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { approver_comment } = req.body;

    const request = await db('time_off_requests as r')
      .join('time_off_types as t', 'r.leave_type_id', 't.id')
      .select('r.*', 't.requires_allocation', 't.name as leave_name')
      .where('r.id', id)
      .first();

    if (!request) {
      return res.status(404).json({
        success: false,
        code: 'REQUEST_NOT_FOUND',
        message: 'Leave request not found.'
      });
    }

    if (request.status === TIME_OFF_STATUS.REFUSED) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_REFUSED',
        message: 'This leave request is already refused.'
      });
    }

    const currentYear = new Date(request.start_date).getFullYear();
    const finalComment = (approver_comment && approver_comment.trim()) ? approver_comment.trim() : 'Declined by Management';

    await db.transaction(async (trx) => {
      await trx('time_off_requests')
        .where('id', id)
        .update({
          status: TIME_OFF_STATUS.REFUSED,
          approver_id: req.user.id,
          approver_comment: finalComment,
          updated_at: new Date()
        });

      // Restore balances
      if (request.requires_allocation) {
        const alloc = await trx('time_off_allocations')
          .where('employee_id', request.employee_id)
          .where('leave_type_id', request.leave_type_id)
          .where('year', currentYear)
          .first();

        if (alloc) {
          if (request.status === TIME_OFF_STATUS.APPROVED) {
            // Restore from used back to remaining
            const used = Math.max(0, parseFloat(alloc.used_days) - parseFloat(request.duration_days));
            const remaining = Math.min(parseFloat(alloc.allocated_days), parseFloat(alloc.remaining_days) + parseFloat(request.duration_days));
            await trx('time_off_allocations')
              .where('id', alloc.id)
              .update({ used_days: used, remaining_days: remaining, updated_at: new Date() });
          } else {
            // Release pending days back to balance
            const pending = Math.max(0, parseFloat(alloc.pending_days) - parseFloat(request.duration_days));
            await trx('time_off_allocations')
              .where('id', alloc.id)
              .update({ pending_days: pending, updated_at: new Date() });
          }
        }
      }
    });

    // Post-transaction notifications, email, and audit logs
    try {
      const empUser = await db('users').where('employee_id', request.employee_id).first();
      const employee = await db('employees').where('id', request.employee_id).first();
      const recipientEmail = empUser?.email || employee?.email;
      const empFullName = employee ? `${employee.first_name} ${employee.last_name}` : 'Employee';

      if (empUser) {
        createNotification({
          userId: empUser.id,
          type: 'LEAVE_REQUEST_REFUSED',
          title: 'Leave Request Declined',
          message: `Your request for ${request.leave_name} was refused. Reason: ${finalComment}`,
          link: '/time-off'
        }).catch((e) => console.error('Notification write error:', e.message));
      }

      // Send Real Decision Email to Employee
      if (recipientEmail) {
        sendLeaveDecisionEmail({
          employeeEmail: recipientEmail,
          employeeName: empFullName,
          leaveType: request.leave_name,
          startDate: request.start_date,
          endDate: request.end_date,
          durationDays: request.duration_days,
          status: 'refused',
          approverName: req.user.username || 'HR Manager',
          approverComment: finalComment
        }).catch((e) => console.error('Decision email error:', e.message));
      }

      logAudit({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'REFUSE_LEAVE_REQUEST',
        entity: 'TimeOffRequest',
        entityId: id,
        newValues: JSON.stringify({ status: 'refused', approver_id: req.user.id }),
        reason: finalComment,
        ipAddress: req.ip
      }).catch((e) => console.error('Audit log write error:', e.message));
    } catch (postTrxErr) {
      console.error('Post-refusal hook non-fatal error:', postTrxErr.message);
    }

    const updated = await db('time_off_requests').where('id', id).first();
    res.json({
      success: true,
      message: 'Time off request refused.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

async function cancelRequest(req, res, next) {
  try {
    const { id } = req.params;
    const request = await db('time_off_requests as r')
      .join('time_off_types as t', 'r.leave_type_id', 't.id')
      .select('r.*', 't.requires_allocation')
      .where('r.id', id)
      .first();

    if (!request) {
      return res.status(404).json({
        success: false,
        code: 'REQUEST_NOT_FOUND',
        message: 'Leave request not found.'
      });
    }

    const currentYear = new Date(request.start_date).getFullYear();

    await db.transaction(async (trx) => {
      // If was previously approved, restore used back to remaining
      if (request.status === TIME_OFF_STATUS.APPROVED && request.requires_allocation) {
        const alloc = await trx('time_off_allocations')
          .where('employee_id', request.employee_id)
          .where('leave_type_id', request.leave_type_id)
          .where('year', currentYear)
          .first();

        if (alloc) {
          const used = Math.max(0, parseFloat(alloc.used_days) - parseFloat(request.duration_days));
          const remaining = Math.min(parseFloat(alloc.allocated_days), parseFloat(alloc.remaining_days) + parseFloat(request.duration_days));
          await trx('time_off_allocations')
            .where('id', alloc.id)
            .update({ used_days: used, remaining_days: remaining, updated_at: new Date() });
        }
      } else if (request.status === TIME_OFF_STATUS.SUBMITTED && request.requires_allocation) {
        const alloc = await trx('time_off_allocations')
          .where('employee_id', request.employee_id)
          .where('leave_type_id', request.leave_type_id)
          .where('year', currentYear)
          .first();

        if (alloc) {
          const pending = Math.max(0, parseFloat(alloc.pending_days) - parseFloat(request.duration_days));
          await trx('time_off_allocations')
            .where('id', alloc.id)
            .update({ pending_days: pending, updated_at: new Date() });
        }
      }

      await trx('time_off_requests')
        .where('id', id)
        .update({ status: TIME_OFF_STATUS.CANCELLED, updated_at: new Date() });
    });

    res.json({
      success: true,
      message: 'Time off request cancelled and balances restored.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTimeOffTypes,
  getAllocations,
  getRequests,
  submitRequest,
  approveRequest,
  refuseRequest,
  cancelRequest
};
