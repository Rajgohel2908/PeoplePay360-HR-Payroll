// server/controllers/payslipController.js
const db = require('../database/connection');
const { generatePayslipPdf } = require('../services/pdfService');
const { dispatchBulkPayslips } = require('../services/emailService');
const { ROLES } = require('../config/constants');
const { logAudit } = require('../services/auditService');

async function getPayslips(req, res, next) {
  try {
    const {
      employee_id,
      payrun_id,
      payment_status,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = db('payslips as ps')
      .join('employees as e', 'ps.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .leftJoin('payruns as pr', 'ps.payrun_id', 'pr.id')
      .select(
        'ps.*',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'e.avatar_url',
        'e.email as employee_email',
        'd.name as department_name',
        'd.color as department_color',
        'jp.title as position_title',
        'pr.payrun_number',
        'pr.title as payrun_title',
        'pr.status as payrun_status'
      );

    if (req.user.role === ROLES.EMPLOYEE) {
      query = query.where('ps.employee_id', req.user.employee_id);
    } else if (employee_id) {
      query = query.where('ps.employee_id', employee_id);
    }

    if (payrun_id) {
      query = query.where('ps.payrun_id', payrun_id);
    }
    if (payment_status) {
      query = query.where('ps.payment_status', payment_status);
    }
    if (search) {
      query = query.where((builder) => {
        builder.where('e.first_name', 'like', `%${search}%`)
          .orWhere('e.last_name', 'like', `%${search}%`)
          .orWhere('e.employee_id', 'like', `%${search}%`)
          .orWhere('ps.payslip_number', 'like', `%${search}%`);
      });
    }

    const countResult = await query.clone().clearSelect().count('ps.id as total').first();
    const total = parseInt(countResult.total, 10);

    const payslips = await query
      .orderBy('ps.period_start', 'desc')
      .orderBy('ps.created_at', 'desc')
      .orderBy('ps.id', 'desc')
      .limit(parseInt(limit, 10))
      .offset(offset);

    res.json({
      success: true,
      data: payslips,
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

async function getPayslipById(req, res, next) {
  try {
    const { id } = req.params;

    const payslip = await db('payslips as ps')
      .join('employees as e', 'ps.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .leftJoin('salary_structures as ss', 'ps.salary_structure_id', 'ss.id')
      .leftJoin('contracts as c', 'ps.contract_id', 'c.id')
      .leftJoin('payruns as pr', 'ps.payrun_id', 'pr.id')
      .select(
        'ps.*',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'e.email as employee_email',
        'e.avatar_url',
        'e.bank_name',
        'e.account_number',
        'e.ifsc_code',
        'e.pan_number',
        'e.uan_number',
        'd.name as department_name',
        'jp.title as position_title',
        'ss.name as salary_structure_name',
        'c.wage as contract_wage',
        'pr.payrun_number',
        'pr.title as payrun_title'
      )
      .where('ps.id', id)
      .first();

    if (!payslip) {
      return res.status(404).json({ success: false, code: 'PAYSLIP_NOT_FOUND', message: 'Payslip not found.' });
    }

    // Role security: employee can only view own payslip
    if (req.user.role === ROLES.EMPLOYEE && req.user.employee_id !== payslip.employee_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view another employee payslip.' });
    }

    const lines = await db('payslip_lines')
      .where('payslip_id', id)
      .orderBy('sequence', 'asc');

    payslip.lines = lines;
    payslip.earnings = lines.filter(l => l.category === 'basic' || l.category === 'allowance');
    payslip.deductions = lines.filter(l => l.category === 'deduction');

    res.json({
      success: true,
      data: payslip
    });
  } catch (err) {
    next(err);
  }
}

async function downloadPayslipPdf(req, res, next) {
  try {
    const { id } = req.params;

    const payslip = await db('payslips').where('id', id).first();
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found.' });
    }

    if (req.user.role === ROLES.EMPLOYEE && req.user.employee_id !== payslip.employee_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const doc = await generatePayslipPdf(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Payslip-${payslip.payslip_number}.pdf`);

    doc.pipe(res);
    doc.end();
  } catch (err) {
    next(err);
  }
}

async function sendBulkPayslipEmails(req, res, next) {
  try {
    const { payrun_id, payslip_ids } = req.body;

    if (!payrun_id) {
      return res.status(400).json({ success: false, message: 'Payrun ID is required.' });
    }

    const result = await dispatchBulkPayslips(payrun_id, payslip_ids);

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'SEND_PAYSLIP_EMAILS',
      entity: 'Payrun',
      entityId: payrun_id,
      newValues: JSON.stringify({ total: result.total, sent: result.sent, failed: result.failed }),
      reason: 'Dispatched bulk payslip email notifications',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Bulk payslip dispatch completed: ${result.sent} sent successfully, ${result.failed} failed/missing email.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function getEmailLogs(req, res, next) {
  try {
    const { payrun_id } = req.query;

    let query = db('email_logs as el')
      .leftJoin('employees as e', 'el.employee_id', 'e.id')
      .select('el.*', 'e.first_name', 'e.last_name', 'e.employee_id as emp_code');

    if (payrun_id) {
      query = query.where('el.payrun_id', payrun_id);
    }

    const logs = await query
      .orderBy('el.sent_at', 'desc')
      .orderBy('el.id', 'desc')
      .limit(50);

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPayslips,
  getPayslipById,
  downloadPayslipPdf,
  sendBulkPayslipEmails,
  getEmailLogs
};
