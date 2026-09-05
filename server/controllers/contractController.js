// server/controllers/contractController.js
const db = require('../database/connection');
const { logAudit } = require('../services/auditService');

async function getContracts(req, res, next) {
  try {
    const { employee_id, status, department_id } = req.query;

    let query = db('contracts as c')
      .join('employees as e', 'c.employee_id', 'e.id')
      .leftJoin('departments as d', 'c.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'c.job_position_id', 'jp.id')
      .leftJoin('salary_structures as ss', 'c.salary_structure_id', 'ss.id')
      .leftJoin('working_schedules as ws', 'c.working_schedule_id', 'ws.id')
      .select(
        'c.*',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'e.avatar_url',
        'd.name as department_name',
        'jp.title as position_title',
        'ss.name as salary_structure_name',
        'ws.name as schedule_name'
      );

    if (employee_id) {
      query = query.where('c.employee_id', employee_id);
    }
    if (status) {
      query = query.where('c.status', status);
    }
    if (department_id) {
      query = query.where('c.department_id', department_id);
    }

    const contracts = await query.orderBy('c.start_date', 'desc');

    res.json({
      success: true,
      data: contracts
    });
  } catch (err) {
    next(err);
  }
}

async function getContractById(req, res, next) {
  try {
    const { id } = req.params;
    const contract = await db('contracts as c')
      .join('employees as e', 'c.employee_id', 'e.id')
      .leftJoin('departments as d', 'c.department_id', 'd.id')
      .leftJoin('job_positions as jp', 'c.job_position_id', 'jp.id')
      .leftJoin('salary_structures as ss', 'c.salary_structure_id', 'ss.id')
      .leftJoin('working_schedules as ws', 'c.working_schedule_id', 'ws.id')
      .select(
        'c.*',
        'e.first_name',
        'e.last_name',
        'e.employee_id as emp_code',
        'd.name as department_name',
        'jp.title as position_title',
        'ss.name as salary_structure_name',
        'ws.name as schedule_name'
      )
      .where('c.id', id)
      .first();

    if (!contract) {
      return res.status(404).json({
        success: false,
        code: 'CONTRACT_NOT_FOUND',
        message: 'Contract not found.'
      });
    }

    res.json({
      success: true,
      data: contract
    });
  } catch (err) {
    next(err);
  }
}

async function createContract(req, res, next) {
  try {
    const data = req.body;

    // Check date validity
    if (data.end_date && new Date(data.end_date) < new Date(data.start_date)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DATES',
        message: 'Contract end date cannot be earlier than start date.'
      });
    }

    // Check overlapping active contracts for this employee
    const overlapping = await db('contracts')
      .where('employee_id', data.employee_id)
      .where('status', 'active')
      .andWhere((builder) => {
        builder.where('start_date', '<=', data.end_date || '2099-12-31')
          .andWhere((inner) => {
            inner.whereNull('end_date').orWhere('end_date', '>=', data.start_date);
          });
      });

    if (overlapping.length > 0 && data.status === 'active') {
      return res.status(400).json({
        success: false,
        code: 'OVERLAPPING_CONTRACT',
        message: `Active contract #${overlapping[0].contract_id} overlaps with these dates. Please end or expire the existing contract before creating a new active one.`
      });
    }

    const contractCode = data.contract_id || `CNT-${Date.now()}`;

    const [newId] = await db('contracts').insert({
      contract_id: contractCode,
      employee_id: data.employee_id,
      start_date: data.start_date,
      end_date: data.end_date || null,
      department_id: data.department_id || null,
      job_position_id: data.job_position_id || null,
      employment_type: data.employment_type || 'Full-time',
      wage: parseFloat(data.wage),
      wage_type: data.wage_type || 'monthly',
      salary_structure_id: data.salary_structure_id || 1,
      working_schedule_id: data.working_schedule_id || 1,
      status: data.status || 'active',
      contract_notes: data.contract_notes || null
    }).returning('id');

    const createdId = newId?.id || newId;

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'CREATE_CONTRACT',
      entity: 'Contract',
      entityId: createdId,
      newValues: JSON.stringify({ contract_id: contractCode, wage: data.wage }),
      reason: 'New employment contract created',
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Contract created successfully.',
      data: await db('contracts').where('id', createdId).first()
    });
  } catch (err) {
    next(err);
  }
}

async function updateContract(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date() };

    const oldContract = await db('contracts').where('id', id).first();
    if (!oldContract) {
      return res.status(404).json({
        success: false,
        code: 'CONTRACT_NOT_FOUND',
        message: 'Contract not found.'
      });
    }

    delete updateData.id;
    await db('contracts').where('id', id).update(updateData);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.username,
      userRole: req.user?.role,
      action: 'UPDATE_CONTRACT',
      entity: 'Contract',
      entityId: id,
      oldValues: JSON.stringify(oldContract),
      newValues: JSON.stringify(updateData),
      reason: 'Contract details updated',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Contract updated successfully.',
      data: await db('contracts').where('id', id).first()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getContracts,
  getContractById,
  createContract,
  updateContract
};
