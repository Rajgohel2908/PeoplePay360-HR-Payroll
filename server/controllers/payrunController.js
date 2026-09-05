// server/controllers/payrunController.js
const db = require('../database/connection');
const { computePayrun } = require('../payroll/calculator');
const { runPayrollPreFlightChecks } = require('../payroll/validator');
const { detectPayrollVariances } = require('../payroll/varianceDetector');
const { PAYRUN_STATUS, VALIDATION_SEVERITY, ROLES } = require('../config/constants');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

async function getPayruns(req, res, next) {
  try {
    const { status, year } = req.query;

    let query = db('payruns as pr')
      .leftJoin('salary_structures as ss', 'pr.salary_structure_id', 'ss.id')
      .leftJoin('departments as d', 'pr.department_id', 'd.id')
      .leftJoin('users as u1', 'pr.prepared_by', 'u1.id')
      .leftJoin('users as u2', 'pr.approved_by', 'u2.id')
      .select(
        'pr.*',
        'ss.name as salary_structure_name',
        'd.name as department_name',
        'u1.username as prepared_by_name',
        'u2.username as approved_by_name'
      );

    if (status) {
      query = query.where('pr.status', status);
    }
    if (year) {
      query = query.whereRaw('YEAR(pr.period_start) = ?', [parseInt(year, 10)]);
    }

    const payruns = await query.orderBy('pr.period_start', 'desc');

    // Attach validation issue summary counts to each payrun
    for (const p of payruns) {
      const issueStats = await db('payroll_validation_issues')
        .where('payrun_id', p.id)
        .select(
          db.raw("COUNT(CASE WHEN severity = 'blocker' AND is_resolved = 0 THEN 1 END) as blockers"),
          db.raw("COUNT(CASE WHEN severity = 'warning' AND is_resolved = 0 THEN 1 END) as warnings"),
          db.raw("COUNT(CASE WHEN severity = 'info' THEN 1 END) as infos")
        )
        .first();

      p.blockersCount = parseInt(issueStats?.blockers || 0, 10);
      p.warningsCount = parseInt(issueStats?.warnings || 0, 10);
      p.infoCount = parseInt(issueStats?.infos || 0, 10);
    }

    res.json({ success: true, data: payruns });
  } catch (err) {
    next(err);
  }
}

