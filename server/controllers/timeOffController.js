// server/controllers/timeOffController.js
const db = require('../database/connection');
const { TIME_OFF_STATUS, ROLES } = require('../config/constants');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

async function getTimeOffTypes(req, res, next) {
  try {
    const types = await db('time_off_types').orderBy('id', 'asc');
    res.json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
}

async function createTimeOffType(req, res, next) {
  try {
    const { name, code, default_days = 0, paid = true, color = '#6366f1', requires_allocation = true } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Name and unique code are required.'
      });
    }

    const [insertId] = await db('time_off_types').insert({
      name,
      code: code.toUpperCase(),
      default_days: parseFloat(default_days),
      paid: Boolean(paid),
      color,
      requires_allocation: Boolean(requires_allocation),
      is_active: true
    });

    const newType = await db('time_off_types').where('id', insertId).first();

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'CREATE_TIME_OFF_TYPE',
      entity: 'TimeOffType',
      entityId: String(insertId),
      newValues: newType,
      reason: `Created time off type ${name}`
    });

    res.status(201).json({ success: true, data: newType });
  } catch (err) {
    next(err);
  }
}

async function updateTimeOffType(req, res, next) {
  try {
    const { id } = req.params;
    const { name, default_days, paid, color, requires_allocation, is_active } = req.body;

    const existing = await db('time_off_types').where('id', id).first();
    if (!existing) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Leave type not found.' });
    }

    const updates = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (default_days !== undefined) updates.default_days = parseFloat(default_days);
    if (paid !== undefined) updates.paid = Boolean(paid);
    if (color !== undefined) updates.color = color;
    if (requires_allocation !== undefined) updates.requires_allocation = Boolean(requires_allocation);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    await db('time_off_types').where('id', id).update(updates);
    const updated = await db('time_off_types').where('id', id).first();

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'UPDATE_TIME_OFF_TYPE',
      entity: 'TimeOffType',
      entityId: String(id),
      oldValues: existing,
      newValues: updated,
      reason: `Updated time off type ${existing.name}`
    });

    res.json({ success: true, data: updated });
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

async function createAllocation(req, res, next) {
  try {
    const { employee_id, leave_type_id, allocated_days, year = new Date().getFullYear(), notes } = req.body;

    if (!employee_id || !leave_type_id || allocated_days === undefined) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'employee_id, leave_type_id, and allocated_days are required.'
      });
    }

    const days = parseFloat(allocated_days);

    const [insertId] = await db('time_off_allocations').insert({
      employee_id,
      leave_type_id,
      allocated_days: days,
      used_days: 0,
      pending_days: 0,
      remaining_days: days,
      year: parseInt(year, 10),
      notes: notes || null
    });

    const newAlloc = await db('time_off_allocations').where('id', insertId).first();

    res.status(201).json({ success: true, data: newAlloc });
  } catch (err) {
    next(err);
  }
}

async function updateAllocation(req, res, next) {
  try {
    const { id } = req.params;
    const { allocated_days, notes } = req.body;

    const existing = await db('time_off_allocations').where('id', id).first();
    if (!existing) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Allocation not found.' });
    }

    const updates = { updated_at: new Date() };
    if (allocated_days !== undefined) {
      const newAllocated = parseFloat(allocated_days);
      const used = parseFloat(existing.used_days || 0);
      updates.allocated_days = newAllocated;
      updates.remaining_days = Math.max(0, newAllocated - used);
    }
    if (notes !== undefined) updates.notes = notes;

    await db('time_off_allocations').where('id', id).update(updates);
    const updated = await db('time_off_allocations').where('id', id).first();

    res.json({ success: true, data: updated });
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
    } else {
      if (employee_id) query = query.where('r.employee_id', employee_id);
      if (department_id) query = query.where('e.department_id', department_id);
    }

    if (status) {
      query = query.where('r.status', status);
    }

    const requests = await query.orderBy('r.created_at', 'desc');

    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

