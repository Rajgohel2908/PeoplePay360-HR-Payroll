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
      limit = 10
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

    const formattedRecords = records.map((rec) => {
      const { sessions } = parseSessions(rec.notes, rec.check_in, rec.check_out);
      return {
        ...rec,
        sessions
      };
    });

    res.json({
      success: true,
      data: formattedRecords,
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

/**
 * Helper: parse sessions from notes JSON or fallback to check_in/check_out columns
 */
function parseSessions(notesStr, defaultCheckIn, defaultCheckOut) {
  let sessions = [];
  let userNotes = '';
  if (notesStr) {
    try {
      const parsed = JSON.parse(notesStr);
      if (Array.isArray(parsed?.sessions)) {
        sessions = parsed.sessions;
        userNotes = parsed.userNotes || '';
      } else {
        userNotes = typeof notesStr === 'string' ? notesStr : '';
      }
    } catch (e) {
      userNotes = typeof notesStr === 'string' ? notesStr : '';
    }
  }
  if (sessions.length === 0 && defaultCheckIn) {
    sessions.push({ in: defaultCheckIn, out: defaultCheckOut || null });
  }
  return { sessions, userNotes };
}

/**
 * Helper: calculate duration between two HH:MM strings in minutes
 */
function calculateSessionMinutes(inTime, outTime) {
  if (!inTime || !outTime) return 0;
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  let diff = (outH * 60 + outM) - (inH * 60 + inM);
  if (diff < 0) diff += 24 * 60;
  return Math.max(0, diff);
}

/**
 * Helper: calculate total accumulated hours from closed sessions
 */
function calculateTotalWorkedHours(sessions) {
  const totalMins = sessions.reduce((acc, s) => {
    return s.out ? acc + calculateSessionMinutes(s.in, s.out) : acc;
  }, 0);
  return Math.round((totalMins / 60) * 10) / 10;
}

/**
 * Returns today's active session and attendance status for the current employee
 */
async function getTodayAttendance(req, res, next) {
  try {
    const employeeId = req.query.employee_id || req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        code: 'EMPLOYEE_REQUIRED',
        message: 'No employee ID associated with this account or request.'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const record = await db('attendance')
      .where('employee_id', employeeId)
      .where('date', today)
      .first();

    if (!record) {
      return res.json({
        success: true,
        data: {
          date: today,
          hasRecord: false,
          isCheckedIn: false,
          currentSession: null,
          firstCheckIn: null,
          latestCheckOut: null,
          totalWorkedHours: 0,
          overtimeHours: 0,
          sessions: [],
          record: null
        }
      });
    }

    const { sessions } = parseSessions(record.notes, record.check_in, record.check_out);
    const activeSession = sessions.find(s => !s.out);

    return res.json({
      success: true,
      data: {
        date: today,
        hasRecord: true,
        isCheckedIn: !!activeSession,
        currentSession: activeSession || null,
        firstCheckIn: record.check_in,
        latestCheckOut: record.check_out,
        totalWorkedHours: parseFloat(record.worked_hours || 0),
        overtimeHours: parseFloat(record.overtime_hours || 0),
        status: record.status,
        sessions,
        record
      }
    });
  } catch (err) {
    next(err);
  }
}

async function checkIn(req, res, next) {
  try {
    const employeeId = req.body.employee_id || req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        code: 'EMPLOYEE_REQUIRED',
        message: 'No employee ID associated with this account or request.'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM

    const existing = await db('attendance')
      .where('employee_id', employeeId)
      .where('date', today)
      .first();

    if (!existing) {
      // First check-in of the day
      const [hours, minutes] = currentTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      const standardStart = 9 * 60 + 15; // 09:15 AM
      const isLate = totalMinutes > standardStart;
      const lateMins = isLate ? totalMinutes - (9 * 60) : 0;

      const initialSessions = [{ in: currentTime, out: null }];
      const notesPayload = JSON.stringify({
        sessions: initialSessions,
        userNotes: ''
      });

      const [newId] = await db('attendance').insert({
        employee_id: employeeId,
        date: today,
        check_in: currentTime,
        check_out: null,
        worked_hours: 0,
        expected_hours: 8.0,
        overtime_hours: 0,
        late_minutes: lateMins,
        status: isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT,
        source: 'Web Self-Service',
        notes: notesPayload
      }).returning('id');

      const recordId = newId?.id || newId;
      const createdRecord = await db('attendance').where('id', recordId).first();

      return res.status(201).json({
        success: true,
        message: `Checked in successfully at ${currentTime}${isLate ? ` (${lateMins} mins late)` : ''}.`,
        data: {
          ...createdRecord,
          sessions: initialSessions,
          isCheckedIn: true
        }
      });
    }

    // Existing record exists for today
    const { sessions, userNotes } = parseSessions(existing.notes, existing.check_in, existing.check_out);
    const activeSession = sessions.find(s => !s.out);

    if (activeSession) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_CHECKED_IN',
        message: `Already checked in at ${activeSession.in}. Please check out before starting a new session.`
      });
    }

    // Add new session for re-checkin
    sessions.push({ in: currentTime, out: null });
    const notesPayload = JSON.stringify({ sessions, userNotes });

    await db('attendance')
      .where('id', existing.id)
      .update({
        check_out: null, // actively in progress
        notes: notesPayload,
        status: existing.status === ATTENDANCE_STATUS.MISSING_CHECKOUT ? ATTENDANCE_STATUS.PRESENT : existing.status,
        updated_at: new Date()
      });

    const updatedRecord = await db('attendance').where('id', existing.id).first();

    return res.json({
      success: true,
      message: `Checked in again at ${currentTime} (Session #${sessions.length}). Worked so far today: ${existing.worked_hours || 0}h.`,
      data: {
        ...updatedRecord,
        sessions,
        isCheckedIn: true
      }
    });
  } catch (err) {
    next(err);
  }
}

