// server/controllers/adminController.js
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { logAudit } = require('../services/auditService');

async function getUsers(req, res, next) {
  try {
    const users = await db('users as u')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .leftJoin('roles as r', 'u.role', 'r.id')
      .select(
        'u.id',
        'u.username',
        'u.email',
        'u.role',
        'r.display_name as role_display',
        'u.employee_id',
        'u.is_active',
        'u.created_at',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code'
      )
      .orderBy('u.created_at', 'desc');

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { username, email, password, role, employee_id } = req.body;

    const existing = await db('users').where('username', username).orWhere('email', email).first();
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username or email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'password123', salt);

    const [newId] = await db('users').insert({
      username,
      email,
      password_hash: passwordHash,
      role: role || 'employee',
      employee_id: employee_id || null,
      is_active: true
    }).returning('id');

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: newId?.id || newId,
      newValues: JSON.stringify({ username, email, role }),
      reason: 'Admin user provisioning',
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: await db('users').where('id', newId?.id || newId).first()
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { role, is_active, password } = req.body;

    const updateObj = { updated_at: new Date() };
    if (role !== undefined) updateObj.role = role;
    if (is_active !== undefined) updateObj.is_active = is_active;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateObj.password_hash = await bcrypt.hash(password, salt);
    }

    await db('users').where('id', id).update(updateObj);

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      newValues: JSON.stringify({ role, is_active }),
      reason: 'User configuration update',
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    const settings = await db('system_settings');
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({ success: true, data: settings, settingsMap });
  } catch (err) {
    next(err);
  }
}

async function updateSetting(req, res, next) {
  try {
    const { key, value } = req.body;
    await db('system_settings').where('key', key).update({ value, updated_at: new Date() });

    await logAudit({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'UPDATE_SETTING',
      entity: 'SystemSetting',
      entityId: key,
      newValues: JSON.stringify({ key, value }),
      reason: 'Updated system parameter',
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Setting updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const { entity, action, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = db('audit_logs');
    if (entity) query = query.where('entity', entity);
    if (action) query = query.where('action', action);

    const countResult = await query.clone().count('id as total').first();
    const total = parseInt(countResult.total, 10);

    const logs = await query
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit, 10))
      .offset(offset);

    res.json({
      success: true,
      data: logs,
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

/**
 * Global Search across Employees, Contracts, Payruns, and Payslips
 */
async function globalSearch(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { employees: [], contracts: [], payruns: [], payslips: [] } });
    }

    const term = q.trim();

    // 1. Employees
    const employees = await db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
      .select('e.id', 'e.employee_id', 'e.first_name', 'e.last_name', 'e.email', 'd.name as department_name', 'jp.title as position_title')
      .where('e.first_name', 'like', `%${term}%`)
      .orWhere('e.last_name', 'like', `%${term}%`)
      .orWhere('e.employee_id', 'like', `%${term}%`)
      .orWhere('e.email', 'like', `%${term}%`)
      .limit(5);

    // 2. Contracts
    const contracts = await db('contracts as c')
      .join('employees as e', 'c.employee_id', 'e.id')
      .select('c.id', 'c.contract_id', 'c.wage', 'c.status', 'e.first_name', 'e.last_name', 'e.employee_id as emp_code')
      .where('c.contract_id', 'like', `%${term}%`)
      .orWhere('e.first_name', 'like', `%${term}%`)
      .orWhere('e.last_name', 'like', `%${term}%`)
      .limit(5);

    // 3. Payruns
    const payruns = await db('payruns')
      .select('id', 'payrun_number', 'title', 'period_start', 'status', 'total_net')
      .where('payrun_number', 'like', `%${term}%`)
      .orWhere('title', 'like', `%${term}%`)
      .limit(5);

    // 4. Payslips
    const payslips = await db('payslips as ps')
      .join('employees as e', 'ps.employee_id', 'e.id')
      .select('ps.id', 'ps.payslip_number', 'ps.period_start', 'ps.net_salary', 'e.first_name', 'e.last_name', 'e.employee_id as emp_code')
      .where('ps.payslip_number', 'like', `%${term}%`)
      .orWhere('e.employee_id', 'like', `%${term}%`)
      .limit(5);

    res.json({
      success: true,
      data: {
        employees,
        contracts,
        payruns,
        payslips
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  getSettings,
  updateSetting,
  getAuditLogs,
  globalSearch
};