async function submitRequest(req, res, next) {
  try {
    const { leave_type_id, start_date, end_date, duration_days, reason } = req.body;
    const employeeId = req.user.role === ROLES.EMPLOYEE ? req.user.employee_id : req.body.employee_id;

    if (!leave_type_id || !start_date || !end_date || !duration_days) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Leave type, start date, end date, and duration are required.'
      });
    }

    const leaveType = await db('time_off_types').where('id', leave_type_id).first();
    if (!leaveType) {
      return res.status(404).json({
        success: false,
        code: 'LEAVE_TYPE_NOT_FOUND',
        message: 'Invalid leave type specified.'
      });
    }

    // Overlap check
    const overlap = await db('time_off_requests')
      .where('employee_id', employeeId)
      .whereNotIn('status', [TIME_OFF_STATUS.REFUSED, TIME_OFF_STATUS.CANCELLED])
      .where('start_date', '<=', end_date)
      .where('end_date', '>=', start_date)
      .first();

    if (overlap) {
      return res.status(400).json({
        success: false,
        code: 'OVERLAPPING_REQUEST',
        message: 'A time off request already exists for these dates.'
      });
    }

    const currentYear = new Date(start_date).getFullYear();

    // Check balance if allocation required
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

    // MySQL: insert returns [id]
    const [newId] = await db('time_off_requests').insert({
      employee_id: employeeId,
      leave_type_id,
      start_date,
      end_date,
      duration_days: parseFloat(duration_days),
      reason,
      status: TIME_OFF_STATUS.SUBMITTED
    });

    const requestId = typeof newId === 'object' ? newId.id : newId;

    // Notify HR Managers
    await createNotification({
      role: ROLES.HR_MANAGER,
      type: 'LEAVE_REQUEST_SUBMITTED',
      title: 'New Leave Request',
      message: `A new ${leaveType.name} request (${duration_days} days) has been submitted for review.`,
      link: '/time-off'
    });

    res.status(201).json({
      success: true,
      message: 'Time off request submitted successfully.',
      data: { id: requestId }
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
      .join('employees as e', 'r.employee_id', 'e.id')
      .select('r.*', 't.requires_allocation', 't.name as leave_name', 'e.first_name', 'e.last_name', 'e.user_id')
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
        message: `Cannot approve request with status '${request.status}'. Must be '${TIME_OFF_STATUS.SUBMITTED}'.`
      });
    }

    const currentYear = new Date(request.start_date).getFullYear();

    await db.transaction(async (trx) => {
      // Deduct from allocation if required
      if (request.requires_allocation) {
        const alloc = await trx('time_off_allocations')
          .where('employee_id', request.employee_id)
          .where('leave_type_id', request.leave_type_id)
          .where('year', currentYear)
          .first();

        if (alloc) {
          const used = parseFloat(alloc.used_days || 0) + parseFloat(request.duration_days);
          const pending = Math.max(0, parseFloat(alloc.pending_days || 0) - parseFloat(request.duration_days));
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

      await trx('time_off_requests')
        .where('id', id)
        .update({
          status: TIME_OFF_STATUS.APPROVED,
          approver_id: req.user.id,
          approver_comment: approver_comment || null,
          approved_at: new Date(),
          updated_at: new Date()
        });
    });

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'APPROVE_TIME_OFF',
      entity: 'TimeOffRequest',
      entityId: String(id),
      reason: approver_comment || 'Leave approved'
    });

    if (request.user_id) {
      await createNotification({
        userId: request.user_id,
        type: 'LEAVE_APPROVED',
        title: 'Leave Request Approved',
        message: `Your ${request.leave_name} request from ${request.start_date} to ${request.end_date} has been approved.`,
        link: '/time-off'
      });
    }

    res.json({
      success: true,
      message: 'Time off request approved successfully.'
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
      .join('employees as e', 'r.employee_id', 'e.id')
      .select('r.*', 't.requires_allocation', 't.name as leave_name', 'e.first_name', 'e.last_name', 'e.user_id')
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
      // Revert pending days
      if (request.requires_allocation) {
        const alloc = await trx('time_off_allocations')
          .where('employee_id', request.employee_id)
          .where('leave_type_id', request.leave_type_id)
          .where('year', currentYear)
          .first();

        if (alloc) {
          const pending = Math.max(0, parseFloat(alloc.pending_days || 0) - parseFloat(request.duration_days));
          await trx('time_off_allocations')
            .where('id', alloc.id)
            .update({
              pending_days: pending,
              updated_at: new Date()
            });
        }
      }

      await trx('time_off_requests')
        .where('id', id)
        .update({
          status: TIME_OFF_STATUS.REFUSED,
          approver_id: req.user.id,
          approver_comment: approver_comment || null,
          updated_at: new Date()
        });
    });

    if (request.user_id) {
      await createNotification({
        userId: request.user_id,
        type: 'LEAVE_REFUSED',
        title: 'Leave Request Refused',
        message: `Your ${request.leave_name} request from ${request.start_date} has been refused. Reason: ${approver_comment || 'No reason specified'}`,
        link: '/time-off'
      });
    }

    res.json({
      success: true,
      message: 'Time off request refused.'
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
  createTimeOffType,
  updateTimeOffType,
  getAllocations,
  createAllocation,
  updateAllocation,
  getRequests,
  submitRequest,
  approveRequest,
  refuseRequest,
  cancelRequest
};
