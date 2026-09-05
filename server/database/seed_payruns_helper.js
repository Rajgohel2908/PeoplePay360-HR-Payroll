// server/database/seed_payruns_helper.js
const db = require('./connection');
const { PAYRUN_STATUS, VALIDATION_SEVERITY, VALIDATION_CATEGORY } = require('../config/constants');

async function seedPayrunsData() {
  console.log('Checking payruns table...');
  const countRes = await db('payruns').count('id as count').first();
  const currentCount = parseInt(countRes?.count || 0, 10);
  console.log(`Current payruns in database: ${currentCount}`);

  if (currentCount >= 4) {
    console.log('Payruns already sufficiently populated.');
    return;
  }

  console.log('Seeding 6-month trend payruns (March 2026 to August 2026)...');

  // Clear existing payrun data if any partial exists to ensure clean structure
  await db('payroll_validation_issues').del();
  await db('payroll_variances').del();
  await db('payslip_lines').del();
  await db('payslips').del();
  await db('payruns').del();

  const payrunsToInsert = [
    {
      payrun_number: 'PR-2026-03',
      title: 'March 2026 Monthly Payrun',
      period_start: '2026-03-01',
      period_end: '2026-03-31',
      payment_date: '2026-04-01',
      salary_structure_id: 1,
      department_id: null,
      employee_type: 'All',
      status: PAYRUN_STATUS.PAID,
      total_employees: 48,
      total_gross: 4950000.0,
      total_deductions: 570000.0,
      total_net: 4380000.0,
      total_overtime: 32000.0,
      total_lop: 12000.0,
      prepared_by: 3,
      reviewed_by: 4,
      approved_by: 4,
      approved_at: '2026-03-30 17:00:00',
      paid_at: '2026-04-01 10:00:00',
      notes: 'Executed and disbursed to all 48 active staff accounts.'
    },
    {
      payrun_number: 'PR-2026-04',
      title: 'April 2026 Monthly Payrun',
      period_start: '2026-04-01',
      period_end: '2026-04-30',
      payment_date: '2026-05-01',
      salary_structure_id: 1,
      department_id: null,
      employee_type: 'All',
      status: PAYRUN_STATUS.PAID,
      total_employees: 49,
      total_gross: 5120000.0,
      total_deductions: 580000.0,
      total_net: 4540000.0,
      total_overtime: 36000.0,
      total_lop: 14000.0,
      prepared_by: 3,
      reviewed_by: 4,
      approved_by: 4,
      approved_at: '2026-04-29 17:00:00',
      paid_at: '2026-05-01 10:00:00',
      notes: 'Executed and disbursed to all 49 active staff accounts.'
    },
    {
      payrun_number: 'PR-2026-05',
      title: 'May 2026 Monthly Payrun',
      period_start: '2026-05-01',
      period_end: '2026-05-31',
      payment_date: '2026-06-01',
      salary_structure_id: 1,
      department_id: null,
      employee_type: 'All',
      status: PAYRUN_STATUS.PAID,
      total_employees: 50,
      total_gross: 5280000.0,
      total_deductions: 590000.0,
      total_net: 4690000.0,
      total_overtime: 41000.0,
      total_lop: 11000.0,
      prepared_by: 3,
      reviewed_by: 4,
      approved_by: 4,
      approved_at: '2026-05-30 17:00:00',
      paid_at: '2026-06-01 10:00:00',
      notes: 'Executed and disbursed to all 50 active staff accounts.'
    },
    {
      payrun_number: 'PR-2026-06',
      title: 'June 2026 Monthly Payrun',
      period_start: '2026-06-01',
      period_end: '2026-06-30',
      payment_date: '2026-07-01',
      salary_structure_id: 1,
      department_id: null,
      employee_type: 'All',
      status: PAYRUN_STATUS.PAID,
      total_employees: 50,
      total_gross: 5390000.0,
      total_deductions: 610000.0,
      total_net: 4780000.0,
      total_overtime: 39000.0,
      total_lop: 15000.0,
      prepared_by: 3,
      reviewed_by: 4,
      approved_by: 4,
      approved_at: '2026-06-29 17:00:00',
      paid_at: '2026-07-01 10:00:00',
      notes: 'Executed and disbursed to all 50 active staff accounts.'
    },
    {
      payrun_number: 'PR-2026-07',
      title: 'July 2026 Regular Monthly Payrun',
      period_start: '2026-07-01',
      period_end: '2026-07-31',
      payment_date: '2026-08-01',
      salary_structure_id: 1,
      department_id: null,
      employee_type: 'All',
      status: PAYRUN_STATUS.PAID,
      total_employees: 50,
      total_gross: 5450000.0,
      total_deductions: 625000.0,
      total_net: 4825000.0,
      total_overtime: 45000.0,
      total_lop: 18000.0,
      prepared_by: 3,
      reviewed_by: 4,
      approved_by: 4,
      approved_at: '2026-07-30 17:00:00',
      paid_at: '2026-08-01 10:00:00',
      notes: 'Successfully executed and disbursed to all 50 staff accounts.'
    },
    {
      payrun_number: 'PR-2026-08',
      title: 'August 2026 Monthly Payroll Cycle',
      period_start: '2026-08-01',
      period_end: '2026-08-31',
      payment_date: '2026-09-01',
      salary_structure_id: 1,
      department_id: null,
      employee_type: 'All',
      status: PAYRUN_STATUS.VALIDATION_REQUIRED,
      total_employees: 52,
      total_gross: 5680000.0,
      total_deductions: 648000.0,
      total_net: 5032000.0,
      total_overtime: 52000.0,
      total_lop: 14500.0,
      prepared_by: 3,
      reviewed_by: null,
      approved_by: null,
      notes: 'Computed cycle awaiting pre-flight exception resolution.'
    }
  ];

  for (const pr of payrunsToInsert) {
    await db('payruns').insert(pr);
  }

  // Fetch August payrun ID
  const augPayrun = await db('payruns').where('payrun_number', 'PR-2026-08').first();
  const julPayrun = await db('payruns').where('payrun_number', 'PR-2026-07').first();
  const employees = await db('employees').limit(50);

  if (augPayrun && employees.length > 0) {
    // Insert pre-flight validation issues for August payrun
    await db('payroll_validation_issues').insert([
      {
        payrun_id: augPayrun.id,
        employee_id: employees[13]?.id || employees[0].id,
        category: VALIDATION_CATEGORY.BANK,
        severity: VALIDATION_SEVERITY.BLOCKER,
        title: 'Missing Bank Account Details',
        description: 'Rahul Sharma does not have an active bank account or IFSC number on file.',
        impact: 'Payment disbursements will fail without valid bank account details.',
        recommended_action: 'Update bank details in Employee 360 profile before approving.',
        is_resolved: false
      },
      {
        payrun_id: augPayrun.id,
        employee_id: employees[27]?.id || employees[1].id,
        category: VALIDATION_CATEGORY.BANK,
        severity: VALIDATION_SEVERITY.BLOCKER,
        title: 'Missing Bank Account Details',
        description: 'Meera Nair does not have an active bank account or IFSC number on file.',
        impact: 'Payment disbursements will fail without valid bank account details.',
        recommended_action: 'Update bank details in Employee 360 profile before approving.',
        is_resolved: false
      },
      {
        payrun_id: augPayrun.id,
        employee_id: employees[32]?.id || employees[2].id,
        category: VALIDATION_CATEGORY.CONTRACT,
        severity: VALIDATION_SEVERITY.BLOCKER,
        title: 'Contract Expired Prior to Payroll Period',
        description: 'Rohan Das contract expired on 30 June 2026 and no renewal contract was found for August 2026.',
        impact: 'Unauthorized salary disbursement risk.',
        recommended_action: 'Renew or extend contract in Contract Management before processing.',
        is_resolved: false
      },
      {
        payrun_id: augPayrun.id,
        employee_id: employees[18]?.id || employees[3].id,
        category: VALIDATION_CATEGORY.ATTENDANCE,
        severity: VALIDATION_SEVERITY.WARNING,
        title: 'Unresolved Missing Checkout',
        description: 'Missing checkout recorded on 18 August 2026.',
        impact: 'Worked hours calculated as 0 for that shift, potentially lowering payable hours.',
        recommended_action: 'Review and approve attendance correction entry in Attendance module.',
        is_resolved: false
      }
    ]);
  }

  // Insert sample payslips for July
  if (julPayrun && employees.length > 0) {
    for (let i = 0; i < Math.min(employees.length, 10); i++) {
      const emp = employees[i];
      const gross = emp.wage || 75000;
      const basic = gross * 0.50;
      const hra = basic * 0.40;
      const sa = gross - (basic + hra);
      const pf = Math.min(basic, 15000) * 0.12;
      const pt = 200;
      const tds = gross > 75000 ? (gross - pf - pt) * 0.10 : 0;
      const net = gross - (pf + pt + tds);

      const [payslipDbId] = await db('payslips').insert({
        payslip_number: `PS-2026-07-${emp.employee_id}`,
        payrun_id: julPayrun.id,
        employee_id: emp.id,
        contract_id: 1,
        salary_structure_id: 1,
        period_start: '2026-07-01',
        period_end: '2026-07-31',
        worked_days: 22.0,
        paid_days: 22.0,
        unpaid_days: 0.0,
        overtime_hours: 0.0,
        gross_salary: gross,
        total_deductions: pf + pt + tds,
        net_salary: net,
        payment_status: 'Paid',
        email_status: 'Sent',
        sent_at: '2026-08-01 11:00:00'
      });

      if (payslipDbId) {
        await db('payslip_lines').insert([
          { payslip_id: payslipDbId, rule_name: 'Basic Salary', rule_code: 'BASIC', category: 'basic', sequence: 10, calculation_type: 'percentage', base_amount: gross, rate: 50.0, amount: basic },
          { payslip_id: payslipDbId, rule_name: 'House Rent Allowance (HRA)', rule_code: 'HRA', category: 'allowance', sequence: 20, calculation_type: 'percentage', base_amount: basic, rate: 40.0, amount: hra },
          { payslip_id: payslipDbId, rule_name: 'Special Allowance', rule_code: 'SPECIAL_ALLOWANCE', category: 'allowance', sequence: 30, calculation_type: 'formula', base_amount: gross, rate: 0, amount: sa },
          { payslip_id: payslipDbId, rule_name: 'Provident Fund (Employee)', rule_code: 'PF_EE', category: 'deduction', sequence: 60, calculation_type: 'percentage', base_amount: 15000, rate: 12.0, amount: pf },
          { payslip_id: payslipDbId, rule_name: 'Professional Tax', rule_code: 'PT', category: 'deduction', sequence: 70, calculation_type: 'fixed', base_amount: 0, rate: 0, amount: pt },
          { payslip_id: payslipDbId, rule_name: 'TDS / Income Tax', rule_code: 'TDS', category: 'deduction', sequence: 80, calculation_type: 'formula', base_amount: gross - pf - pt, rate: 10.0, amount: tds },
          { payslip_id: payslipDbId, rule_name: 'Net Pay', rule_code: 'NET', category: 'net', sequence: 100, calculation_type: 'formula', base_amount: gross, rate: 0, amount: net }
        ]);
      }
    }
  }

  console.log('✓ Successfully seeded 6-month payruns, validation issues, and payslips!');
}

if (require.main === module) {
  seedPayrunsData()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error seeding payruns:', err);
      process.exit(1);
    });
}

module.exports = { seedPayrunsData };
