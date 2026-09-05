// server/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/connection');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIALS',
        message: 'Username/email and password are required.'
      });
    }

    const user = await db('users as u')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .select(
        'u.id',
        'u.username',
        'u.email',
        'u.password_hash',
        'u.role',
        'u.employee_id',
        'u.is_active',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'e.avatar_url',
        'd.name as department_name',
        'jp.title as position_title'
      )
      .where('u.username', username)
      .orWhere('u.email', username)
      .first();

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username/email or inactive user account.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username/email or password.'
      });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    await logAudit({
      userId: user.id,
      userName: `${user.first_name || user.username} ${user.last_name || ''}`.trim(),
      userRole: user.role,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      reason: 'Successful user authentication',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          employee_id: user.employee_id,
          first_name: user.first_name,
          last_name: user.last_name,
          emp_code: user.emp_code,
          avatar_url: user.avatar_url,
          department_name: user.department_name,
          position_title: user.position_title
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await db('users as u')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .select(
        'u.id',
        'u.username',
        'u.email',
        'u.role',
        'u.employee_id',
        'u.is_active',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'e.avatar_url',
        'e.phone',
        'd.name as department_name',
        'jp.title as position_title'
      )
      .where('u.id', req.user.id)
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User profile not found.'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
}

async function getDemoCredentials(req, res, next) {
  try {
    const demoAccounts = [
      { role: 'admin', label: 'System Admin', username: 'admin', email: 'admin@peoplepay360.com', password: 'admin123', desc: 'Full unrestricted system access, user management & audit' },
      { role: 'payroll_manager', label: 'HR Payroll Manager', username: 'payroll_manager', email: 'payrollmgr@peoplepay360.com', password: 'payrollmgr123', desc: 'Validates & approves payroll, manages salary rules' },
      { role: 'payroll_user', label: 'HR Payroll Specialist', username: 'payroll_user', email: 'payrolluser@peoplepay360.com', password: 'payroll123', desc: 'Drafts payruns, computes payroll, sends payslips' },
      { role: 'hr_manager', label: 'HR Operations Manager', username: 'hr_manager', email: 'hrmanager@peoplepay360.com', password: 'hr123', desc: 'Full HR management: Employees, Contracts, Attendance, Leave' },
      { role: 'employee', label: 'Employee Self-Service', username: 'employee', email: 'employee@peoplepay360.com', password: 'emp123', desc: 'Personal profile, attendance logs, leave requests, payslip PDF' }
    ];

    res.json({
      success: true,
      data: demoAccounts
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getProfile,
  getDemoCredentials
};
