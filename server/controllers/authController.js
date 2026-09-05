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

/**
 * Initiates forgot password flow: generates a secure reset token and emails it to the user.
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_EMAIL',
        message: 'Please provide your registered corporate email address.'
      });
    }

    const user = await db('users as u')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .select('u.id', 'u.username', 'u.email', 'u.is_active', 'u.employee_id', 'e.first_name', 'e.last_name')
      .where('u.email', email.trim())
      .orWhere('u.username', email.trim())
      .first();

    if (!user || !user.is_active) {
      // Return 404 or message so user knows
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'No active employee or user account found with that email.'
      });
    }

    // Generate random 6-digit verification code or token
    const { generateResetToken } = require('../utils/passwordGenerator');
    const { sendPasswordResetEmail } = require('../services/emailService');

    // Create a 6-digit numeric OTP code for ease of use in UI, plus hex token
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const token = `${randomDigits}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db('users').where('id', user.id).update({
      reset_token: token,
      reset_expires: expiresAt,
      updated_at: new Date()
    });

    const appUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/login?resetToken=${token}&email=${encodeURIComponent(user.email)}`;

    await sendPasswordResetEmail({
      email: user.email,
      name: `${user.first_name || user.username} ${user.last_name || ''}`.trim(),
      resetToken: token,
      resetUrl,
      employeeId: user.employee_id
    });

    await logAudit({
      userId: user.id,
      userName: `${user.first_name || user.username} ${user.last_name || ''}`.trim(),
      userRole: 'employee',
      action: 'PASSWORD_RESET_REQUEST',
      entity: 'User',
      entityId: user.id,
      reason: 'Requested password reset verification token',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `A 6-digit password reset verification code has been sent to ${user.email}. Please check your inbox.`,
      data: {
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verifies if the reset token for an email is valid and unexpired before allowing new password input.
 */
async function verifyResetToken(req, res, next) {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Email and verification code are required.'
      });
    }

    const user = await db('users')
      .where('email', email.trim())
      .orWhere('username', email.trim())
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'No account found with this email address.'
      });
    }

    if (!user.reset_token || user.reset_token !== token.trim()) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid verification code. Please check the 6-digit code sent to your email.'
      });
    }

    if (new Date() > new Date(user.reset_expires)) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    res.json({
      success: true,
      message: 'Verification code confirmed. You can now set your new password.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resets user password using the verification token.
 */
async function resetPassword(req, res, next) {
  try {
    const { email, token, new_password } = req.body;

    if (!email || !token || !new_password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Email, verification code/token, and new password are required.'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 6 characters in length.'
      });
    }

    const user = await db('users')
      .where('email', email.trim())
      .orWhere('username', email.trim())
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User account not found.'
      });
    }

    if (!user.reset_token || user.reset_token !== token.trim()) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired password reset token.'
      });
    }

    if (new Date() > new Date(user.reset_expires)) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Password reset code has expired. Please request a new one.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(new_password, salt);

    await db('users').where('id', user.id).update({
      password_hash: passwordHash,
      reset_token: null,
      reset_expires: null,
      updated_at: new Date()
    });

    await logAudit({
      userId: user.id,
      userName: user.username,
      userRole: user.role,
      action: 'PASSWORD_RESET_COMPLETE',
      entity: 'User',
      entityId: user.id,
      reason: 'Password successfully reset via token verification',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Password has been successfully reset. You can now log in with your new password.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * In-app password change for authenticated users (ESS Portal).
 */
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Current password and new password are required.'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        code: 'WEAK_PASSWORD',
        message: 'New password must be at least 6 characters in length.'
      });
    }

    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        code: 'INCORRECT_PASSWORD',
        message: 'Current password is incorrect.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(new_password, salt);

    await db('users').where('id', userId).update({
      password_hash: passwordHash,
      updated_at: new Date()
    });

    await logAudit({
      userId: user.id,
      userName: user.username,
      userRole: user.role,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: user.id,
      reason: 'User changed password from ESS portal',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getProfile,
  getDemoCredentials,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword
};

