// server/payroll/leaveCalculator.js
const db = require('../database/connection');
const { TIME_OFF_STATUS } = require('../config/constants');

/**
 * Calculates approved leave days (paid vs unpaid / LOP) for an employee in a payroll period.
 * @param {number} employeeId
 * @param {string} periodStart
 * @param {string} periodEnd
 * @returns {Promise<{approvedPaidLeaveDays: number, unpaidLeaveDays: number, pendingRequestsCount: number, leaveRequests: Array}>}
 */
async function calculateLeaveSummary(employeeId, periodStart, periodEnd) {
  // Query all leave requests that overlap with the payroll period
  const requests = await db('time_off_requests as r')
    .join('time_off_types as t', 'r.leave_type_id', 't.id')
    .select(
      'r.*',
      't.name as leave_type_name',
      't.code as leave_type_code',
      't.paid as is_paid'
    )
    .where('r.employee_id', employeeId)
    .andWhere((builder) => {
      builder.where('r.start_date', '<=', periodEnd)
        .andWhere('r.end_date', '>=', periodStart);
    });

  let approvedPaidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let pendingRequestsCount = 0;

  for (const req of requests) {
    if (req.status === TIME_OFF_STATUS.APPROVED) {
      if (req.is_paid) {
        approvedPaidLeaveDays += parseFloat(req.duration_days);
      } else {
        unpaidLeaveDays += parseFloat(req.duration_days);
      }
    } else if (req.status === TIME_OFF_STATUS.SUBMITTED) {
      pendingRequestsCount += 1;
    }
  }

  return {
    approvedPaidLeaveDays,
    unpaidLeaveDays,
    pendingRequestsCount,
    leaveRequests: requests
  };
}

module.exports = { calculateLeaveSummary };