async function checkOut(req, res, next) {
  try {
    const employeeId = req.body.employee_id || req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        code: 'EMPLOYEE_REQUIRED',
        message: 'No employee ID associated with this account or request.'
      });
    }

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

    const { sessions, userNotes } = parseSessions(record.notes, record.check_in, record.check_out);
    const activeSessionIndex = sessions.findIndex(s => !s.out);

    if (activeSessionIndex === -1) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_CHECKED_OUT',
        message: `Already checked out at ${record.check_out || 'earlier'}. Click Check In to start a new session.`
      });
    }

    // Close the active session
    sessions[activeSessionIndex].out = currentTime;
    const sessionMins = calculateSessionMinutes(sessions[activeSessionIndex].in, currentTime);
    const sessionHours = Math.round((sessionMins / 60) * 10) / 10;

    // Recalculate total worked hours across all sessions completed today
    const workedHours = calculateTotalWorkedHours(sessions);
    const expectedHours = parseFloat(record.expected_hours || 8.0);
    const overtimeHours = workedHours > expectedHours ? Math.round((workedHours - expectedHours) * 10) / 10 : 0;

    let status = record.status;
    if (overtimeHours > 0) {
      status = ATTENDANCE_STATUS.OVERTIME;
    } else if (workedHours < 5.0) {
      status = ATTENDANCE_STATUS.HALF_DAY;
    } else {
      status = record.late_minutes > 0 ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT;
    }

    const notesPayload = JSON.stringify({ sessions, userNotes });

    await db('attendance')
      .where('id', record.id)
      .update({
        check_out: currentTime, // latest checkout time
        worked_hours: workedHours,
        overtime_hours: overtimeHours,
        status: status,
        notes: notesPayload,
        updated_at: new Date()
      });

    const updatedRecord = await db('attendance').where('id', record.id).first();

    return res.json({
      success: true,
      message: `Checked out at ${currentTime}. Session: ${sessionHours}h. Total worked today: ${workedHours}h (Overtime: ${overtimeHours}h).`,
      data: {
        ...updatedRecord,
        sessions,
        isCheckedIn: false
      }
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
      const correctionNotes = JSON.stringify({
        sessions: check_in && check_out ? [{ in: check_in, out: check_out }] : [],
        userNotes: correction_reason
      });

      await db('attendance')
        .where('id', id)
        .update({
          check_in,
          check_out,
          worked_hours: workedHours,
          overtime_hours: overtimeHours,
          status: status || ATTENDANCE_STATUS.MANUAL_CORRECTION,
          notes: correctionNotes,
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
      // Manual new entry
      const employeeId = req.body.employee_id;
      const correctionNotes = JSON.stringify({
        sessions: check_in && check_out ? [{ in: check_in, out: check_out }] : [],
        userNotes: correction_reason
      });

      const [newId] = await db('attendance').insert({
        employee_id: employeeId,
        date: date,
        check_in,
        check_out,
        worked_hours: workedHours,
        expected_hours: 8.0,
        overtime_hours: overtimeHours,
        status: status || ATTENDANCE_STATUS.PRESENT,
        source: 'Manual HR Entry',
        notes: correctionNotes,
        corrected_by: req.user.id,
        correction_reason: correction_reason
      }).returning('id');

      await logAudit({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'MANUAL_ATTENDANCE_ENTRY',
        entity: 'Attendance',
        entityId: newId?.id || newId,
        newValues: JSON.stringify({ employeeId, date, check_in, check_out }),
        reason: correction_reason,
        ipAddress: req.ip
      });

      return res.status(201).json({
        success: true,
        message: 'Manual attendance record created.',
        data: await db('attendance').where('id', newId?.id || newId).first()
      });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAttendance,
  getTodayAttendance,
  checkIn,
  checkOut,
  correctAttendance
};
