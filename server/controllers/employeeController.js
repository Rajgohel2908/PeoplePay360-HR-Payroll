// server/controllers/employeeController.js
const db = require('../database/connection');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../services/auditService');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const { sendWelcomeCredentialsEmail } = require('../services/emailService');

async function getEmployees(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      department_id,
      job_position_id,
      employment_status,
      employee_type,
      sort_by = 'first_name',
      sort_order = 'asc'
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .leftJoin('working_schedules as ws', 'e.schedule_id', 'ws.id')
      .leftJoin('employees as m', 'e.manager_id', 'm.id')
      .select(
        'e.*',
        'd.name as department_name',
        'd.code as department_code',
        'd.color as department_color',
        'jp.title as position_title',
        'jp.grade as position_grade',
        'ws.name as schedule_name',
        db.raw("m.first_name || ' ' || m.last_name as manager_name")
      );

    if (search) {
      query = query.where((builder) => {
        builder.where('e.first_name', 'like', `%${search}%`)
          .orWhere('e.last_name', 'like', `%${search}%`)
          .orWhere('e.employee_id', 'like', `%${search}%`)
          .orWhere('e.email', 'like', `%${search}%`);
      });
    }

    if (department_id) {
      query = query.where('e.department_id', department_id);
    }
    if (job_position_id) {
      query = query.where('e.job_position_id', job_position_id);
    }
    if (employment_status) {
      query = query.where('e.employment_status', employment_status);
    }
    if (employee_type) {
      query = query.where('e.employee_type', employee_type);
    }

    // Count total matching
    const countResult = await query.clone().clearSelect().count('e.id as total').first();
    const total = parseInt(countResult.total, 10);

    // Fetch paginated results
    const employees = await query
      .orderBy(`e.${sort_by}`, sort_order)
      .limit(parseInt(limit, 10))
      .offset(offset);

    res.json({
      success: true,
      data: employees,
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

async function getEmployeeById(req, res, next) {
  try {
    const { id } = req.params;

    const employee = await db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .leftJoin('working_schedules as ws', 'e.schedule_id', 'ws.id')
      .leftJoin('employees as m', 'e.manager_id', 'm.id')
      .select(
        'e.*',
        'd.name as department_name',
        'd.code as department_code',
        'jp.title as position_title',
        'ws.name as schedule_name',
        db.raw("m.first_name || ' ' || m.last_name as manager_name")
      )
      .where('e.id', id)
      .orWhere('e.employee_id', id)
      .first();

    if (!employee) {
      return res.status(404).json({
        success: false,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee record not found.'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (err) {
    next(err);
  }
}

async function getEmployee360(req, res, next) {
  try {
    const { id } = req.params;

    // 1. Employee Core Profile
    const employee = await db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .leftJoin('working_schedules as ws', 'e.schedule_id', 'ws.id')
      .leftJoin('employees as m', 'e.manager_id', 'm.id')
      .select(
        'e.*',
        'd.name as department_name',
        'd.code as department_code',
        'd.color as department_color',
        'jp.title as position_title',
        'jp.grade as position_grade',
        'ws.name as schedule_name',
        'ws.weekly_hours',
        db.raw("m.first_name || ' ' || m.last_name as manager_name")
      )
      .where('e.id', id)
      .orWhere('e.employee_id', id)
      .first();

    if (!employee) {
      return res.status(404).json({
        success: false,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee record not found.'
      });
    }

    const empDbId = employee.id;

    // 2. Contracts History
    const contracts = await db('contracts as c')
      .leftJoin('salary_structures as ss', 'c.salary_structure_id', 'ss.id')
      .leftJoin('working_schedules as ws', 'c.working_schedule_id', 'ws.id')
      .select('c.*', 'ss.name as salary_structure_name', 'ws.name as schedule_name')
      .where('c.employee_id', empDbId)
      .orderBy('c.start_date', 'desc');

    // 3. Attendance Recent Logs & Stats
    const recentAttendance = await db('attendance')
      .where('employee_id', empDbId)
      .orderBy('date', 'desc')
      .limit(30);

    const attendanceStats = await db('attendance')
      .where('employee_id', empDbId)
      .select(
        db.raw("COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days"),
        db.raw("COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days"),
        db.raw("COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days"),
        db.raw("COUNT(CASE WHEN status = 'missing_checkout' THEN 1 END) as missing_checkouts"),
        db.raw("SUM(overtime_hours) as total_overtime_hours"),
        db.raw("SUM(worked_hours) as total_worked_hours")
      )
      .first();

    // 4. Leave Allocations & Requests
    const leaveAllocations = await db('time_off_allocations as a')
      .join('time_off_types as t', 'a.leave_type_id', 't.id')
      .select('a.*', 't.name as leave_type_name', 't.code as leave_type_code', 't.color as leave_color', 't.paid as is_paid')
      .where('a.employee_id', empDbId);

    const leaveRequests = await db('time_off_requests as r')
      .join('time_off_types as t', 'r.leave_type_id', 't.id')
      .leftJoin('users as u', 'r.approver_id', 'u.id')
      .select('r.*', 't.name as leave_type_name', 't.code as leave_type_code', 't.color as leave_color', 'u.username as approver_name')
      .where('r.employee_id', empDbId)
      .orderBy('r.start_date', 'desc');

    // 5. Payslips History
    const payslips = await db('payslips as ps')
      .leftJoin('payruns as pr', 'ps.payrun_id', 'pr.id')
      .select('ps.*', 'pr.payrun_number', 'pr.title as payrun_title')
      .where('ps.employee_id', empDbId)
      .orderBy('ps.period_start', 'desc');

    // 6. Documents
    const documents = await db('documents')
      .where('employee_id', empDbId)
      .orderBy('created_at', 'desc');

    // 7. Audit History for Employee
    const auditLogs = await db('audit_logs')
      .where('entity', 'Employee')
      .where('entity_id', String(empDbId))
      .orWhere('entity_id', employee.employee_id)
      .orderBy('created_at', 'desc')
      .limit(20);

    res.json({
      success: true,
      data: {
        employee,
        activeContract: contracts.find(c => c.status === 'active') || null,
        contracts,
        attendance: {
          recentLogs: recentAttendance,
          stats: attendanceStats
        },
        timeOff: {
          allocations: leaveAllocations,
          requests: leaveRequests
        },
        payslips,
        documents,
        auditLogs
      }
    });
  } catch (err) {
    next(err);
  }
}

async function createEmployee(req, res, next) {
  try {
    const data = req.body;

    // Field validations
    if (!data.employee_id || !data.employee_id.trim()) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }
    if (!data.first_name || !data.first_name.trim()) {
      return res.status(400).json({ success: false, message: 'First name is required.' });
    }
    if (!data.last_name || !data.last_name.trim()) {
      return res.status(400).json({ success: false, message: 'Last name is required.' });
    }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      return res.status(400).json({ success: false, message: 'Valid corporate email address is required.' });
    }
    if (!data.phone || !data.phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }
    if (!data.date_of_birth) {
      return res.status(400).json({ success: false, message: 'Date of birth is required.' });
    }
    if (!data.joining_date) {
      return res.status(400).json({ success: false, message: 'Joining date is required.' });
    }
    if (!data.department_id) {
      return res.status(400).json({ success: false, message: 'Department selection is required.' });
    }
    if (!data.job_position_id) {
      return res.status(400).json({ success: false, message: 'Job designation selection is required.' });
    }
    if (!data.wage || isNaN(data.wage) || Number(data.wage) <= 0) {
      return res.status(400).json({ success: false, message: 'Monthly base wage must be greater than 0.' });
    }
    if (!data.bank_name || !data.bank_name.trim()) {
      return res.status(400).json({ success: false, message: 'Bank name is required.' });
    }
    if (!data.account_number || !data.account_number.trim()) {
      return res.status(400).json({ success: false, message: 'Bank account number is required.' });
    }
    if (!data.ifsc_code || !data.ifsc_code.trim()) {
      return res.status(400).json({ success: false, message: 'Bank IFSC code is required.' });
    }
    if (!data.pan_number || !data.pan_number.trim()) {
      return res.status(400).json({ success: false, message: 'PAN card number is required.' });
    }
    if (!data.emergency_name || !data.emergency_name.trim()) {
      return res.status(400).json({ success: false, message: 'Emergency contact name is required.' });
    }
    if (!data.emergency_phone || !data.emergency_phone.trim()) {
      return res.status(400).json({ success: false, message: 'Emergency contact phone number is required.' });
    }
    if (!data.emergency_relation || !data.emergency_relation.trim()) {
      return res.status(400).json({ success: false, message: 'Relationship with emergency contact is required.' });
    }

    // Check unique employee_id and email
    const existing = await db('employees')
      .where('employee_id', data.employee_id.trim())
      .orWhere('email', data.email.trim())
      .first();

    if (existing) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_EMPLOYEE',
        message: existing.employee_id === data.employee_id.trim()
          ? `Employee ID "${data.employee_id}" already exists.`
          : `Email address "${data.email}" already exists.`
      });
    }

    const avatarUrl = data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.first_name}_${data.last_name}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    const [newId] = await db('employees').insert({
      employee_id: data.employee_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      address: data.address,
      city: data.city,
      state: data.state,
      postal_code: data.postal_code,
      country: data.country || 'India',
      emergency_name: data.emergency_name,
      emergency_phone: data.emergency_phone,
      emergency_relation: data.emergency_relation,
      department_id: data.department_id || null,
      job_position_id: data.job_position_id || null,
      manager_id: data.manager_id || null,
      employee_type: data.employee_type || 'Full-time',
      employment_status: data.employment_status || 'Active',
      joining_date: data.joining_date || new Date().toISOString().split('T')[0],
      schedule_id: data.schedule_id || 1,
      bank_name: data.bank_name || null,
      account_number: data.account_number || null,
      ifsc_code: data.ifsc_code || null,
      pan_number: data.pan_number || null,
      uan_number: data.uan_number || null,
      avatar_url: avatarUrl,
      notes: data.notes || null
    }).returning('id');

    const empDbId = newId?.id || newId;

    // Create Initial Contract if wage provided
    if (data.wage) {
      await db('contracts').insert({
        contract_id: `CNT-${data.employee_id}`,
        employee_id: empDbId,
        start_date: data.joining_date || new Date().toISOString().split('T')[0],
        department_id: data.department_id || null,
        job_position_id: data.job_position_id || null,
        employment_type: data.employee_type || 'Full-time',
        wage: parseFloat(data.wage),
        wage_type: 'monthly',
        salary_structure_id: data.salary_structure_id || 1,
        working_schedule_id: data.schedule_id || 1,
        status: 'active',
        contract_notes: 'Initial employment contract'
      });
    }

    // Default Leave Allocations
    const currentYear = new Date().getFullYear();
    const leaveTypes = await db('time_off_types').where('is_active', true);
    for (const lt of leaveTypes) {
      if (lt.requires_allocation) {
        const days = lt.code === 'CL' ? 12.0 : (lt.code === 'SL' ? 10.0 : 18.0);
        await db('time_off_allocations').insert({
          employee_id: empDbId,
          leave_type_id: lt.id,
          year: currentYear,
          allocated_days: days,
          used_days: 0,
          pending_days: 0,
          remaining_days: days,
          valid_from: `${currentYear}-01-01`,
          valid_to: `${currentYear}-12-31`,
          status: 'active'
        });
      }
    }

    // Provision user login account with random password
    const tempPassword = generateRandomPassword(10);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    const existingUser = await db('users').where('email', data.email).orWhere('username', data.email).first();
    if (!existingUser) {
      await db('users').insert({
        username: data.email,
        email: data.email,
        password_hash: passwordHash,
        role: 'employee',
        employee_id: empDbId,
        is_active: true
      });
    } else {
      await db('users').where('id', existingUser.id).update({
        employee_id: empDbId,
        password_hash: passwordHash,
        updated_at: new Date()
      });
    }

    // Dispatch welcome email with credentials
    const appUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    let emailSent = false;
    try {
      await sendWelcomeCredentialsEmail({
        email: data.email,
        name: `${data.first_name} ${data.last_name}`,
        username: data.email,
        tempPassword: tempPassword,
        loginUrl: `${appUrl}/login`,
        employeeId: empDbId
      });
      emailSent = true;
    } catch (mailErr) {
      console.error('Error sending onboarding credentials email:', mailErr);
    }

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'CREATE_EMPLOYEE',
      entity: 'Employee',
      entityId: empDbId,
      newValues: JSON.stringify({ employee_id: data.employee_id, name: `${data.first_name} ${data.last_name}`, email: data.email }),
      reason: 'Onboarded new employee and provisioned ESS account',
      ipAddress: req.ip
    });

    const createdEmp = await db('employees').where('id', empDbId).first();

    res.status(201).json({
      success: true,
      message: 'Employee created successfully. Login credentials have been emailed directly and securely to the employee.',
      data: createdEmp,
      account_provisioned: {
        email: data.email,
        email_sent: emailSent
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;

    const oldEmployee = await db('employees').where('id', id).first();
    if (!oldEmployee) {
      return res.status(404).json({
        success: false,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found.'
      });
    }

    const allowedFields = [
      'employee_id', 'first_name', 'last_name', 'email', 'phone',
      'date_of_birth', 'gender', 'address', 'city', 'state',
      'postal_code', 'country', 'emergency_name', 'emergency_phone',
      'emergency_relation', 'department_id', 'job_position_id',
      'manager_id', 'employee_type', 'employment_status',
      'joining_date', 'exit_date', 'schedule_id', 'bank_name',
      'account_number', 'ifsc_code', 'pan_number', 'uan_number',
      'avatar_url', 'notes'
    ];

    const cleanData = { updated_at: new Date() };
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        cleanData[key] = req.body[key];
      }
    }

    await db('employees').where('id', id).update(cleanData);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'UPDATE_EMPLOYEE',
      entity: 'Employee',
      entityId: id,
      oldValues: JSON.stringify(oldEmployee),
      newValues: JSON.stringify(cleanData),
      reason: 'Employee profile updated',
      ipAddress: req.ip
    });

    const updatedEmployee = await db('employees').where('id', id).first();

    res.json({
      success: true,
      message: 'Employee profile updated successfully.',
      data: updatedEmployee
    });
  } catch (err) {
    next(err);
  }
}

async function deleteEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const employee = await db('employees').where('id', id).first();

    if (!employee) {
      return res.status(404).json({
        success: false,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found.'
      });
    }

    // Check if employee has finalized payslips
    const paidPayslips = await db('payslips').where('employee_id', id).first();
    if (paidPayslips) {
      // Soft-deactivate to protect immutable financial history
      await db('employees').where('id', id).update({
        employment_status: 'Terminated',
        exit_date: new Date().toISOString().split('T')[0],
        updated_at: new Date()
      });

      return res.json({
        success: true,
        message: 'Employee has historical payroll records. Status changed to Terminated to preserve audit integrity.'
      });
    }

    await db('employees').where('id', id).del();

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'DELETE_EMPLOYEE',
      entity: 'Employee',
      entityId: id,
      oldValues: JSON.stringify(employee),
      reason: 'Employee deleted from platform',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Employee deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

async function getDepartments(req, res, next) {
  try {
    const departments = await db('departments').orderBy('name', 'asc');
    const jobPositions = await db('job_positions').orderBy('title', 'asc');
    res.json({ success: true, data: departments, job_positions: jobPositions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  getEmployee360,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments
};
