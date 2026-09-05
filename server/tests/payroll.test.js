// server/tests/payroll.test.js
const { evaluateFormula, executeSalaryRules } = require('../payroll/salaryRuleEngine');
const { CALCULATION_TYPE } = require('../config/constants');

describe('PEOPLEPAY360 - Payroll Calculation Engine & Salary Rules', () => {
  test('evaluateFormula correctly executes sandboxed mathematical expressions', () => {
    const context = {
      WAGE: 100000,
      BASIC: 50000,
      HRA: 20000,
      GROSS: 100000,
      TOTAL_DAYS: 30,
      UNPAID_DAYS: 2
    };

    const expr1 = 'WAGE * 0.50';
    expect(evaluateFormula(expr1, context)).toBe(50000);

    const expr2 = 'WAGE - (BASIC + HRA)';
    expect(evaluateFormula(expr2, context)).toBe(30000);

    const lopExpr = '(GROSS / TOTAL_DAYS) * UNPAID_DAYS';
    expect(Math.round(evaluateFormula(lopExpr, context) * 100) / 100).toBe(6666.67);

    const conditionalExpr = 'GROSS > 75000 ? 5000 : 2000';
    expect(evaluateFormula(conditionalExpr, context)).toBe(5000);
  });

  test('executeSalaryRules executes ordered sequence rules and builds accurate net breakdown', () => {
    const sampleRules = [
      { id: 1, name: 'Basic Salary', code: 'BASIC', category: 'basic', sequence: 10, calculation_type: CALCULATION_TYPE.PERCENTAGE, percentage_rate: 50.0, percentage_base_code: 'WAGE', is_active: true },
      { id: 2, name: 'HRA', code: 'HRA', category: 'allowance', sequence: 20, calculation_type: CALCULATION_TYPE.PERCENTAGE, percentage_rate: 40.0, percentage_base_code: 'BASIC', is_active: true },
      { id: 3, name: 'Special Allowance', code: 'SPECIAL_ALLOWANCE', category: 'allowance', sequence: 30, calculation_type: CALCULATION_TYPE.FORMULA, formula_expression: 'WAGE - (BASIC + HRA)', is_active: true },
      { id: 4, name: 'Gross Salary', code: 'GROSS', category: 'gross', sequence: 40, calculation_type: CALCULATION_TYPE.FORMULA, formula_expression: 'BASIC + HRA + SPECIAL_ALLOWANCE', is_active: true },
      { id: 5, name: 'Employee PF', code: 'PF_EE', category: 'deduction', sequence: 50, calculation_type: CALCULATION_TYPE.FORMULA, formula_expression: 'Math.min(BASIC, 15000) * 0.12', is_active: true },
      { id: 6, name: 'Professional Tax', code: 'PT', category: 'deduction', sequence: 60, calculation_type: CALCULATION_TYPE.FIXED, fixed_amount: 200, is_active: true },
      { id: 7, name: 'TDS Tax', code: 'TDS', category: 'deduction', sequence: 70, calculation_type: CALCULATION_TYPE.FORMULA, formula_expression: '(GROSS - PF_EE - PT) * 0.10', is_active: true },
      { id: 8, name: 'Net Pay', code: 'NET', category: 'net', sequence: 100, calculation_type: CALCULATION_TYPE.FORMULA, formula_expression: 'GROSS - (PF_EE + PT + TDS)', is_active: true }
    ];

    const baseParams = {
      WAGE: 100000,
      TOTAL_DAYS: 30,
      EXPECTED_DAYS: 22,
      WORKED_DAYS: 22,
      PAID_DAYS: 22,
      UNPAID_DAYS: 0,
      OVERTIME_HOURS: 0
    };

    const result = executeSalaryRules(sampleRules, baseParams);

    expect(result.context.BASIC).toBe(50000);
    expect(result.context.HRA).toBe(20000);
    expect(result.context.SPECIAL_ALLOWANCE).toBe(30000);
    expect(result.gross).toBe(100000);
    expect(result.context.PF_EE).toBe(1800); // 15000 * 0.12
    expect(result.context.PT).toBe(200);
    expect(result.context.TDS).toBe(9800); // (100000 - 1800 - 200) * 0.10 = 9800
    expect(result.deductions).toBe(1800 + 200 + 9800); // 11800
    expect(result.net).toBe(88200); // 100000 - 11800 = 88200
    expect(result.lines.length).toBe(8);
  });
});
