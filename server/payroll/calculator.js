// server/payroll/calculator.js
const db = require('../database/connection');
const { resolveContractForPeriod } = require('./contractResolver');
const { calculateExpectedSchedule } = require('./scheduleCalculator');
const { calculateAttendanceSummary } = require('./attendanceCalculator');
const { calculateLeaveSummary } = require('./leaveCalculator');
const { executeSalaryRules } = require('./salaryRuleEngine');
const { runPayrollPreFlightChecks } = require('./validator');
const { detectPayrollVariances } = require('./varianceDetector');
const { PAYRUN_STATUS } = require('../config/constants');

/**
 * Computes the complete payroll for a given payrun ID within a safe database transaction.
 * @param {number} payrunId
 * @param {number} userId (User triggering computation)
 * @returns {Promise<{payrun: object, payslipsCount: number, validationSummary: object, variancesCount: number}>}
 */
async function computePayrun(payrunId, userId) {
  const payrun = await db('payruns').where('id', payrunId).first();
  if (!payrun) {
    throw new Error('Payrun not found.');
  }

  if (payrun.status === PAYRUN_STATUS.PAID || payrun.status === PAYRUN_STATUS.ARCHIVED) {
    throw new Error('Cannot recompute a finalized or paid payrun.');
  }

  return await db.transaction(async (trx) => {
    // 1. Fetch eligible/included employees for this payrun
    const payrunEmployees = await trx('payrun_employees as pe')
      .join('employees as e', 'pe.employee_id', 'e.id')
      .select('pe.*', 'e.employee_id as emp_code', 'e.first_name', 'e.last_name', 'e.schedule_id as emp_schedule_id')
      .where('pe.payrun_id', payrunId)
      .where('pe.is_included', true);

    if (payrunEmployees.length === 0) {
      throw new Error('No included employees selected for this payrun.');
    }

    // Auto-update expired contracts before calculating
    await trx('contracts')
      .where('status', 'active')
      .whereNotNull('end_date')
      .where('end_date', '<', payrun.period_start)
      .update({ status: 'expired', updated_at: new Date() });

    // 2. Remove existing generated payslips for this payrun if recomputing
    const existingPayslips = await trx('payslips').where('payrun_id', payrunId).select('id');
    const existingPayslipIds = existingPayslips.map(p => p.id);
    if (existingPayslipIds.length > 0) {
      await trx('payslip_lines').whereIn('payslip_id', existingPayslipIds).del();
      await trx('payslips').where('payrun_id', payrunId).del();
    }

    let overallGross = 0;
    let overallDeductions = 0;
    let overallNet = 0;
    let overallOvertime = 0;
    let overallLop = 0;
    let payslipsCreatedCount = 0;

    for (const pe of payrunEmployees) {
      try {
        // Step A: Resolve Contract for period
      const { contract, error: contractError } = await resolveContractForPeriod(
        pe.employee_id,
        payrun.period_start,
        payrun.period_end
      );

      // Default wage / structure fallback if contract missing or custom structure selected on payrun
      const contractId = contract ? contract.id : pe.contract_id;
      const wage = contract ? parseFloat(contract.wage) : 50000;
      const structureId = payrun.salary_structure_id || (contract ? contract.salary_structure_id : 1);
      const scheduleId = contract?.working_schedule_id || pe.emp_schedule_id || 1;

      // Step B: Calculate Schedule (expected days/hours)
      const scheduleSummary = await calculateExpectedSchedule(
        scheduleId,
        payrun.period_start,
        payrun.period_end
      );

      // Step C: Calculate Attendance Summary
      const attSummary = await calculateAttendanceSummary(
        pe.employee_id,
        payrun.period_start,
        payrun.period_end
      );

      // Step D: Calculate Leave Summary
      const leaveSummary = await calculateLeaveSummary(
        pe.employee_id,
        payrun.period_start,
        payrun.period_end
      );

      // Step E: Determine payable vs unpaid days
      // If attendance records exist, worked days = attSummary.workedDays
      // Else default to expected schedule minus unpaid leaves
      const workedDays = attSummary.recordsCount > 0 
        ? attSummary.workedDays 
        : Math.max(0, scheduleSummary.expectedWorkingDays - leaveSummary.unpaidLeaveDays);

      const paidLeaveDays = leaveSummary.approvedPaidLeaveDays;
      const unpaidDays = leaveSummary.unpaidLeaveDays;
      const paidDays = workedDays + paidLeaveDays;
      const overtimeHours = attSummary.totalOvertimeHours;

      // Step F: Load Salary Rules for the structure
      const rules = await trx('salary_rules')
        .where('structure_id', structureId)
        .where('is_active', true)
        .orderBy('sequence', 'asc');

      // Step G: Base calculation parameters
      const baseParams = {
        WAGE: wage,
        TOTAL_DAYS: scheduleSummary.totalCalendarDays,
        EXPECTED_DAYS: scheduleSummary.expectedWorkingDays,
        EXPECTED_HOURS: scheduleSummary.expectedHours,
        WORKED_DAYS: workedDays,
        PAID_DAYS: paidDays,
        UNPAID_DAYS: unpaidDays,
        OVERTIME_HOURS: overtimeHours
      };

      // Step H: Execute Rules Sequentially
      const ruleResult = executeSalaryRules(rules, baseParams);

      const payslipNumber = `PS-${payrun.payrun_number}-${pe.emp_code}`;

      // Step I: Insert Payslip (MySQL: no .returning(), fetch ID via payslip_number)
      await trx('payslips').insert({
        payslip_number: payslipNumber,
        payrun_id: payrunId,
        employee_id: pe.employee_id,
        contract_id: contractId,
        salary_structure_id: structureId,
        period_start: payrun.period_start,
        period_end: payrun.period_end,
        worked_days: workedDays,
        paid_days: paidDays,
        unpaid_days: unpaidDays,
        overtime_hours: overtimeHours,
        gross_salary: ruleResult.gross,
        total_deductions: ruleResult.deductions,
        net_salary: ruleResult.net,
        payment_status: 'Unpaid',
        email_status: 'Pending'
      });

      const insertedPayslip = await trx('payslips').where('payslip_number', payslipNumber).first();
      const payslipDbId = insertedPayslip.id;

      payslipsCreatedCount++;

      // Step J: Insert Payslip Breakdown Lines
      if (ruleResult.lines && ruleResult.lines.length > 0) {
        const linesToInsert = ruleResult.lines.map(line => ({
          payslip_id: payslipDbId,
          rule_id: line.rule_id,
          rule_name: line.rule_name,
          rule_code: line.rule_code,
          category: line.category,
          sequence: line.sequence,
          calculation_type: line.calculation_type,
          base_amount: line.base_amount,
          rate: line.rate,
          amount: line.amount,
          note: line.note
        }));
        await trx('payslip_lines').insert(linesToInsert);
      }

      overallGross += ruleResult.gross;
      overallDeductions += ruleResult.deductions;
      overallNet += ruleResult.net;
      overallOvertime += (ruleResult.context.OVERTIME || 0);
      overallLop += (ruleResult.context.LOP_DEDUCTION || 0);
    } catch (empErr) {
      console.error(`[Calculator] Error computing payslip for employee ${pe.emp_code}:`, empErr.message);
      await trx('payroll_validation_issues').insert({
        payrun_id: payrunId,
        employee_id: pe.employee_id,
        category: 'Salary',
        severity: 'blocker',
        title: `Computation Error: ${pe.first_name} ${pe.last_name}`,
        description: `Failed to compute salary: ${empErr.message}`,
        impact: 'Payslip could not be generated for this employee.',
        recommended_action: 'Check contract wage, schedule, or custom salary rules.',
        is_resolved: false
      });
    }
  }

    // Step K: Update Payrun Record Totals
    await trx('payruns')
      .where('id', payrunId)
      .update({
        status: PAYRUN_STATUS.VALIDATION_REQUIRED,
        total_employees: payslipsCreatedCount,
        total_gross: Math.round(overallGross * 100) / 100,
        total_deductions: Math.round(overallDeductions * 100) / 100,
        total_net: Math.round(overallNet * 100) / 100,
        total_overtime: Math.round(overallOvertime * 100) / 100,
        total_lop: Math.round(overallLop * 100) / 100,
        prepared_by: userId || payrun.prepared_by,
        updated_at: new Date()
      });

    // Step L: Run Pre-Flight Validation Checks
    const validationSummary = await runPayrollPreFlightChecks(payrunId);

    // Step M: Run Anomaly & Variance Detection
    const variances = await detectPayrollVariances(payrunId);

    return {
      payrun: await trx('payruns').where('id', payrunId).first(),
      payslipsCount: payslipsCreatedCount,
      validationSummary,
      variancesCount: variances.length
    };
  });
}

module.exports = { computePayrun };
