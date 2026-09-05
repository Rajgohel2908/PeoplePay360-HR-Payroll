// server/controllers/scheduleController.js
const db = require('../database/connection');
const { logAudit } = require('../services/auditService');

async function getSchedules(req, res, next) {
  try {
    const schedules = await db('working_schedules');

    for (const s of schedules) {
      const days = await db('schedule_days')
        .where('schedule_id', s.id)
        .orderBy('id', 'asc');
      s.days = days;
    }

    res.json({
      success: true,
      data: schedules
    });
  } catch (err) {
    next(err);
  }
}

async function getScheduleById(req, res, next) {
  try {
    const { id } = req.params;
    const schedule = await db('working_schedules').where('id', id).first();

    if (!schedule) {
      return res.status(404).json({
        success: false,
        code: 'SCHEDULE_NOT_FOUND',
        message: 'Working schedule not found.'
      });
    }

    const days = await db('schedule_days').where('schedule_id', id);
    schedule.days = days;

    res.json({
      success: true,
      data: schedule
    });
  } catch (err) {
    next(err);
  }
}

async function createSchedule(req, res, next) {
  try {
    const { name, schedule_type, timezone, days } = req.body;

    let totalWeeklyHours = 0;
    if (days && Array.isArray(days)) {
      days.forEach(d => {
        if (d.is_working) {
          totalWeeklyHours += parseFloat(d.expected_hours || 8.0);
        }
      });
    } else {
      totalWeeklyHours = 40.0;
    }

    const [newId] = await db('working_schedules').insert({
      name,
      schedule_type: schedule_type || 'standard',
      timezone: timezone || 'Asia/Kolkata',
      weekly_hours: totalWeeklyHours
    }).returning('id');

    const scheduleDbId = newId?.id || newId;

    if (days && Array.isArray(days)) {
      for (const d of days) {
        await db('schedule_days').insert({
          schedule_id: scheduleDbId,
          day_of_week: d.day_of_week.toLowerCase(),
          is_working: d.is_working,
          start_time: d.start_time || '09:00',
          end_time: d.end_time || '18:00',
          break_duration_mins: d.break_duration_mins || 60,
          expected_hours: d.is_working ? parseFloat(d.expected_hours || 8.0) : 0
        });
      }
    }

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'CREATE_SCHEDULE',
      entity: 'Schedule',
      entityId: scheduleDbId,
      newValues: JSON.stringify({ name, weekly_hours: totalWeeklyHours }),
      reason: 'Created new working schedule',
      ipAddress: req.ip
    });

    const result = await db('working_schedules').where('id', scheduleDbId).first();
    result.days = await db('schedule_days').where('schedule_id', scheduleDbId);

    res.status(201).json({
      success: true,
      message: 'Working schedule created successfully.',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSchedules,
  getScheduleById,
  createSchedule
};
