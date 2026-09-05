// server/payroll/validator.js
const db = require('../database/connection');
const { VALIDATION_SEVERITY, VALIDATION_CATEGORY } = require('../config/constants');

/**
 * Executes comprehensive pre-flight payroll validations for a payrun.
 * @param {number} payrunId
 * @returns {Promise<{issues: Array, hasBlockers: boolean, blockersCount: number, warningsCount: number, infoCount: number}>}
 */
async function runPayrollPreFlightChecks(payrunId) {
  const payrun = await db('payruns').where('id', payrunId).first();
  if (!payrun) {
    throw new Error('Payrun not found.');
  }

  // Clear existing unresolved validation issues for this payrun to recalculate
  await db('payroll_validation_issues')
    .where('payrun_id', payrunId)
    .where('is_resolved', false)
    .del();

  const issues = [];

  // 1. Fetch all included employees in this payrun
  const payrunEmployees = await db('payrun_employees as pe')
    .join('employees as e', 'pe.employee_id', 'e.id')
    .select('pe.*', 'e.employee_id as emp_code', 'e.first_name', 'e.last_name', 'e.bank_name', 'e.account_number', 'e.ifsc_code', 'e.pan_number', 'e.employment_status')
    .where('pe.payrun_id', payrunId)
    .where('pe.is_included', true);

  for (const pe of payrunEmployees) {
    const fullName = `${pe.first_name} ${pe.last_name}`;

    // A. BANK / PAYMENT VALIDATION
    if (!pe.account_number || !pe.ifsc_code || !pe.bank_name) {
      issues.push({
        payrun_id: payrunId,
        employee_id: pe.employee_id,
        category: VALIDATION_CATEGORY.BANK,
        severity: VALIDATION_SEVERITY.BLOCKER,
        title: 'Missing Bank Account Details',
        description: `${fullName} (${pe.emp_code}) is missing essential bank details (Account: ${pe.account_number || 'N/A'}, IFSC: ${pe.ifsc_code || 'N/A'}).`,
        impact: 'Payment cannot be disbursed via electronic bank transfer or NEFT/IMPS.',
        recommended_action: 'Update bank name, account number, and IFSC in Employee 360 profile.',
        is_resolved: false
      });
    }

    // B. CONTRACT VALIDATION
    const contracts = await db('contracts')
      .where('employee_id', pe.employee_id)
      .where('status', '!=', 'draft')
      .andWhere((builder) => {
        builder.where('start_date', '<=', payrun.period_end)
          .andWhere((inner) => {
            inner.whereNull('end_date').orWhere('end_date', '>=', payrun.period_start);
          });
      });

    if (!contracts || contracts.length === 0) {
      issues.push({
        payrun_id: payrunId,
        employee_id: pe.employee_id,
        category: VALIDATION_CATEGORY.CONTRACT,
        severity: VALIDATION_SEVERITY.BLOCKER,
        title: 'Missing Active Contract for Period',
        description: `No valid employment contract found for ${fullName} covering period ${payrun.period_start} to ${payrun.period_end}.`,
        impact: 'Calculations cannot resolve wage, salary structure, or working schedule.',
        recommended_action: 'Create or renew employment contract in Contract Management.',
        is_resolved: false
      });
    } else {
      const activeContracts = contracts.filter(c => c.status === 'active');
      if (activeContracts.length === 0) {
        issues.push({
          payrun_id: payrunId,
          employee_id: pe.employee_id,
          category: VALIDATION_CATEGORY.CONTRACT,
          severity: VALIDATION_SEVERITY.BLOCKER,
          title: 'Contract Expired',
          description: `Contract for ${fullName} is marked as expired.`,
          impact: 'Payroll cannot disburse wages under an expired contract.',
          recommended_action: 'Renew contract or create a new active contract.',
          is_resolved: false
        });
      } else if (activeContracts.length > 1) {
        issues.push({
          payrun_id: payrunId,
          employee_id: pe.employee_id,
          category: VALIDATION_CATEGORY.CONTRACT,
          severity: VALIDATION_SEVERITY.WARNING,
          title: 'Overlapping Active Contracts Found',
          description: `${fullName} has ${activeContracts.length} overlapping active contracts.`,
          impact: 'System will default to the most recent contract.',
          recommended_action: 'Close or adjust the previous contract end date.',
          is_resolved: false
        });
      }
    }

    // C. ATTENDANCE VALIDATION
    const missingCheckouts = await db('attendance')
      .where('employee_id', pe.employee_id)
      .whereBetween('date', [payrun.period_start, payrun.period_end])
      .where('status', 'missing_checkout');

    if (missingCheckouts && missingCheckouts.length > 0) {
      issues.push({
        payrun_id: payrunId,
        employee_id: pe.employee_id,
        category: VALIDATION_CATEGORY.ATTENDANCE,
        severity: VALIDATION_SEVERITY.WARNING,
        title: `${missingCheckouts.length} Unresolved Missing Checkout(s)`,
        description: `${fullName} has missing check-outs on: ${missingCheckouts.map(m => m.date).join(', ')}.`,
        impact: 'Hours for those days are treated as 0 unless corrected.',
        recommended_action: 'Submit or approve Attendance Correction in Attendance Module.',
        is_resolved: false
      });
    }

    const highOvertime = await db('attendance')
      .where('employee_id', pe.employee_id)
      .whereBetween('date', [payrun.period_start, payrun.period_end])
      .sum('overtime_hours as total_ot')
      .first();

    if (highOvertime && parseFloat(highOvertime.total_ot || 0) > 15) {
      issues.push({
        payrun_id: payrunId,
        employee_id: pe.employee_id,
        category: VALIDATION_CATEGORY.ATTENDANCE,
        severity: VALIDATION_SEVERITY.INFO,
        title: 'High Overtime Logged (>15 Hours)',
        description: `${fullName} logged ${highOvertime.total_ot} hours of overtime in this period.`,
        impact: 'Increased overtime payout in gross earnings.',
        recommended_action: 'Verify with department manager.',
        is_resolved: true
      });
    }

    // D. TIME OFF VALIDATION
    const pendingLeaves = await db('time_off_requests')
      .where('employee_id', pe.employee_id)
      .where('status', 'submitted')
      .andWhere((builder) => {
        builder.where('start_date', '<=', payrun.period_end)
          .andWhere('end_date', '>=', payrun.period_start);
      });

    if (pendingLeaves && pendingLeaves.length > 0) {
      issues.push({
        payrun_id: payrunId,
        employee_id: pe.employee_id,
        category: VALIDATION_CATEGORY.TIME_OFF,
        severity: VALIDATION_SEVERITY.WARNING,
        title: `${pendingLeaves.length} Pending Leave Request(s)`,
        description: `${fullName} has unapproved leave requests during this cycle.`,
        impact: 'Pending leaves are not yet included in paid days calculation.',
        recommended_action: 'Approve or refuse pending leave requests before final payroll run.',
        is_resolved: false
      });
    }

    // E. EMPLOYEE DATA VALIDATION
    if (!pe.pan_number) {
      issues.push({
        payrun_id: payrunId,
        employee_id: pe.employee_id,
        category: VALIDATION_CATEGORY.EMPLOYEE,
        severity: VALIDATION_SEVERITY.INFO,
        title: 'Missing PAN / Tax ID',
        description: `${fullName} does not have a registered PAN number.`,
        impact: 'Statutory tax deductions may be subject to higher rate.',
        recommended_action: 'Request employee to provide PAN card details.',
        is_resolved: false
      });
    }
  }

  // F. DUPLICATE CHECK
  const existingOtherPayruns = await db('payslips as ps')
    .join('payruns as pr', 'ps.payrun_id', 'pr.id')
    .select('ps.employee_id')
    .where('ps.period_start', payrun.period_start)
    .where('ps.period_end', payrun.period_end)
    .where('ps.payrun_id', '!=', payrunId)
    .whereIn('pr.status', ['approved', 'paid']);

  if (existingOtherPayruns.length > 0) {
    const dupEmpIds = existingOtherPayruns.map(e => e.employee_id);
    for (const dId of dupEmpIds) {
      issues.push({
        payrun_id: payrunId,
        employee_id: dId,
        category: VALIDATION_CATEGORY.DUPLICATE,
        severity: VALIDATION_SEVERITY.BLOCKER,
        title: 'Duplicate Payslip in Finalized Payrun',
        description: `Employee has already been paid for period ${payrun.period_start} to ${payrun.period_end} in another payrun.`,
        impact: 'Risk of duplicate wage payment.',
        recommended_action: 'Exclude employee from this payrun or cancel duplicate payslip.',
        is_resolved: false
      });
    }
  }

  // Save new validation issues to DB
  if (issues.length > 0) {
    await db('payroll_validation_issues').insert(issues);
  }

  const allIssues = await db('payroll_validation_issues')
    .where('payrun_id', payrunId);

  const blockersCount = allIssues.filter(i => i.severity === VALIDATION_SEVERITY.BLOCKER && !i.is_resolved).length;
  const warningsCount = allIssues.filter(i => i.severity === VALIDATION_SEVERITY.WARNING && !i.is_resolved).length;
  const infoCount = allIssues.filter(i => i.severity === VALIDATION_SEVERITY.INFO).length;

  return {
    issues: allIssues,
    hasBlockers: blockersCount > 0,
    blockersCount,
    warningsCount,
    infoCount
  };
}

module.exports = { runPayrollPreFlightChecks };
