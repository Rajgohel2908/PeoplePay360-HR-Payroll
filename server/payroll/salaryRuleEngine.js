// server/payroll/salaryRuleEngine.js
const { CALCULATION_TYPE } = require('../config/constants');

/**
 * Safely evaluates a formula expression using sandboxed context variables.
 * @param {string} formula
 * @param {object} context
 * @returns {number}
 */
function evaluateFormula(formula, context) {
  if (!formula || typeof formula !== 'string') return 0;

  try {
    // Replace variable keys safely
    const keys = Object.keys(context);
    const values = Object.values(context);
    
    // Whitelist Math functions
    const safeMath = {
      min: Math.min,
      max: Math.max,
      round: Math.round,
      floor: Math.floor,
      ceil: Math.ceil,
      abs: Math.abs
    };

    const func = new Function('Math', ...keys, `
      try {
        const result = ${formula};
        return typeof result === 'number' && !isNaN(result) ? result : 0;
      } catch (e) {
        return 0;
      }
    `);

    return func(safeMath, ...values);
  } catch (err) {
    console.error(`Error evaluating formula "${formula}":`, err.message);
    return 0;
  }
}

/**
 * Executes ordered salary rules against employee compensation parameters.
 * @param {Array} rules Array of salary rule objects ordered by sequence
 * @param {object} baseParams { WAGE, TOTAL_DAYS, WORKED_DAYS, PAID_DAYS, UNPAID_DAYS, OVERTIME_HOURS, EXPECTED_DAYS, EXPECTED_HOURS }
 * @returns {{ gross: number, deductions: number, net: number, lines: Array, context: object }}
 */
function executeSalaryRules(rules, baseParams) {
  const context = {
    ...baseParams,
    BASIC: 0,
    HRA: 0,
    GROSS: 0,
    PF_EE: 0,
    PT: 0,
    TDS: 0,
    NET: 0
  };

  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);
  const lines = [];

  let totalGross = 0;
  let totalDeductions = 0;

  for (const rule of sortedRules) {
    if (!rule.is_active) continue;

    let computedAmount = 0;
    let baseAmount = 0;
    let rate = 0;

    switch (rule.calculation_type) {
      case CALCULATION_TYPE.FIXED: {
        computedAmount = parseFloat(rule.fixed_amount || 0);
        baseAmount = computedAmount;
        break;
      }
      case CALCULATION_TYPE.PERCENTAGE: {
        const baseKey = rule.percentage_base_code || 'WAGE';
        baseAmount = context[baseKey] !== undefined ? context[baseKey] : (context.WAGE || 0);
        rate = parseFloat(rule.percentage_rate || 0);
        computedAmount = (baseAmount * rate) / 100.0;
        break;
      }
      case CALCULATION_TYPE.FORMULA:
      case CALCULATION_TYPE.CONDITIONAL: {
        const expr = rule.formula_expression || rule.condition_expression;
        computedAmount = evaluateFormula(expr, context);
        baseAmount = context.GROSS || context.WAGE || 0;
        break;
      }
      default: {
        computedAmount = parseFloat(rule.fixed_amount || 0);
      }
    }

    // Round to 2 decimal places
    computedAmount = Math.round((computedAmount + Number.EPSILON) * 100) / 100;

    // Update context with this rule's output for subsequent dependent rules
    context[rule.code] = computedAmount;

    if (rule.category === 'gross') {
      totalGross = computedAmount;
    } else if (rule.category === 'deduction') {
      totalDeductions += computedAmount;
    } else if (rule.category === 'net') {
      context.NET = computedAmount;
    }

    lines.push({
      rule_id: rule.id,
      rule_name: rule.name,
      rule_code: rule.code,
      category: rule.category,
      sequence: rule.sequence,
      calculation_type: rule.calculation_type,
      base_amount: baseAmount,
      rate: rate,
      amount: computedAmount,
      note: `${rule.calculation_type.toUpperCase()}: ${rule.formula_expression || (rate ? `${rate}% of ${rule.percentage_base_code}` : `Fixed ₹${computedAmount}`)}`
    });
  }

  // Ensure gross & net consistency if not explicitly set by custom rules
  if (totalGross === 0 && context.GROSS) {
    totalGross = context.GROSS;
  }
  let finalNet = context.NET !== undefined ? context.NET : (totalGross - totalDeductions);
  finalNet = Math.max(0, Math.round((finalNet + Number.EPSILON) * 100) / 100);

  return {
    gross: totalGross,
    deductions: totalDeductions,
    net: finalNet,
    lines,
    context
  };
}

module.exports = {
  evaluateFormula,
  executeSalaryRules
};
