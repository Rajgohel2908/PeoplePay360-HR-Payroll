// server/payroll/attendanceCalculator.js
const db = require('../database/connection');
const { ATTENDANCE_STATUS } = require('../config/constants');

/**
 * Computes attendance summary for an employee over a payroll period.
 * @param {number} employeeId
 * @param {string} periodStart (YYYY-MM-DD)
 * @param {string} periodEnd (YYYY-MM-DD)
 * @returns {Promise<{workedDays: number, totalWorkedHours: number, totalOvertimeHours: number, lateMinutes: number, missingCheckouts: number, recordsCount: number}>}
 */
async function calculateAttendanceSummary(employeeId, periodStart, periodEnd, dbOrTrx = db) {
  const records = await dbOrTrx('attendance')
    .where('employee_id', employeeId)
    .whereBetween('date', [periodStart, periodEnd]);

  let workedDays = 0;
  let totalWorkedHours = 0;
  let totalOvertimeHours = 0;
  let lateMinutes = 0;
  let missingCheckouts = 0;

  for (const rec of records) {
    if (rec.status === ATTENDANCE_STATUS.PRESENT || rec.status === ATTENDANCE_STATUS.LATE || rec.status === ATTENDANCE_STATUS.OVERTIME || rec.status === ATTENDANCE_STATUS.MANUAL_CORRECTION) {
      workedDays += 1;
      totalWorkedHours += parseFloat(rec.worked_hours || 0);
      totalOvertimeHours += parseFloat(rec.overtime_hours || 0);
      lateMinutes += parseInt(rec.late_minutes || 0, 10);
    } else if (rec.status === ATTENDANCE_STATUS.HALF_DAY) {
      workedDays += 0.5;
      totalWorkedHours += parseFloat(rec.worked_hours || 4);
    } else if (rec.status === ATTENDANCE_STATUS.MISSING_CHECKOUT) {
      missingCheckouts += 1;
    }
  }

  return {
    workedDays,
    totalWorkedHours,
    totalOvertimeHours,
    lateMinutes,
    missingCheckouts,
    recordsCount: records.length
  };
}

module.exports = { calculateAttendanceSummary };
