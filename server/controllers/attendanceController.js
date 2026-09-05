// server/controllers/attendanceController.js
const db = require('../database/connection');
const { ATTENDANCE_STATUS, ROLES } = require('../config/constants');
const { logAudit } = require('../services/auditService');

async function getAttendance(req, res, next) {
  try {
    const {
      employee_id,
      department_id,
      status,
      start_date,
      end_date,
      page = 1,
      limit = 30
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = db('attendance as a')
      .join('employees as e', 'a.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .leftJoin('users as u', 'a.corrected_by', 'u.id')
      .select(
        'a.*',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'e.avatar_url',
        'd.name as department_name',
        'd.color as department_color',
        'jp.title as position_title',
        'u.username as corrector_name'
      );

    // If role is employee, restrict to own attendance
    if (req.user.role === ROLES.EMPLOYEE) {
      query = query.where('a.employee_id', req.user.employee_id);
    } else if (employee_id) {
      query = query.where('a.employee_id', employee_id);
    }

    if (department_id) {
      query = query.where('e.department_id', department_id);
    }
    if (status) {
      query = query.where('a.status', status);
    }
    if (start_date) {
      query = query.where('a.date', '>=', start_date);
    }
    if (end_date) {
      query = query.where('a.date', '<=', end_date);
    }

    const countResult = await query.clone().clearSelect().count('a.id as total').first();
    const total = parseInt(countResult.total, 10);

    const records = await query
      .orderBy('a.date', 'desc')
      .limit(parseInt(limit, 10))
      .offset(offset);

    // Also calculate quick summary stats for this query filter
    const stats = await db('attendance as a')
      .join('employees as e', 'a.employee_id', 'e.id')
      .where((builder) => {
        if (req.user.role === ROLES.EMPLOYEE) {
          builder.where('a.employee_id', req.user.employee_id);
        } else if (employee_id) {
          builder.where('a.employee_id', employee_id);
        }
        if (start_date) builder.where('a.date', '>=', start_date);
        if (end_date) builder.where('a.date', '<=', end_date);
      })
      .select(
        db.raw("COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count"),
        db.raw("COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count"),
        db.raw("COUNT(CASE WHEN a.status = 'missing_checkout' THEN 1 END) as missing_checkout_count"),
        db.raw("COUNT(CASE WHEN a.status = 'overtime' THEN 1 END) as overtime_count"),
        db.raw("SUM(a.overtime_hours) as total_overtime_hours"),
        db.raw("SUM(a.worked_hours) as total_worked_hours")
      )
      .first();

    res.json({
      success: true,
      data: records,
      stats: {
        present: parseInt(stats?.present_count || 0, 10),
        late: parseInt(stats?.late_count || 0, 10),
        missingCheckout: parseInt(stats?.missing_checkout_count || 0, 10),
        overtime: parseInt(stats?.overtime_count || 0, 10),
        totalOvertimeHours: parseFloat(stats?.total_overtime_hours || 0),
        totalWorkedHours: parseFloat(stats?.total_worked_hours || 0)
      },
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    next(err);
  }
}

async function checkIn(req, res, next) {
  try {
    const employeeId = req.user.role === ROLES.EMPLOYEE ? req.user.employee_id : req.body.employee_id;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM

    const existing = await db('attendance')
      .where('employee_id', employeeId)
      .where('date', today)
      .first();

    if (existing) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_CHECKED_IN',
        message: 'Attendance record already exists for today.'
      });
    }

    // Determine if late (after 09:15)
    const [hours, minutes] = currentTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const standardStart = 9 * 60 + 15; // 09:15 AM
    const isLate = totalMinutes > standardStart;
    const lateMins = isLate ? totalMinutes - (9 * 60) : 0;

    const [insertId] = await db('attendance').insert({
      employee_id: employeeId,
      date: today,
      check_in: currentTime,
      check_out: null,
      worked_hours: 0,
      expected_hours: 8.0,
      overtime_hours: 0,
      late_minutes: lateMins,
      status: isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT,
      source: 'Web Self-Service'
    });

    const newRecord = await db('attendance').where('id', insertId).first();

    res.status(201).json({
      success: true,
      message: `Checked in successfully at ${currentTime}${isLate ? ` (${lateMins} mins late)` : ''}.`,
      data: newRecord
    });
  } catch (err) {
    next(err);
  }
}

async function checkOut(req, res, next) {
  try {
    const employeeId = req.user.role === ROLES.EMPLOYEE ? req.user.employee_id : req.body.employee_id;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM

    const record = await db('attendance')
      .where('employee_id', employeeId)
      .where('date', today)
      .first();

    if (!record) {
      return res.status(400).json({
        success: false,
        code: 'NO_CHECK_IN_RECORD',
        message: 'No check-in record found for today. Please check in first.'
      });
    }

    if (record.check_out) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_CHECKED_OUT',
        message: `Already checked out at ${record.check_out}.`
      });
    }

    // Calculate worked hours
    const [inH, inM] = record.check_in.split(':').map(Number);
    const [outH, outM] = currentTime.split(':').map(Number);
    const totalWorkedMins = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM) - 60); // minus 1h break
    const workedHours = Math.round((totalWorkedMins / 60) * 10) / 10;
    const overtimeHours = workedHours > 8.0 ? Math.round((workedHours - 8.0) * 10) / 10 : 0;

    let status = record.status;
    if (overtimeHours > 0) {
      status = ATTENDANCE_STATUS.OVERTIME;
    } else if (workedHours < 5) {
      status = ATTENDANCE_STATUS.HALF_DAY;
    }

    await db('attendance')
      .where('id', record.id)
      .update({
        check_out: currentTime,
        worked_hours: workedHours,
        overtime_hours: overtimeHours,
        status: status,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: `Checked out at ${currentTime}. Total worked: ${workedHours}h (Overtime: ${overtimeHours}h).`,
      data: await db('attendance').where('id', record.id).first()
    });
  } catch (err) {
    next(err);
  }
}

