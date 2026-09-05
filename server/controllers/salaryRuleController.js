// server/controllers/salaryRuleController.js
const db = require('../database/connection');
const { executeSalaryRules } = require('../payroll/salaryRuleEngine');
const { logAudit } = require('../services/auditService');

async function getRulesByStructure(req, res, next) {
  try {
    const { structure_id } = req.params;
    const rules = await db('salary_rules')
      .where('structure_id', structure_id)
      .orderBy('sequence', 'asc');

    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
}

async function createRule(req, res, next) {
  try {
    const data = req.body;

    const [newId] = await db('salary_rules').insert({
      structure_id: data.structure_id,
      name: data.name,
      code: data.code.toUpperCase(),
      category: data.category,
      sequence: parseInt(data.sequence || 10, 10),
      calculation_type: data.calculation_type || 'fixed',
      fixed_amount: parseFloat(data.fixed_amount || 0),
      percentage_rate: parseFloat(data.percentage_rate || 0),
      percentage_base_code: data.percentage_base_code || null,
      formula_expression: data.formula_expression || null,
      condition_expression: data.condition_expression || null,
      depends_on_codes: data.depends_on_codes || null,
      is_active: data.is_active !== undefined ? data.is_active : true
    }).returning('id');

    const createdId = newId?.id || newId;

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'CREATE_SALARY_RULE',
      entity: 'SalaryRule',
      entityId: createdId,
      newValues: JSON.stringify(data),
      reason: 'New salary calculation rule added',
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Salary rule created successfully.',
      data: await db('salary_rules').where('id', createdId).first()
    });
  } catch (err) {
    next(err);
  }
}

async function updateRule(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date() };
    delete updateData.id;

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    const oldRule = await db('salary_rules').where('id', id).first();
    if (!oldRule) {
      return res.status(404).json({ success: false, message: 'Salary rule not found.' });
    }

    await db('salary_rules').where('id', id).update(updateData);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'UPDATE_SALARY_RULE',
      entity: 'SalaryRule',
      entityId: id,
      oldValues: JSON.stringify(oldRule),
      newValues: JSON.stringify(updateData),
      reason: 'Salary rule modified',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Salary rule updated successfully.',
      data: await db('salary_rules').where('id', id).first()
    });
  } catch (err) {
    next(err);
  }
}

async function deleteRule(req, res, next) {
  try {
    const { id } = req.params;
    const oldRule = await db('salary_rules').where('id', id).first();

    if (!oldRule) {
      return res.status(404).json({ success: false, message: 'Rule not found.' });
    }

    await db('salary_rules').where('id', id).del();

    res.json({
      success: true,
      message: 'Salary rule deleted.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Simulates salary rule calculation against a test wage and parameters.
 */
async function simulateRules(req, res, next) {
  try {
    const { structure_id, wage = 100000, worked_days = 22, unpaid_days = 0, overtime_hours = 0 } = req.body;

    const rules = await db('salary_rules')
      .where('structure_id', structure_id)
      .where('is_active', true)
      .orderBy('sequence', 'asc');

    const baseParams = {
      WAGE: parseFloat(wage),
      TOTAL_DAYS: 30,
      EXPECTED_DAYS: 22,
      EXPECTED_HOURS: 176,
      WORKED_DAYS: parseFloat(worked_days),
      PAID_DAYS: parseFloat(worked_days),
      UNPAID_DAYS: parseFloat(unpaid_days),
      OVERTIME_HOURS: parseFloat(overtime_hours)
    };

    const result = executeSalaryRules(rules, baseParams);

    res.json({
      success: true,
      data: {
        inputs: baseParams,
        summary: {
          wage: parseFloat(wage),
          gross: result.gross,
          deductions: result.deductions,
          net: result.net
        },
        breakdown: result.lines,
        contextVariables: result.context
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRulesByStructure,
  createRule,
  updateRule,
  deleteRule,
  simulateRules
};
