// server/payroll/varianceDetector.js
const db = require('../database/connection');

/**
 * Detects payroll anomalies and variances by comparing current payslips against previous cycle.
 * @param {number} payrunId
 * @returns {Promise<Array>}
 */
async function detectPayrollVariances(payrunId) {
  const currentPayrun = await db('payruns').where('id', payrunId).first();
  if (!currentPayrun) return [];

  // Clear previous variance records for this payrun
  await db('payroll_variances').where('payrun_id', payrunId).del();

  // Find the immediate preceding payrun
  const previousPayrun = await db('payruns')
    .where('period_end', '<', currentPayrun.period_start)
    .whereIn('status', ['paid', 'approved', 'computed', 'validation_required'])
    .orderBy('period_end', 'desc')
    .first();

  const currentPayslips = await db('payslips')
    .where('payrun_id', payrunId);

  const variances = [];
  const thresholdPercent = 15.0; // 15% change trigger

  for (const curr of currentPayslips) {
    let prevNet = 0;
    let prevPayrunId = null;

    if (previousPayrun) {
      const prevSlip = await db('payslips')
        .where('payrun_id', previousPayrun.id)
        .where('employee_id', curr.employee_id)
        .first();

      if (prevSlip) {
        prevNet = parseFloat(prevSlip.net_salary || 0);
        prevPayrunId = previousPayrun.id;
      }
    }

    const currNet = parseFloat(curr.net_salary || 0);
    const deltaAmount = currNet - prevNet;
    let deltaPercentage = 0;

    if (prevNet > 0) {
      deltaPercentage = Math.round(((deltaAmount / prevNet) * 100) * 10) / 10;
    } else if (currNet > 0) {
      deltaPercentage = 100.0;
    }

    const isFlagged = Math.abs(deltaPercentage) >= thresholdPercent || currNet <= 0;

    let reason = 'Normal variance within allowable limits';
    let category = 'Standard';

    if (currNet <= 0) {
      reason = 'Zero or Negative Net Salary detected';
      category = 'Zero Net Pay';
    } else if (deltaPercentage >= 30) {
      reason = `Significant salary increase (+${deltaPercentage}%) - possible promotion, overtime spike, or merit revision`;
      category = 'Major Increase';
    } else if (deltaPercentage <= -20) {
      reason = `Significant salary decrease (${deltaPercentage}%) - possible excessive LOP, unpaid leave, or deduction change`;
      category = 'Major Decrease';
    } else if (deltaPercentage >= thresholdPercent) {
      reason = `Moderate salary increase (+${deltaPercentage}%) above threshold`;
      category = 'Moderate Increase';
    } else if (deltaPercentage <= -thresholdPercent) {
      reason = `Moderate salary decrease (${deltaPercentage}%) above threshold`;
      category = 'Moderate Decrease';
    }

    const record = {
      payrun_id: payrunId,
      employee_id: curr.employee_id,
      prev_payrun_id: prevPayrunId,
      prev_net: prevNet,
      curr_net: currNet,
      delta_amount: deltaAmount,
      delta_percentage: deltaPercentage,
      variance_category: category,
      variance_reason: reason,
      is_flagged: isFlagged
    };

    variances.push(record);
  }

  if (variances.length > 0) {
    await db('payroll_variances').insert(variances);
  }

  return variances;
}

module.exports = { detectPayrollVariances };