async function getPayrunById(req, res, next) {
  try {
    const { id } = req.params;

    const payrun = await db('payruns as pr')
      .leftJoin('salary_structures as ss', 'pr.salary_structure_id', 'ss.id')
      .leftJoin('departments as d', 'pr.department_id', 'd.id')
      .leftJoin('users as u1', 'pr.prepared_by', 'u1.id')
      .leftJoin('users as u2', 'pr.approved_by', 'u2.id')
      .select(
        'pr.*',
        'ss.name as salary_structure_name',
        'd.name as department_name',
        'u1.username as prepared_by_name',
        'u2.username as approved_by_name'
      )
      .where('pr.id', id)
      .first();

    if (!payrun) {
      return res.status(404).json({ success: false, code: 'PAYRUN_NOT_FOUND', message: 'Payrun not found.' });
    }

    // Validation summary
    const issues = await db('payroll_validation_issues as vi')
      .leftJoin('employees as e', 'vi.employee_id', 'e.id')
      .select('vi.*', 'e.first_name', 'e.last_name', 'e.employee_id as emp_code')
      .where('vi.payrun_id', id)
      .orderBy('vi.severity', 'asc');

    const blockersCount = issues.filter(i => i.severity === VALIDATION_SEVERITY.BLOCKER && !i.is_resolved).length;
    const warningsCount = issues.filter(i => i.severity === VALIDATION_SEVERITY.WARNING && !i.is_resolved).length;

    // Variances
    const variances = await db('payroll_variances as pv')
      .join('employees as e', 'pv.employee_id', 'e.id')
      .select('pv.*', 'e.first_name', 'e.last_name', 'e.employee_id as emp_code')
      .where('pv.payrun_id', id)
      .orderBy('pv.delta_percentage', 'desc');

    // Payslips list
    const payslips = await db('payslips as ps')
      .join('employees as e', 'ps.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .select(
        'ps.*',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'e.avatar_url',
        'e.bank_name',
        'e.account_number',
        'd.name as department_name',
        'jp.title as position_title'
      )
      .where('ps.payrun_id', id)
      .orderBy('ps.gross_salary', 'desc');

    res.json({
      success: true,
      data: {
        payrun,
        validation: {
          hasBlockers: blockersCount > 0,
          blockersCount,
          warningsCount,
          totalIssues: issues.length,
          issues
        },
        variances,
        payslips
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Payrun Wizard: Step 2 - Find Eligible Employees
 */
async function findEligibleEmployees(req, res, next) {
  try {
    const { period_start, period_end, department_id, employee_type } = req.body;

    let query = db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .leftJoin('contracts as c', function() {
        this.on('e.id', '=', 'c.employee_id')
          .andOn('c.status', '=', db.raw('?', ['active']))
          .andOn('c.start_date', '<=', db.raw('?', [period_end]))
          .andOn(function() {
            this.onNull('c.end_date').orOn('c.end_date', '>=', db.raw('?', [period_start]));
          });
      })
      .select(
        'e.id as employee_id',
        'e.employee_id as emp_code',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.bank_name',
        'e.account_number',
        'e.ifsc_code',
        'e.employment_status',
        'e.employee_type',
        'd.name as department_name',
        'jp.title as position_title',
        'c.id as contract_id',
        'c.contract_id as contract_code',
        'c.wage',
        'c.status as contract_status'
      )
      .where('e.employment_status', '!=', 'Terminated');

    if (department_id) {
      query = query.where('e.department_id', department_id);
    }
    if (employee_type && employee_type !== 'All') {
      query = query.where('e.employee_type', employee_type);
    }

    const employees = await query.orderBy('e.first_name', 'asc');

    const result = employees.map(emp => {
      const issues = [];
      let isEligible = true;

      if (!emp.contract_id || emp.contract_status !== 'active') {
        issues.push('No active contract found for period');
      }
      if (!emp.bank_name || !emp.account_number) {
        issues.push('Missing bank payment details');
      }

      return {
        ...emp,
        is_eligible: isEligible,
        is_selected: true,
        issues
      };
    });

    res.json({
      success: true,
      totalFound: result.length,
      eligibleCount: result.filter(r => r.issues.length === 0).length,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Payrun Wizard: Step 4 - Create Payrun and include selected employees
 */
async function createPayrun(req, res, next) {
  try {
    const {
      title,
      period_start,
      period_end,
      payment_date,
      salary_structure_id,
      department_id,
      employee_type,
      selected_employee_ids,
      notes
    } = req.body;

    const startMonth = new Date(period_start).toISOString().slice(0, 7);
    const payrunNumber = `PR-${startMonth}-${Date.now().toString().slice(-4)}`;

    const payrunResult = await db.transaction(async (trx) => {
      await trx('payruns').insert({
        payrun_number: payrunNumber,
        title: title || `${startMonth} Monthly Payroll`,
        period_start,
        period_end,
        payment_date: payment_date || null,
        salary_structure_id: salary_structure_id || 1,
        department_id: department_id || null,
        employee_type: employee_type || 'All',
        status: PAYRUN_STATUS.DRAFT,
        prepared_by: req.user.id,
        notes: notes || null
      });

      // MySQL: get last inserted ID
      const newPayrun = await trx('payruns').where('payrun_number', payrunNumber).first();
      const payrunDbId = newPayrun.id;

      // Add selected employees into payrun_employees junction
      if (selected_employee_ids && selected_employee_ids.length > 0) {
        const rows = selected_employee_ids.map(empId => ({
          payrun_id: payrunDbId,
          employee_id: empId,
          is_included: true
        }));
        await trx('payrun_employees').insert(rows);
      } else {
        // Default: include all active employees
        const allActive = await trx('employees').where('employment_status', '!=', 'Terminated').select('id');
        const rows = allActive.map(e => ({
          payrun_id: payrunDbId,
          employee_id: e.id,
          is_included: true
        }));
        await trx('payrun_employees').insert(rows);
      }

      await logAudit({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'CREATE_PAYRUN',
        entity: 'Payrun',
        entityId: payrunDbId,
        newValues: JSON.stringify({ payrunNumber, period_start, period_end }),
        reason: 'Initialized new payrun cycle wizard',
        ipAddress: req.ip
      });

      return payrunDbId;
    });

    res.status(201).json({
      success: true,
      message: 'Payrun cycle initialized successfully in Draft state.',
      data: await db('payruns').where('id', payrunResult).first()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Trigger Compute for a Payrun
 */
async function triggerCompute(req, res, next) {
  try {
    const { id } = req.params;

    const result = await computePayrun(id, req.user.id);

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'COMPUTE_PAYRUN',
      entity: 'Payrun',
      entityId: id,
      newValues: JSON.stringify({
        total_gross: result.payrun.total_gross,
        total_net: result.payrun.total_net,
        payslips: result.payslipsCount
      }),
      reason: 'Batch payroll computation completed',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Payrun computed successfully. Generated ${result.payslipsCount} payslips. Pre-flight check found ${result.validationSummary.blockersCount} blockers and ${result.validationSummary.warningsCount} warnings.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Re-run Pre-flight Validation
 */
async function validatePayrun(req, res, next) {
  try {
    const { id } = req.params;
    const validationSummary = await runPayrollPreFlightChecks(id);

    res.json({
      success: true,
      message: 'Pre-flight validations refreshed.',
      data: validationSummary
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resolve a validation issue (override or mark resolved)
 */
async function resolveValidationIssue(req, res, next) {
  try {
    const { issue_id } = req.params;
    const { resolution_notes } = req.body;

    const issue = await db('payroll_validation_issues').where('id', issue_id).first();
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Validation issue not found.' });
    }

    await db('payroll_validation_issues')
      .where('id', issue_id)
      .update({
        is_resolved: true,
        resolved_by: req.user.id,
        resolved_at: new Date(),
        resolution_notes: resolution_notes || 'Resolved by payroll manager override',
        updated_at: new Date()
      });

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'RESOLVE_VALIDATION_ISSUE',
      entity: 'PayrollValidationIssue',
      entityId: issue_id,
      reason: resolution_notes || 'Manually marked as resolved',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Validation issue resolved successfully.',
      data: await db('payroll_validation_issues').where('id', issue_id).first()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Approve Payrun
 */
async function approvePayrun(req, res, next) {
  try {
    const { id } = req.params;

    const payrun = await db('payruns').where('id', id).first();
    if (!payrun) {
      return res.status(404).json({ success: false, message: 'Payrun not found.' });
    }

    // Check for unresolved BLOCKERS
    const unresolvedBlockers = await db('payroll_validation_issues')
      .where('payrun_id', id)
      .where('severity', VALIDATION_SEVERITY.BLOCKER)
      .where('is_resolved', false);

    if (unresolvedBlockers.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'UNRESOLVED_BLOCKERS',
        message: `Cannot approve payrun. There are ${unresolvedBlockers.length} unresolved BLOCKER issues that must be addressed first in the Payroll Validation Center.`,
        blockers: unresolvedBlockers
      });
    }

    await db('payruns')
      .where('id', id)
      .update({
        status: PAYRUN_STATUS.APPROVED,
        approved_by: req.user.id,
        approved_at: new Date(),
        updated_at: new Date()
      });

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'APPROVE_PAYRUN',
      entity: 'Payrun',
      entityId: id,
      newValues: JSON.stringify({ status: PAYRUN_STATUS.APPROVED, approved_by: req.user.id }),
      reason: 'Payroll cycle formally reviewed and approved for disbursement',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Payrun approved successfully. Ready for final payment processing.',
      data: await db('payruns').where('id', id).first()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark Payrun as Paid (Finalizing & Locking Payroll)
 */
async function markPaid(req, res, next) {
  try {
    const { id } = req.params;
    const { payment_date } = req.body;

    const payrun = await db('payruns').where('id', id).first();
    if (!payrun) {
      return res.status(404).json({ success: false, message: 'Payrun not found.' });
    }

    if (payrun.status !== PAYRUN_STATUS.APPROVED && payrun.status !== PAYRUN_STATUS.READY_FOR_APPROVAL) {
      return res.status(400).json({
        success: false,
        code: 'NOT_APPROVED',
        message: 'Payrun must be in Approved state before marking as Paid.'
      });
    }

    const payDate = payment_date || new Date().toISOString().split('T')[0];

    await db.transaction(async (trx) => {
      // 1. Lock Payrun
      await trx('payruns')
        .where('id', id)
        .update({
          status: PAYRUN_STATUS.PAID,
          payment_date: payDate,
          paid_at: new Date(),
          updated_at: new Date()
        });

      // 2. Update all payslips in this payrun to Paid
      await trx('payslips')
        .where('payrun_id', id)
        .update({
          payment_status: 'Paid',
          updated_at: new Date()
        });

      // 3. Audit log
      await logAudit({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'MARK_PAYRUN_PAID',
        entity: 'Payrun',
        entityId: id,
        newValues: JSON.stringify({ status: PAYRUN_STATUS.PAID, payment_date: payDate }),
        reason: 'Executed disbursement. Payroll locked as immutable financial record.',
        ipAddress: req.ip
      });
    });

    res.json({
      success: true,
      message: `Payrun ${payrun.payrun_number} has been marked as PAID and locked successfully.`,
      data: await db('payruns').where('id', id).first()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Cancel a Payrun (can only cancel Draft/Computed/Validation_Required payruns)
 */
async function cancelPayrun(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payrun = await db('payruns').where('id', id).first();
    if (!payrun) {
      return res.status(404).json({ success: false, message: 'Payrun not found.' });
    }

    const nonCancellable = [PAYRUN_STATUS.APPROVED, PAYRUN_STATUS.PAID, PAYRUN_STATUS.ARCHIVED];
    if (nonCancellable.includes(payrun.status)) {
      return res.status(400).json({
        success: false,
        code: 'CANNOT_CANCEL',
        message: `Cannot cancel a payrun with status '${payrun.status}'. Only draft, computed, or validation-required payruns can be cancelled.`
      });
    }

    await db.transaction(async (trx) => {
      await trx('payruns').where('id', id).update({ status: PAYRUN_STATUS.CANCELLED, updated_at: new Date() });
      await trx('payslips').where('payrun_id', id).delete();
      await trx('payslip_lines').whereIn('payslip_id',
        db('payslips').where('payrun_id', id).select('id')
      ).delete();

      await logAudit({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'CANCEL_PAYRUN',
        entity: 'Payrun',
        entityId: id,
        oldValues: JSON.stringify({ status: payrun.status }),
        newValues: JSON.stringify({ status: PAYRUN_STATUS.CANCELLED }),
        reason: reason || 'Payrun cancelled',
        ipAddress: req.ip
      });
    });

    res.json({
      success: true,
      message: `Payrun ${payrun.payrun_number} has been cancelled.`,
      data: await db('payruns').where('id', id).first()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Send payslip emails for a payrun
 */
async function sendPayslips(req, res, next) {
  try {
    const { id } = req.params;
    const { payslip_ids } = req.body;
    const { dispatchBulkPayslips } = require('../services/emailService');

    const payrun = await db('payruns').where('id', id).first();
    if (!payrun) {
      return res.status(404).json({ success: false, message: 'Payrun not found.' });
    }

    const result = await dispatchBulkPayslips(id, payslip_ids || null);

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'SEND_PAYSLIP_EMAILS',
      entity: 'Payrun',
      entityId: id,
      newValues: JSON.stringify({ total: result.total, sent: result.sent, failed: result.failed }),
      reason: 'Bulk payslip email dispatch',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Payslip dispatch completed: ${result.sent} sent, ${result.failed + result.missingEmail} failed.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPayruns,
  getPayrunById,
  findEligibleEmployees,
  createPayrun,
  triggerCompute,
  validatePayrun,
  resolveValidationIssue,
  approvePayrun,
  markPaid,
  cancelPayrun,
  sendPayslips
};
