// server/controllers/salaryStructureController.js
const db = require('../database/connection');
const { logAudit } = require('../services/auditService');

async function getStructures(req, res, next) {
  try {
    const structures = await db('salary_structures');

    for (const s of structures) {
      const rules = await db('salary_rules')
        .where('structure_id', s.id)
        .orderBy('sequence', 'asc');
      s.rules = rules;
      s.rulesCount = rules.length;
    }

    res.json({ success: true, data: structures });
  } catch (err) {
    next(err);
  }
}

async function getStructureById(req, res, next) {
  try {
    const { id } = req.params;
    const structure = await db('salary_structures').where('id', id).first();

    if (!structure) {
      return res.status(404).json({
        success: false,
        code: 'STRUCTURE_NOT_FOUND',
        message: 'Salary structure not found.'
      });
    }

    const rules = await db('salary_rules')
      .where('structure_id', id)
      .orderBy('sequence', 'asc');

    structure.rules = rules;

    res.json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
}

async function createStructure(req, res, next) {
  try {
    const { name, code, description, is_active } = req.body;

    const [insertId] = await db('salary_structures').insert({
      name,
      code,
      description,
      is_active: is_active !== undefined ? is_active : true
    });

    const createdId = insertId;

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'CREATE_SALARY_STRUCTURE',
      entity: 'SalaryStructure',
      entityId: createdId,
      newValues: JSON.stringify({ name, code }),
      reason: 'New salary structure created',
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Salary structure created successfully.',
      data: await db('salary_structures').where('id', createdId).first()
    });
  } catch (err) {
    next(err);
  }
}

async function duplicateStructure(req, res, next) {
  try {
    const { id } = req.params;
    const source = await db('salary_structures').where('id', id).first();
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source structure not found.' });
    }

    const sourceRules = await db('salary_rules').where('structure_id', id);

    const newCode = `${source.code}_COPY_${Date.now().toString().slice(-4)}`;
    const [newStructureId] = await db('salary_structures').insert({
      name: `${source.name} (Copy)`,
      code: newCode,
      description: `Duplicated from ${source.name}`,
      is_active: true
    });

    for (const rule of sourceRules) {
      await db('salary_rules').insert({
        structure_id: newStructureId,
        name: rule.name,
        code: rule.code,
        category: rule.category,
        sequence: rule.sequence,
        calculation_type: rule.calculation_type,
        fixed_amount: rule.fixed_amount,
        percentage_rate: rule.percentage_rate,
        percentage_base_code: rule.percentage_base_code,
        formula_expression: rule.formula_expression,
        condition_expression: rule.condition_expression,
        depends_on_codes: rule.depends_on_codes,
        is_active: rule.is_active
      });
    }

    res.status(201).json({
      success: true,
      message: 'Salary structure and rules duplicated successfully.',
      data: await db('salary_structures').where('id', newStructureId).first()
    });
  } catch (err) {
    next(err);
  }
}

async function updateStructure(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const existing = await db('salary_structures').where('id', id).first();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Salary structure not found.' });
    }

    await db('salary_structures').where('id', id).update({
      name: name !== undefined ? name : existing.name,
      description: description !== undefined ? description : existing.description,
      is_active: is_active !== undefined ? is_active : existing.is_active,
      updated_at: new Date()
    });

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'UPDATE_SALARY_STRUCTURE',
      entity: 'SalaryStructure',
      entityId: id,
      newValues: JSON.stringify({ name, is_active }),
      reason: 'Salary structure updated',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Salary structure updated successfully.',
      data: await db('salary_structures').where('id', id).first()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStructures,
  getStructureById,
  createStructure,
  updateStructure,
  duplicateStructure
};
