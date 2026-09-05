// server/payroll/contractResolver.js
const db = require('../database/connection');

/**
 * Resolves the applicable active contract for an employee during the specified payroll period.
 * @param {number} employeeId
 * @param {string} periodStart (YYYY-MM-DD)
 * @param {string} periodEnd (YYYY-MM-DD)
 * @returns {Promise<{contract: object|null, error: string|null, warning: string|null}>}
 */
async function resolveContractForPeriod(employeeId, periodStart, periodEnd) {
  // Query all contracts for the employee that overlap with the period
  const contracts = await db('contracts')
    .where('employee_id', employeeId)
    .where('status', '!=', 'draft')
    .andWhere((builder) => {
      builder.where('start_date', '<=', periodEnd)
        .andWhere((inner) => {
          inner.whereNull('end_date').orWhere('end_date', '>=', periodStart);
        });
    })
    .orderBy('start_date', 'desc');

  if (!contracts || contracts.length === 0) {
    // Check if there is any expired contract in the past
    const pastContract = await db('contracts')
      .where('employee_id', employeeId)
      .orderBy('end_date', 'desc')
      .first();

    if (pastContract) {
      return {
        contract: null,
        error: `Contract expired on ${pastContract.end_date}. No active contract valid for period ${periodStart} to ${periodEnd}.`,
        warning: null
      };
    }

    return {
      contract: null,
      error: `No contract found for employee for payroll period ${periodStart} to ${periodEnd}.`,
      warning: null
    };
  }

  // Check for overlapping contracts
  if (contracts.length > 1) {
    const activeContracts = contracts.filter(c => c.status === 'active');
    if (activeContracts.length > 1) {
      return {
        contract: activeContracts[0],
        error: null,
        warning: `Multiple active contracts found overlapping period ${periodStart} to ${periodEnd}. Using latest contract #${activeContracts[0].contract_id}.`
      };
    }
  }

  const selectedContract = contracts[0];
  if (selectedContract.status === 'expired') {
    return {
      contract: selectedContract,
      error: `Contract #${selectedContract.contract_id} marked as expired.`,
      warning: null
    };
  }

  return {
    contract: selectedContract,
    error: null,
    warning: null
  };
}

module.exports = { resolveContractForPeriod };
