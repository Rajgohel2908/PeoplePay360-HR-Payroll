// server/payroll/scheduleCalculator.js
const db = require('../database/connection');

/**
 * Calculates expected working days and hours for an employee schedule in a given period.
 * @param {number} scheduleId
 * @param {string} periodStart (YYYY-MM-DD)
 * @param {string} periodEnd (YYYY-MM-DD)
 * @returns {Promise<{expectedWorkingDays: number, expectedHours: number, totalCalendarDays: number}>}
 */
async function calculateExpectedSchedule(scheduleId, periodStart, periodEnd) {
  const scheduleDays = await db('schedule_days')
    .where('schedule_id', scheduleId);

  const dayMap = {};
  scheduleDays.forEach(sd => {
    dayMap[sd.day_of_week.toLowerCase()] = sd;
  });

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  let totalCalendarDays = 0;
  let expectedWorkingDays = 0;
  let expectedHours = 0;

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    totalCalendarDays++;
    const dayName = dayNames[d.getDay()];
    const config = dayMap[dayName];

    if (config && config.is_working) {
      expectedWorkingDays++;
      expectedHours += parseFloat(config.expected_hours || 8.0);
    }
  }

  // Fallback if no specific schedule records
  if (expectedWorkingDays === 0) {
    expectedWorkingDays = 22;
    expectedHours = 22 * 8.0;
  }

  return {
    expectedWorkingDays,
    expectedHours,
    totalCalendarDays: totalCalendarDays || 30
  };
}

module.exports = { calculateExpectedSchedule };
