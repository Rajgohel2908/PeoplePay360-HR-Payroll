// server/controllers/timeOffController.js
const db = require('../database/connection');
const { TIME_OFF_STATUS, ROLES } = require('../config/constants');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

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

    const allocations = await query.orderBy('t.id', 'asc');

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

    const requests = await query.orderBy('r.start_date', 'desc');

    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

async function submitRequest(req, res, next) {
  try {
    const employeeId = req.user.role === ROLES.EMPLOYEE ? req.user.employee_id : req.body.employee_id;
    const { leave_type_id, start_date, end_date, duration_days, reason } = req.body;

    if (!leave_type_id || !start_date || !end_date || !duration_days) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Leave type, start date, end date, and duration are required.'
      });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DATES',
        message: 'End date cannot be earlier than start date.'
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (req.user.role === ROLES.EMPLOYEE && start_date < todayStr) {
      return res.status(400).json({
        success: false,
        code: 'PAST_DATE_NOT_ALLOWED',
        message: 'Start date cannot be in the past. Please select today or a future date.'
      });
    }

    // Check overlap with existing active requests
    const overlapping = await db('time_off_requests')
      .where('employee_id', employeeId)
      .whereIn('status', [TIME_OFF_STATUS.SUBMITTED, TIME_OFF_STATUS.APPROVED])
      .andWhere((builder) => {
        builder.where('start_date', '<=', end_date)
          .andWhere('end_date', '>=', start_date);
      });

    if (overlapping.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'OVERLAPPING_REQUEST',
        message: 'You already have an existing leave request overlapping these dates.'
      });
    }

    const leaveType = await db('time_off_types').where('id', leave_type_id).first();
    const currentYear = new Date(start_date).getFullYear();

    // If type requires allocation, check remaining balance
    if (leaveType.requires_allocation) {
      const alloc = await db('time_off_allocations')
        .where('employee_id', employeeId)
        .where('leave_type_id', leave_type_id)
        .where('year', currentYear)
        .first();

      if (!alloc || parseFloat(alloc.remaining_days) < parseFloat(duration_days)) {
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient leave balance. Available remaining: ${alloc ? alloc.remaining_days : 0} days, Requested: ${duration_days} days.`
        });
      }

      // Update pending days
      await db('time_off_allocations')
        .where('id', alloc.id)
        .update({
          pending_days: parseFloat(alloc.pending_days || 0) + parseFloat(duration_days),
          updated_at: new Date()
        });
    }

    const [newId] = await db('time_off_requests').insert({
      employee_id: employeeId,
      leave_type_id,
      start_date,
      end_date,
      duration_days: parseFloat(duration_days),
      reason,
      status: TIME_OFF_STATUS.SUBMITTED
    }).returning('id');

    const requestId = newId?.id || newId;

    // Notify HR Managers (fire-and-forget async, does not block response)
    try {
      createNotification({
        role: ROLES.HR_MANAGER,
        type: 'LEAVE_REQUEST_SUBMITTED',
        title: 'New Leave Request',
        message: `A new ${leaveType.name} request (${duration_days} days) has been submitted for review.`,
        link: '/time-off'
      }).catch((e) => console.error('Notification error:', e.message));
    } catch (e) {
      console.error('Notification error:', e.message);
    }

    const created = await db('time_off_requests').where('id', requestId).first();
    res.status(201).json({
      success: true,
      message: 'Time off request submitted successfully for manager approval.',
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

    if (request.status !== TIME_OFF_STATUS.SUBMITTED) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        message: `Cannot approve a request with status '${request.status}'.`
      });
    }

    const currentYear = new Date(request.start_date).getFullYear();

    await db.transaction(async (trx) => {
      // 1. Update Request
      await trx('time_off_requests')
        .where('id', id)
        .update({
          status: TIME_OFF_STATUS.APPROVED,
          approver_id: req.user.id,
          approver_comment: approver_comment || 'Approved',
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
          const pending = Math.max(0, parseFloat(alloc.pending_days) - parseFloat(request.duration_days));
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

    // Post-transaction notifications and audit logs (runs without holding table lock)
    try {
      const empUser = await db('users').where('employee_id', request.employee_id).first();
      if (empUser) {
        createNotification({
          userId: empUser.id,
          type: 'LEAVE_REQUEST_APPROVED',
          title: 'Leave Request Approved',
          message: `Your request for ${request.leave_name} (${request.duration_days} days) has been APPROVED.`,
          link: '/time-off'
        }).catch((e) => console.error('Notification write error:', e.message));
      }

      logAudit({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'APPROVE_LEAVE_REQUEST',
        entity: 'TimeOffRequest',
        entityId: id,
        newValues: JSON.stringify({ status: 'approved', approver_id: req.user.id }),
        reason: approver_comment || 'Leave approved',
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

    if (!approver_comment) {
      return res.status(400).json({
        success: false,
        code: 'REASON_REQUIRED',
        message: 'A rejection reason is required.'
      });
    }

    const request = await db('time_off_requests as r')
      .join('time_off_types as t', 'r.leave_type_id', 't.id')
      .select('r.*', 't.requires_allocation', 't.name as leave_name')
      .where('r.id', id)
      .first();

    if (!request || request.status !== TIME_OFF_STATUS.SUBMITTED) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Request not found or not in submitted state.'
      });
    }

    const currentYear = new Date(request.start_date).getFullYear();

    await db.transaction(async (trx) => {
      await trx('time_off_requests')
        .where('id', id)
        .update({
          status: TIME_OFF_STATUS.REFUSED,
          approver_id: req.user.id,
          approver_comment,
          updated_at: new Date()
        });

      // Release pending days back to balance
      if (request.requires_allocation) {
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
    });

    // Post-transaction notifications and audit logs
    try {
      const empUser = await db('users').where('employee_id', request.employee_id).first();
      if (empUser) {
        createNotification({
          userId: empUser.id,
          type: 'LEAVE_REQUEST_REFUSED',
          title: 'Leave Request Declined',
          message: `Your request for ${request.leave_name} was refused. Reason: ${approver_comment}`,
          link: '/time-off'
        }).catch((e) => console.error('Notification write error:', e.message));
      }

      logAudit({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'REFUSE_LEAVE_REQUEST',
        entity: 'TimeOffRequest',
        entityId: id,
        newValues: JSON.stringify({ status: 'refused', approver_id: req.user.id }),
        reason: approver_comment,
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