async function correctAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const { check_in, check_out, status, correction_reason, date } = req.body;

    if (!correction_reason) {
      return res.status(400).json({
        success: false,
        code: 'REASON_REQUIRED',
        message: 'A detailed correction reason is required for attendance audits.'
      });
    }

    let record = null;
    if (id && id !== 'new') {
      record = await db('attendance').where('id', id).first();
    }

    // Calculate worked hours and overtime
    let workedHours = 8.0;
    let overtimeHours = 0;
    if (check_in && check_out) {
      const [inH, inM] = check_in.split(':').map(Number);
      const [outH, outM] = check_out.split(':').map(Number);
      const totalMins = (outH * 60 + outM) - (inH * 60 + inM) - 60;
      if (totalMins < 0) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_TIMES',
          message: 'Check-out time cannot be earlier than check-in time.'
        });
      }
      workedHours = Math.round((totalMins / 60) * 10) / 10;
      overtimeHours = workedHours > 8.0 ? Math.round((workedHours - 8.0) * 10) / 10 : 0;
    }

    if (record) {
      await db('attendance')
        .where('id', id)
        .update({
          check_in,
          check_out,
          worked_hours: workedHours,
          overtime_hours: overtimeHours,
          status: status || ATTENDANCE_STATUS.MANUAL_CORRECTION,
          corrected_by: req.user.id,
          correction_reason: correction_reason,
          updated_at: new Date()
        });

      await logAudit({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'ATTENDANCE_CORRECTION',
        entity: 'Attendance',
        entityId: id,
        oldValues: JSON.stringify(record),
        newValues: JSON.stringify({ check_in, check_out, worked_hours: workedHours, status }),
        reason: correction_reason,
        ipAddress: req.ip
      });

      return res.json({
        success: true,
        message: 'Attendance record corrected successfully.',
        data: await db('attendance').where('id', id).first()
      });
    } else {
      // Delegate to manual creation
      return createManualAttendance(req, res, next);
    }
  } catch (err) {
    next(err);
  }
}

async function createManualAttendance(req, res, next) {
  try {
    const { employee_id, date, check_in, check_out, status, correction_reason } = req.body;

    if (!employee_id || !date) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'employee_id and date are required.'
      });
    }

    let workedHours = 8.0;
    let overtimeHours = 0;
    if (check_in && check_out) {
      const [inH, inM] = check_in.split(':').map(Number);
      const [outH, outM] = check_out.split(':').map(Number);
      const totalMins = (outH * 60 + outM) - (inH * 60 + inM) - 60;
      if (totalMins < 0) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_TIMES',
          message: 'Check-out time cannot be earlier than check-in time.'
        });
      }
      workedHours = Math.round((totalMins / 60) * 10) / 10;
      overtimeHours = workedHours > 8.0 ? Math.round((workedHours - 8.0) * 10) / 10 : 0;
    }

    const [insertId] = await db('attendance').insert({
      employee_id,
      date,
      check_in: check_in || '09:00',
      check_out: check_out || '18:00',
      worked_hours: workedHours,
      expected_hours: 8.0,
      overtime_hours: overtimeHours,
      status: status || ATTENDANCE_STATUS.MANUAL_CORRECTION,
      source: 'Manual HR Entry',
      corrected_by: req.user.id,
      correction_reason: correction_reason || 'Manual entry by HR'
    });

    const newRecord = await db('attendance').where('id', insertId).first();

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'MANUAL_ATTENDANCE_ENTRY',
      entity: 'Attendance',
      entityId: String(insertId),
      newValues: JSON.stringify({ employee_id, date, check_in, check_out }),
      reason: correction_reason || 'Manual entry by HR',
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Manual attendance record created.',
      data: newRecord
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAttendance,
  checkIn,
  checkOut,
  correctAttendance,
  createManualAttendance
};
