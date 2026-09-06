// server/controllers/reportController.js
const db = require('../database/connection');

async function getPayrollSummaryReport(req, res, next) {
  try {
    const { year } = req.query;

    let query = db('payruns as pr')
      .leftJoin('salary_structures as ss', 'pr.salary_structure_id', 'ss.id')
      .select(
        'pr.payrun_number',
        'pr.title',
        'pr.period_start',
        'pr.period_end',
        'pr.status',
        'pr.total_employees',
        'pr.total_gross',
        'pr.total_deductions',
        'pr.total_net',
        'pr.total_overtime',
        'pr.total_lop',
        'ss.name as structure_name'
      )
      .orderBy('pr.period_start', 'desc')
      .orderBy('pr.id', 'desc');

    if (year && year !== 'all') {
      query = query.where('pr.period_start', 'like', `${year}%`);
    }

    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getDepartmentPayrollReport(req, res, next) {
  try {
    const data = await db('contracts as c')
      .join('departments as d', 'c.department_id', 'd.id')
      .where('c.status', 'active')
      .groupBy('d.id', 'd.name', 'd.code')
      .select(
        'd.name as department_name',
        'd.code as department_code',
        db.raw('COUNT(c.id) as employee_count'),
        db.raw('SUM(c.wage) as total_monthly_wage'),
        db.raw('AVG(c.wage) as average_wage'),
        db.raw('MIN(c.wage) as min_wage'),
        db.raw('MAX(c.wage) as max_wage')
      )
      .orderBy('total_monthly_wage', 'desc');

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAttendanceReport(req, res, next) {
  try {
    const { start_date, end_date, department_id } = req.query;

    let query = db('attendance as a')
      .join('employees as e', 'a.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .groupBy('e.id', 'e.employee_id', 'e.first_name', 'e.last_name', 'd.name')
      .select(
        'e.employee_id as emp_code',
        db.raw("e.first_name || ' ' || e.last_name as employee_name"),
        'd.name as department_name',
        db.raw("COUNT(a.id) as total_days_logged"),
        db.raw("COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days"),
        db.raw("COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days"),
        db.raw("COUNT(CASE WHEN a.status = 'missing_checkout' THEN 1 END) as missing_checkouts"),
        db.raw("SUM(a.worked_hours) as total_worked_hours"),
        db.raw("SUM(a.overtime_hours) as total_overtime_hours"),
        db.raw("SUM(a.late_minutes) as total_late_minutes")
      )
      .orderBy('total_days_logged', 'desc');

    if (start_date) query = query.where('a.date', '>=', start_date);
    if (end_date) query = query.where('a.date', '<=', end_date);
    if (department_id) query = query.where('e.department_id', department_id);

    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getLeaveReport(req, res, next) {
  try {
    const { year } = req.query;

    let query = db('time_off_allocations as a')
      .join('employees as e', 'a.employee_id', 'e.id')
      .join('time_off_types as t', 'a.leave_type_id', 't.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .select(
        'e.employee_id as emp_code',
        db.raw("e.first_name || ' ' || e.last_name as employee_name"),
        'd.name as department_name',
        't.name as leave_type',
        'a.allocated_days',
        'a.used_days',
        'a.pending_days',
        'a.remaining_days'
      )
      .orderBy('a.id', 'desc');

    if (year && year !== 'all') {
      query = query.where('a.year', year);
    }

    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getContractExpiryReport(req, res, next) {
  try {
    const data = await db('contracts as c')
      .join('employees as e', 'c.employee_id', 'e.id')
      .leftJoin('departments as d', 'c.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'c.job_position_id', 'jp.id')
      .select(
        'c.contract_id',
        'e.employee_id as emp_code',
        db.raw("e.first_name || ' ' || e.last_name as employee_name"),
        'd.name as department_name',
        'jp.title as position_title',
        'c.start_date',
        'c.end_date',
        'c.wage',
        'c.status'
      )
      .whereNotNull('c.end_date')
      .orderBy('c.end_date', 'asc');

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPayrollSummaryReport,
  getDepartmentPayrollReport,
  getAttendanceReport,
  getLeaveReport,
  getContractExpiryReport
};
