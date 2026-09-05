// server/database/seeders.js
const bcrypt = require('bcryptjs');
const db = require('./connection');
const { ROLES, PAYRUN_STATUS, VALIDATION_SEVERITY, VALIDATION_CATEGORY, ATTENDANCE_STATUS, TIME_OFF_STATUS } = require('../config/constants');

async function seedDatabase() {
  const existingUsers = await db('users').count('id as count').first();
  if (parseInt(existingUsers.count, 10) > 0) {
    const existingPayruns = await db('payruns').count('id as count').first();
    if (parseInt(existingPayruns?.count || 0, 10) === 0) {
      try {
        const { seedPayrunsData } = require('./seed_payruns_helper');
        await seedPayrunsData();
      } catch (err) {
        console.error('Error auto-seeding payruns:', err);
      }
    }
    console.log('Database already seeded. Skipping initial seeding.');
    return;
  }

  console.log('Seeding database with comprehensive enterprise demo data...');

  const salt = await bcrypt.genSalt(10);
  const defaultHash = await bcrypt.hash('password123', salt);
  const adminHash = await bcrypt.hash('admin123', salt);
  const hrHash = await bcrypt.hash('hr123', salt);
  const payrollUserHash = await bcrypt.hash('payroll123', salt);
  const payrollMgrHash = await bcrypt.hash('payrollmgr123', salt);
  const empHash = await bcrypt.hash('emp123', salt);

  // 1. Roles
  await db('roles').insert([
    { id: ROLES.ADMIN, name: 'Admin', display_name: 'System Administrator', description: 'Full access to all system features and configurations' },
    { id: ROLES.HR_PAYROLL_MANAGER, name: 'HR Payroll Manager', display_name: 'Payroll Manager', description: 'Can validate, approve, finalize payroll, manage salary rules and HR records' },
    { id: ROLES.HR_PAYROLL_USER, name: 'HR Payroll User', display_name: 'Payroll Specialist', description: 'Can draft payruns, compute payroll, view salary structures and manage HR' },
    { id: ROLES.HR_MANAGER, name: 'HR Manager', display_name: 'HR Manager', description: 'Full management of Employees, Contracts, Schedules, Attendance, and Leave' },
    { id: ROLES.EMPLOYEE, name: 'Employee', display_name: 'Employee', description: 'Employee self-service for profile, attendance, leave, and personal payslips' }
  ]);

  // 2. Permissions
  const permissionsList = [
    { id: 'emp:read', code: 'emp:read', module: 'Employee', description: 'View employees' },
    { id: 'emp:write', code: 'emp:write', module: 'Employee', description: 'Create and edit employees' },
    { id: 'emp:delete', code: 'emp:delete', module: 'Employee', description: 'Delete employees' },
    { id: 'contract:read', code: 'contract:read', module: 'Contract', description: 'View contracts' },
    { id: 'contract:write', code: 'contract:write', module: 'Contract', description: 'Create and edit contracts' },
    { id: 'schedule:write', code: 'schedule:write', module: 'Schedule', description: 'Manage schedules' },
    { id: 'att:read', code: 'att:read', module: 'Attendance', description: 'View attendance logs' },
    { id: 'att:write', code: 'att:write', module: 'Attendance', description: 'Create or correct attendance' },
    { id: 'leave:read', code: 'leave:read', module: 'Time Off', description: 'View leave requests' },
    { id: 'leave:write', code: 'leave:write', module: 'Time Off', description: 'Request leave' },
    { id: 'leave:approve', code: 'leave:approve', module: 'Time Off', description: 'Approve or refuse leave' },
    { id: 'salary:read', code: 'salary:read', module: 'Salary', description: 'View salary structures and rules' },
    { id: 'salary:write', code: 'salary:write', module: 'Salary', description: 'Configure salary rules' },
    { id: 'payrun:read', code: 'payrun:read', module: 'Payroll', description: 'View payruns' },
    { id: 'payrun:create', code: 'payrun:create', module: 'Payroll', description: 'Create and compute payruns' },
    { id: 'payrun:validate', code: 'payrun:validate', module: 'Payroll', description: 'Run pre-flight validations' },
    { id: 'payrun:approve', code: 'payrun:approve', module: 'Payroll', description: 'Approve and finalize payruns' },
    { id: 'payrun:pay', code: 'payrun:pay', module: 'Payroll', description: 'Mark payruns as paid and lock' },
    { id: 'payslip:read', code: 'payslip:read', module: 'Payslip', description: 'View payslips' },
    { id: 'payslip:send', code: 'payslip:send', module: 'Payslip', description: 'Dispatch bulk payslips by email' },
    { id: 'reports:view', code: 'reports:view', module: 'Reports', description: 'View analytics and reports' },
    { id: 'audit:view', code: 'audit:view', module: 'Audit', description: 'View system audit trail' },
    { id: 'admin:config', code: 'admin:config', module: 'Admin', description: 'Manage system settings and users' }
  ];
  await db('permissions').insert(permissionsList);

  // 3. Departments
  const deptData = [
    { name: 'Engineering & Technology', code: 'ENG', cost_center: 'CC-ENG-101', color: '#3b82f6' },
    { name: 'Human Resources', code: 'HR', cost_center: 'CC-HR-102', color: '#ec4899' },
    { name: 'Finance & Accounting', code: 'FIN', cost_center: 'CC-FIN-103', color: '#10b981' },
    { name: 'Product & Design', code: 'PRD', cost_center: 'CC-PRD-104', color: '#8b5cf6' },
    { name: 'Sales & Marketing', code: 'MKT', cost_center: 'CC-MKT-105', color: '#f59e0b' },
    { name: 'Operations & Logistics', code: 'OPS', cost_center: 'CC-OPS-106', color: '#06b6d4' },
    { name: 'Customer Success', code: 'CS', cost_center: 'CC-CS-107', color: '#14b8a6' }
  ];
  const [engDeptId, hrDeptId, finDeptId, prdDeptId, mktDeptId, opsDeptId, csDeptId] = await db('departments').insert(deptData).returning('id');
  const dEng = engDeptId?.id || engDeptId || 1;
  const dHr = hrDeptId?.id || hrDeptId || 2;
  const dFin = finDeptId?.id || finDeptId || 3;
  const dPrd = prdDeptId?.id || prdDeptId || 4;
  const dMkt = mktDeptId?.id || mktDeptId || 5;
  const dOps = opsDeptId?.id || opsDeptId || 6;
  const dCs = csDeptId?.id || csDeptId || 7;

  // 4. Job Positions
  const posData = [
    { title: 'VP of Engineering', department_id: dEng, grade: 'L7', description: 'Engineering leader' },
    { title: 'Staff Software Architect', department_id: dEng, grade: 'L6', description: 'Full-stack system architecture' },
    { title: 'Senior Full Stack Engineer', department_id: dEng, grade: 'L5', description: 'Core application developer' },
    { title: 'Frontend Specialist', department_id: dEng, grade: 'L4', description: 'React UI engineering' },
    { title: 'Backend / Database Engineer', department_id: dEng, grade: 'L4', description: 'API and database development' },
    { title: 'QA Automation Lead', department_id: dEng, grade: 'L5', description: 'Quality assurance' },
    { title: 'Director of People & Culture', department_id: dHr, grade: 'L7', description: 'HR leadership' },
    { title: 'HR Operations Manager', department_id: dHr, grade: 'L5', description: 'Day to day HR processes' },
    { title: 'Senior Talent Partner', department_id: dHr, grade: 'L4', description: 'Talent recruitment' },
    { title: 'Chief Financial Officer', department_id: dFin, grade: 'L8', description: 'Executive financial oversight' },
    { title: 'Payroll Operations Lead', department_id: dFin, grade: 'L5', description: 'Payroll management' },
    { title: 'Senior Financial Analyst', department_id: dFin, grade: 'L4', description: 'Taxation and accounting' },
    { title: 'Lead Product Manager', department_id: dPrd, grade: 'L6', description: 'Product roadmap' },
    { title: 'Principal UI/UX Designer', department_id: dPrd, grade: 'L5', description: 'Design system lead' },
    { title: 'VP of Global Marketing', department_id: dMkt, grade: 'L7', description: 'Marketing strategy' },
    { title: 'Head of Customer Success', department_id: dCs, grade: 'L6', description: 'Client retention' }
  ];
  await db('job_positions').insert(posData);

  // 5. Working Schedules
  const [stdSchedId, flexSchedId, shiftSchedId] = await db('working_schedules').insert([
    { name: 'Standard General Shift (40h/week)', schedule_type: 'standard', timezone: 'Asia/Kolkata', weekly_hours: 40.0 },
    { name: 'Flexible Tech Shift (40h/week)', schedule_type: 'flexible', timezone: 'Asia/Kolkata', weekly_hours: 40.0 },
    { name: 'Support Weekend Shift (36h/week)', schedule_type: 'shift', timezone: 'Asia/Kolkata', weekly_hours: 36.0 }
  ]).returning('id');
  const sStd = stdSchedId?.id || stdSchedId || 1;
  const sFlex = flexSchedId?.id || flexSchedId || 2;
  const sShift = shiftSchedId?.id || shiftSchedId || 3;

  // Schedule Days
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  for (const day of days) {
    await db('schedule_days').insert({
      schedule_id: sStd,
      day_of_week: day,
      is_working: true,
      start_time: '09:00',
      end_time: '18:00',
      break_duration_mins: 60,
      expected_hours: 8.0
    });
    await db('schedule_days').insert({
      schedule_id: sFlex,
      day_of_week: day,
      is_working: true,
      start_time: '10:00',
      end_time: '19:00',
      break_duration_mins: 60,
      expected_hours: 8.0
    });
  }
  await db('schedule_days').insert([
    { schedule_id: sStd, day_of_week: 'saturday', is_working: false, start_time: '00:00', end_time: '00:00', break_duration_mins: 0, expected_hours: 0 },
    { schedule_id: sStd, day_of_week: 'sunday', is_working: false, start_time: '00:00', end_time: '00:00', break_duration_mins: 0, expected_hours: 0 },
    { schedule_id: sFlex, day_of_week: 'saturday', is_working: false, start_time: '00:00', end_time: '00:00', break_duration_mins: 0, expected_hours: 0 },
    { schedule_id: sFlex, day_of_week: 'sunday', is_working: false, start_time: '00:00', end_time: '00:00', break_duration_mins: 0, expected_hours: 0 }
  ]);

  // 6. Time Off Types
  const [clId, slId, plId, lopId] = await db('time_off_types').insert([
    { name: 'Casual Leave (CL)', code: 'CL', unit: 'days', requires_allocation: true, paid: true, color: '#3b82f6' },
    { name: 'Sick / Medical Leave (SL)', code: 'SL', unit: 'days', requires_allocation: true, paid: true, color: '#ec4899' },
    { name: 'Privilege / Earned Leave (PL)', code: 'PL', unit: 'days', requires_allocation: true, paid: true, color: '#10b981' },
    { name: 'Loss of Pay / Unpaid (LOP)', code: 'LOP', unit: 'days', requires_allocation: false, paid: false, color: '#ef4444' }
  ]).returning('id');
  const tCL = clId?.id || clId || 1;
  const tSL = slId?.id || slId || 2;
  const tPL = plId?.id || plId || 3;
  const tLOP = lopId?.id || lopId || 4;

  // 7. Salary Structures
  const [stdStructId, execStructId] = await db('salary_structures').insert([
    { name: 'Standard India IT Structure', code: 'STD_IT_2026', description: 'Standard tech employee compensation structure with Basic, HRA, Special Allowance, PF, PT, TDS', is_active: true },
    { name: 'Executive Leadership Structure', code: 'EXEC_DIR_2026', description: 'Executive compensation package with performance bonus and higher tax brackets', is_active: true }
  ]).returning('id');
  const stStd = stdStructId?.id || stdStructId || 1;
  const stExec = execStructId?.id || execStructId || 2;

  // 8. Salary Rules for Standard IT Structure
  await db('salary_rules').insert([
    {
      structure_id: stStd,
      name: 'Basic Salary',
      code: 'BASIC',
      category: 'basic',
      sequence: 10,
      calculation_type: 'percentage',
      percentage_rate: 50.0,
      percentage_base_code: 'WAGE',
      formula_expression: 'WAGE * 0.50',
      is_active: true
    },
    {
      structure_id: stStd,
      name: 'House Rent Allowance (HRA)',
      code: 'HRA',
      category: 'allowance',
      sequence: 20,
      calculation_type: 'percentage',
      percentage_rate: 40.0,
      percentage_base_code: 'BASIC',
      formula_expression: 'BASIC * 0.40',
      depends_on_codes: 'BASIC',
      is_active: true
    },
    {
      structure_id: stStd,
      name: 'Special Allowance',
      code: 'SPECIAL_ALLOWANCE',
      category: 'allowance',
      sequence: 30,
      calculation_type: 'formula',
      formula_expression: 'WAGE - (BASIC + HRA)',
      depends_on_codes: 'BASIC,HRA',
      is_active: true
    },
    {
      structure_id: stStd,
      name: 'Overtime Pay',
      code: 'OVERTIME',
      category: 'allowance',
      sequence: 40,
      calculation_type: 'formula',
      formula_expression: '(WAGE / 160) * 1.5 * OVERTIME_HOURS',
      is_active: true
    },
    {
      structure_id: stStd,
      name: 'Gross Earnings',
      code: 'GROSS',
      category: 'gross',
      sequence: 50,
      calculation_type: 'formula',
      formula_expression: 'BASIC + HRA + SPECIAL_ALLOWANCE + OVERTIME',
      depends_on_codes: 'BASIC,HRA,SPECIAL_ALLOWANCE,OVERTIME',
      is_active: true
    },
    {
      structure_id: stStd,
      name: 'Provident Fund (Employee PF 12%)',
      code: 'PF_EE',
      category: 'deduction',
      sequence: 60,
      calculation_type: 'formula',
      formula_expression: 'Math.min(BASIC, 15000) * 0.12',
      depends_on_codes: 'BASIC',
      is_active: true
    },
    {
      structure_id: stStd,
      name: 'Professional Tax (PT)',
      code: 'PT',
      category: 'deduction',
      sequence: 70,
      calculation_type: 'fixed',
      fixed_amount: 200.0,
      is_active: true
    },
    {
      structure_id: stStd,
      name: 'Income Tax (TDS)',
      code: 'TDS',
      category: 'deduction',
      sequence: 80,
      calculation_type: 'formula',
      formula_expression: 'GROSS > 75000 ? (GROSS - PF_EE - PT) * 0.10 : (GROSS > 50000 ? (GROSS - PF_EE - PT) * 0.05 : 0)',
      depends_on_codes: 'GROSS,PF_EE,PT',
      is_active: true
    },
    {
      structure_id: stStd,
      name: 'Loss of Pay Deduction (LOP)',
      code: 'LOP_DEDUCTION',
      category: 'deduction',
      sequence: 90,
      calculation_type: 'formula',
      formula_expression: '(GROSS / TOTAL_DAYS) * UNPAID_DAYS',
      depends_on_codes: 'GROSS',
      is_active: true
    },
    {
      structure_id: stStd,
      name: 'Net Salary',
      code: 'NET',
      category: 'net',
      sequence: 100,
      calculation_type: 'formula',
      formula_expression: 'GROSS - (PF_EE + PT + TDS + LOP_DEDUCTION)',
      depends_on_codes: 'GROSS,PF_EE,PT,TDS,LOP_DEDUCTION',
      is_active: true
    }
  ]);

  // 9. 52 Realistic Employees dataset
  const employeeRaw = [
    { empId: 'EMP-1001', fn: 'Aarav', ln: 'Sharma', email: 'aarav.sharma@peoplepay360.com', phone: '+91 98201 45678', dept: dEng, pos: 1, mgr: null, wage: 240000, bank: 'HDFC Bank', acc: '50100456789123', ifsc: 'HDFC0000128', pan: 'ABCPS1001A', status: 'Active', gender: 'Male', type: 'Full-time', join: '2022-01-15' },
    { empId: 'EMP-1002', fn: 'Aditi', ln: 'Verma', email: 'aditi.verma@peoplepay360.com', phone: '+91 98201 45679', dept: dHr, pos: 7, mgr: 1, wage: 180000, bank: 'ICICI Bank', acc: '001205678912', ifsc: 'ICIC0000012', pan: 'ABCPS1002B', status: 'Active', gender: 'Female', type: 'Full-time', join: '2022-02-01' },
    { empId: 'EMP-1003', fn: 'Vikram', ln: 'Singhania', email: 'vikram.singhania@peoplepay360.com', phone: '+91 98201 45680', dept: dFin, pos: 10, mgr: 1, wage: 220000, bank: 'State Bank of India', acc: '30456789012', ifsc: 'SBIN0000456', pan: 'ABCPS1003C', status: 'Active', gender: 'Male', type: 'Full-time', join: '2022-03-10' },
    { empId: 'EMP-1004', fn: 'Priya', ln: 'Nambiar', email: 'priya.nambiar@peoplepay360.com', phone: '+91 98201 45681', dept: dPrd, pos: 13, mgr: 1, wage: 195000, bank: 'Axis Bank', acc: '914010045678912', ifsc: 'UTIB0000140', pan: 'ABCPS1004D', status: 'Active', gender: 'Female', type: 'Full-time', join: '2022-04-01' },
    { empId: 'EMP-1005', fn: 'Rohan', ln: 'Mehta', email: 'rohan.mehta@peoplepay360.com', phone: '+91 98201 45682', dept: dEng, pos: 2, mgr: 1, wage: 175000, bank: 'HDFC Bank', acc: '50100456789124', ifsc: 'HDFC0000128', pan: 'ABCPS1005E', status: 'Active', gender: 'Male', type: 'Full-time', join: '2022-05-15' },
    { empId: 'EMP-1006', fn: 'Kavita', ln: 'Iyer', email: 'kavita.iyer@peoplepay360.com', phone: '+91 98201 45683', dept: dFin, pos: 11, mgr: 3, wage: 135000, bank: 'Kotak Mahindra Bank', acc: '1234567890', ifsc: 'KKBK0000123', pan: 'ABCPS1006F', status: 'Active', gender: 'Female', type: 'Full-time', join: '2022-06-01' },
    { empId: 'EMP-1007', fn: 'Anand', ln: 'Kulkarni', email: 'anand.kulkarni@peoplepay360.com', phone: '+91 98201 45684', dept: dHr, pos: 8, mgr: 2, wage: 115000, bank: 'HDFC Bank', acc: '50100456789125', ifsc: 'HDFC0000128', pan: 'ABCPS1007G', status: 'Active', gender: 'Male', type: 'Full-time', join: '2022-07-01' },
    // Notice: Amit Patel has deliberate salary variance
    { empId: 'EMP-1008', fn: 'Amit', ln: 'Patel', email: 'amit.patel@peoplepay360.com', phone: '+91 98201 45685', dept: dEng, pos: 3, mgr: 5, wage: 145000, bank: 'ICICI Bank', acc: '001205678913', ifsc: 'ICIC0000012', pan: 'ABCPS1008H', status: 'Active', gender: 'Male', type: 'Full-time', join: '2022-08-01' },
    { empId: 'EMP-1009', fn: 'Sneha', ln: 'Reddy', email: 'sneha.reddy@peoplepay360.com', phone: '+91 98201 45686', dept: dEng, pos: 3, mgr: 5, wage: 130000, bank: 'State Bank of India', acc: '30456789013', ifsc: 'SBIN0000456', pan: 'ABCPS1009I', status: 'Active', gender: 'Female', type: 'Full-time', join: '2022-09-01' },
    { empId: 'EMP-1010', fn: 'Rajesh', ln: 'Gupta', email: 'rajesh.gupta@peoplepay360.com', phone: '+91 98201 45687', dept: dEng, pos: 4, mgr: 5, wage: 95000, bank: 'Axis Bank', acc: '914010045678913', ifsc: 'UTIB0000140', pan: 'ABCPS1010J', status: 'Active', gender: 'Male', type: 'Full-time', join: '2022-10-15' },
    { empId: 'EMP-1011', fn: 'Divya', ln: 'Deshmukh', email: 'divya.deshmukh@peoplepay360.com', phone: '+91 98201 45688', dept: dPrd, pos: 14, mgr: 4, wage: 120000, bank: 'HDFC Bank', acc: '50100456789126', ifsc: 'HDFC0000128', pan: 'ABCPS1011K', status: 'Active', gender: 'Female', type: 'Full-time', join: '2022-11-01' },
    { empId: 'EMP-1012', fn: 'Karthik', ln: 'Subramanian', email: 'karthik.sub@peoplepay360.com', phone: '+91 98201 45689', dept: dEng, pos: 5, mgr: 5, wage: 105000, bank: 'ICICI Bank', acc: '001205678914', ifsc: 'ICIC0000012', pan: 'ABCPS1012L', status: 'Active', gender: 'Male', type: 'Full-time', join: '2022-12-01' },
    { empId: 'EMP-1013', fn: 'Neha', ln: 'Kapoor', email: 'neha.kapoor@peoplepay360.com', phone: '+91 98201 45690', dept: dMkt, pos: 15, mgr: 1, wage: 160000, bank: 'State Bank of India', acc: '30456789014', ifsc: 'SBIN0000456', pan: 'ABCPS1013M', status: 'Active', gender: 'Female', type: 'Full-time', join: '2023-01-10' },
    // Deliberate Blocker: Missing Bank Details for Rahul Sharma
    { empId: 'EMP-1014', fn: 'Rahul', ln: 'Sharma', email: 'rahul.sharma@peoplepay360.com', phone: '+91 98201 45691', dept: dEng, pos: 4, mgr: 5, wage: 88000, bank: null, acc: null, ifsc: null, pan: 'ABCPS1014N', status: 'Active', gender: 'Male', type: 'Full-time', join: '2023-02-01' },
    { empId: 'EMP-1015', fn: 'Tanvi', ln: 'Bhattacharya', email: 'tanvi.b@peoplepay360.com', phone: '+91 98201 45692', dept: dFin, pos: 12, mgr: 6, wage: 92000, bank: 'HDFC Bank', acc: '50100456789127', ifsc: 'HDFC0000128', pan: 'ABCPS1015O', status: 'Active', gender: 'Female', type: 'Full-time', join: '2023-03-01' },
    { empId: 'EMP-1016', fn: 'Deepak', ln: 'Chopra', email: 'deepak.chopra@peoplepay360.com', phone: '+91 98201 45693', dept: dEng, pos: 6, mgr: 1, wage: 125000, bank: 'Kotak Mahindra Bank', acc: '1234567891', ifsc: 'KKBK0000123', pan: 'ABCPS1016P', status: 'Active', gender: 'Male', type: 'Full-time', join: '2023-03-15' },
    { empId: 'EMP-1017', fn: 'Sanya', ln: 'Malhotra', email: 'sanya.m@peoplepay360.com', phone: '+91 98201 45694', dept: dHr, pos: 9, mgr: 7, wage: 78000, bank: 'Axis Bank', acc: '914010045678914', ifsc: 'UTIB0000140', pan: 'ABCPS1017Q', status: 'Active', gender: 'Female', type: 'Full-time', join: '2023-04-01' },
    { empId: 'EMP-1018', fn: 'Gaurav', ln: 'Joshi', email: 'gaurav.joshi@peoplepay360.com', phone: '+91 98201 45695', dept: dCs, pos: 16, mgr: 1, wage: 140000, bank: 'ICICI Bank', acc: '001205678915', ifsc: 'ICIC0000012', pan: 'ABCPS1018R', status: 'Active', gender: 'Male', type: 'Full-time', join: '2023-05-01' },
    // Deliberate Attendance Exception: Missing Check-out for Pooja Verma
    { empId: 'EMP-1019', fn: 'Pooja', ln: 'Verma', email: 'pooja.verma@peoplepay360.com', phone: '+91 98201 45696', dept: dEng, pos: 4, mgr: 5, wage: 82000, bank: 'State Bank of India', acc: '30456789015', ifsc: 'SBIN0000456', pan: 'ABCPS1019S', status: 'Active', gender: 'Female', type: 'Full-time', join: '2023-06-01' },
    { empId: 'EMP-1020', fn: 'Nikhil', ln: 'Saxena', email: 'nikhil.saxena@peoplepay360.com', phone: '+91 98201 45697', dept: dEng, pos: 5, mgr: 5, wage: 85000, bank: 'HDFC Bank', acc: '50100456789128', ifsc: 'HDFC0000128', pan: 'ABCPS1020T', status: 'Active', gender: 'Male', type: 'Full-time', join: '2023-07-01' },
    { empId: 'EMP-1021', fn: 'Shruti', ln: 'Hegde', email: 'shruti.hegde@peoplepay360.com', phone: '+91 98201 45698', dept: dPrd, pos: 14, mgr: 11, wage: 90000, bank: 'ICICI Bank', acc: '001205678916', ifsc: 'ICIC0000012', pan: 'ABCPS1021U', status: 'Active', gender: 'Female', type: 'Full-time', join: '2023-08-01' },
    { empId: 'EMP-1022', fn: 'Varun', ln: 'Choudhary', email: 'varun.c@peoplepay360.com', phone: '+91 98201 45699', dept: dOps, pos: 16, mgr: 1, wage: 95000, bank: 'Axis Bank', acc: '914010045678915', ifsc: 'UTIB0000140', pan: 'ABCPS1022V', status: 'Active', gender: 'Male', type: 'Full-time', join: '2023-09-01' },
    { empId: 'EMP-1023', fn: 'Ritu', ln: 'Sen', email: 'ritu.sen@peoplepay360.com', phone: '+91 98201 45700', dept: dMkt, pos: 15, mgr: 13, wage: 86000, bank: 'State Bank of India', acc: '30456789016', ifsc: 'SBIN0000456', pan: 'ABCPS1023W', status: 'Active', gender: 'Female', type: 'Full-time', join: '2023-10-01' },
    { empId: 'EMP-1024', fn: 'Abhishek', ln: 'Trivedi', email: 'abhishek.t@peoplepay360.com', phone: '+91 98201 45701', dept: dEng, pos: 3, mgr: 5, wage: 128000, bank: 'HDFC Bank', acc: '50100456789129', ifsc: 'HDFC0000128', pan: 'ABCPS1024X', status: 'Active', gender: 'Male', type: 'Full-time', join: '2023-11-01' },
    { empId: 'EMP-1025', fn: 'Ankita', ln: 'Nair', email: 'ankita.nair@peoplepay360.com', phone: '+91 98201 45702', dept: dEng, pos: 4, mgr: 5, wage: 80000, bank: 'Kotak Mahindra Bank', acc: '1234567892', ifsc: 'KKBK0000123', pan: 'ABCPS1025Y', status: 'Active', gender: 'Female', type: 'Full-time', join: '2023-12-01' },
    { empId: 'EMP-1026', fn: 'Manoj', ln: 'Bhardwaj', email: 'manoj.b@peoplepay360.com', phone: '+91 98201 45703', dept: dFin, pos: 12, mgr: 6, wage: 87000, bank: 'ICICI Bank', acc: '001205678917', ifsc: 'ICIC0000012', pan: 'ABCPS1026Z', status: 'Active', gender: 'Male', type: 'Full-time', join: '2024-01-08' },
    { empId: 'EMP-1027', fn: 'Harish', ln: 'Rao', email: 'harish.rao@peoplepay360.com', phone: '+91 98201 45704', dept: dEng, pos: 5, mgr: 5, wage: 94000, bank: 'Axis Bank', acc: '914010045678916', ifsc: 'UTIB0000140', pan: 'ABCPS1027A', status: 'Active', gender: 'Male', type: 'Full-time', join: '2024-02-01' },
    // Missing Bank Details for Meera Nair
    { empId: 'EMP-1028', fn: 'Meera', ln: 'Nair', email: 'meera.nair@peoplepay360.com', phone: '+91 98201 45705', dept: dHr, pos: 9, mgr: 7, wage: 68000, bank: null, acc: null, ifsc: null, pan: 'ABCPS1028B', status: 'Active', gender: 'Female', type: 'Full-time', join: '2024-02-15' },
    { empId: 'EMP-1029', fn: 'Siddharth', ln: 'Pandey', email: 'siddharth.p@peoplepay360.com', phone: '+91 98201 45706', dept: dPrd, pos: 13, mgr: 4, wage: 110000, bank: 'HDFC Bank', acc: '50100456789130', ifsc: 'HDFC0000128', pan: 'ABCPS1029C', status: 'Active', gender: 'Male', type: 'Full-time', join: '2024-03-01' },
    { empId: 'EMP-1030', fn: 'Ishita', ln: 'Roy', email: 'ishita.roy@peoplepay360.com', phone: '+91 98201 45707', dept: dCs, pos: 16, mgr: 18, wage: 75000, bank: 'State Bank of India', acc: '30456789017', ifsc: 'SBIN0000456', pan: 'ABCPS1030D', status: 'Active', gender: 'Female', type: 'Full-time', join: '2024-03-15' },
    { empId: 'EMP-1031', fn: 'Karan', ln: 'Singhal', email: 'karan.s@peoplepay360.com', phone: '+91 98201 45708', dept: dEng, pos: 4, mgr: 5, wage: 83000, bank: 'ICICI Bank', acc: '001205678918', ifsc: 'ICIC0000012', pan: 'ABCPS1031E', status: 'Active', gender: 'Male', type: 'Full-time', join: '2024-04-01' },
    { empId: 'EMP-1032', fn: 'Simran', ln: 'Kaur', email: 'simran.kaur@peoplepay360.com', phone: '+91 98201 45709', dept: dMkt, pos: 15, mgr: 13, wage: 76000, bank: 'Kotak Mahindra Bank', acc: '1234567893', ifsc: 'KKBK0000123', pan: 'ABCPS1032F', status: 'Active', gender: 'Female', type: 'Full-time', join: '2024-04-15' },
    // Expired Contract for Rohan Das
    { empId: 'EMP-1033', fn: 'Rohan', ln: 'Das', email: 'rohan.das@peoplepay360.com', phone: '+91 98201 45710', dept: dOps, pos: 16, mgr: 22, wage: 72000, bank: 'Axis Bank', acc: '914010045678917', ifsc: 'UTIB0000140', pan: 'ABCPS1033G', status: 'Active', gender: 'Male', type: 'Contract', join: '2024-05-01' },
    { empId: 'EMP-1034', fn: 'Swati', ln: 'Mishra', email: 'swati.m@peoplepay360.com', phone: '+91 98201 45711', dept: dEng, pos: 5, mgr: 5, wage: 89000, bank: 'HDFC Bank', acc: '50100456789131', ifsc: 'HDFC0000128', pan: 'ABCPS1034H', status: 'Active', gender: 'Female', type: 'Full-time', join: '2024-05-15' },
    { empId: 'EMP-1035', fn: 'Prateek', ln: 'Goyal', email: 'prateek.g@peoplepay360.com', phone: '+91 98201 45712', dept: dFin, pos: 12, mgr: 6, wage: 84000, bank: 'State Bank of India', acc: '30456789018', ifsc: 'SBIN0000456', pan: 'ABCPS1035I', status: 'Active', gender: 'Male', type: 'Full-time', join: '2024-06-01' },
    { empId: 'EMP-1036', fn: 'Ananya', ln: 'Sen', email: 'ananya.sen@peoplepay360.com', phone: '+91 98201 45713', dept: dPrd, pos: 14, mgr: 11, wage: 93000, bank: 'ICICI Bank', acc: '001205678919', ifsc: 'ICIC0000012', pan: 'ABCPS1036J', status: 'Active', gender: 'Female', type: 'Full-time', join: '2024-06-15' },
    { empId: 'EMP-1037', fn: 'Tushar', ln: 'Saxena', email: 'tushar.s@peoplepay360.com', phone: '+91 98201 45714', dept: dEng, pos: 4, mgr: 5, wage: 81000, bank: 'Kotak Mahindra Bank', acc: '1234567894', ifsc: 'KKBK0000123', pan: 'ABCPS1037K', status: 'Active', gender: 'Male', type: 'Full-time', join: '2024-07-01' },
    { empId: 'EMP-1038', fn: 'Bhavna', ln: 'Rastogi', email: 'bhavna.r@peoplepay360.com', phone: '+91 98201 45715', dept: dHr, pos: 9, mgr: 7, wage: 71000, bank: 'Axis Bank', acc: '914010045678918', ifsc: 'UTIB0000140', pan: 'ABCPS1038L', status: 'Active', gender: 'Female', type: 'Full-time', join: '2024-07-15' },
    { empId: 'EMP-1039', fn: 'Arjun', ln: 'Varma', email: 'arjun.v@peoplepay360.com', phone: '+91 98201 45716', dept: dEng, pos: 3, mgr: 5, wage: 122000, bank: 'HDFC Bank', acc: '50100456789132', ifsc: 'HDFC0000128', pan: 'ABCPS1039M', status: 'Active', gender: 'Male', type: 'Full-time', join: '2024-08-01' },
    { empId: 'EMP-1040', fn: 'Kritika', ln: 'Menon', email: 'kritika.m@peoplepay360.com', phone: '+91 98201 45717', dept: dCs, pos: 16, mgr: 18, wage: 77000, bank: 'ICICI Bank', acc: '001205678920', ifsc: 'ICIC0000012', pan: 'ABCPS1040N', status: 'Active', gender: 'Female', type: 'Full-time', join: '2024-08-15' },
    { empId: 'EMP-1041', fn: 'Yash', ln: 'Aggarwal', email: 'yash.a@peoplepay360.com', phone: '+91 98201 45718', dept: dEng, pos: 4, mgr: 5, wage: 79000, bank: 'State Bank of India', acc: '30456789019', ifsc: 'SBIN0000456', pan: 'ABCPS1041O', status: 'Active', gender: 'Male', type: 'Full-time', join: '2024-09-01' },
    { empId: 'EMP-1042', fn: 'Shweta', ln: 'Tiwari', email: 'shweta.t@peoplepay360.com', phone: '+91 98201 45719', dept: dMkt, pos: 15, mgr: 13, wage: 74000, bank: 'Axis Bank', acc: '914010045678919', ifsc: 'UTIB0000140', pan: 'ABCPS1042P', status: 'Active', gender: 'Female', type: 'Full-time', join: '2024-09-15' },
    { empId: 'EMP-1043', fn: 'Alok', ln: 'Nath', email: 'alok.nath@peoplepay360.com', phone: '+91 98201 45720', dept: dOps, pos: 16, mgr: 22, wage: 69000, bank: 'Kotak Mahindra Bank', acc: '1234567895', ifsc: 'KKBK0000123', pan: 'ABCPS1043Q', status: 'Active', gender: 'Male', type: 'Full-time', join: '2024-10-01' },
    { empId: 'EMP-1044', fn: 'Pallavi', ln: 'Joshi', email: 'pallavi.j@peoplepay360.com', phone: '+91 98201 45721', dept: dFin, pos: 12, mgr: 6, wage: 83000, bank: 'HDFC Bank', acc: '50100456789133', ifsc: 'HDFC0000128', pan: 'ABCPS1044R', status: 'Active', gender: 'Female', type: 'Full-time', join: '2024-10-15' },
    // Probation employee
    { empId: 'EMP-1045', fn: 'Ananya', ln: 'Rao', email: 'ananya.rao@peoplepay360.com', phone: '+91 98201 45722', dept: dEng, pos: 4, mgr: 5, wage: 75000, bank: 'ICICI Bank', acc: '001205678921', ifsc: 'ICIC0000012', pan: 'ABCPS1045S', status: 'Probation', gender: 'Female', type: 'Full-time', join: '2026-06-01' },
    { empId: 'EMP-1046', fn: 'Manish', ln: 'Dubey', email: 'manish.d@peoplepay360.com', phone: '+91 98201 45723', dept: dEng, pos: 5, mgr: 5, wage: 86000, bank: 'State Bank of India', acc: '30456789020', ifsc: 'SBIN0000456', pan: 'ABCPS1046T', status: 'Active', gender: 'Male', type: 'Full-time', join: '2025-01-10' },
    { empId: 'EMP-1047', fn: 'Juhi', ln: 'Chawla', email: 'juhi.c@peoplepay360.com', phone: '+91 98201 45724', dept: dHr, pos: 9, mgr: 7, wage: 67000, bank: 'Axis Bank', acc: '914010045678920', ifsc: 'UTIB0000140', pan: 'ABCPS1047U', status: 'Active', gender: 'Female', type: 'Full-time', join: '2025-02-01' },
    { empId: 'EMP-1048', fn: 'Suresh', ln: 'Raina', email: 'suresh.r@peoplepay360.com', phone: '+91 98201 45725', dept: dPrd, pos: 14, mgr: 11, wage: 91000, bank: 'Kotak Mahindra Bank', acc: '1234567896', ifsc: 'KKBK0000123', pan: 'ABCPS1048V', status: 'Active', gender: 'Male', type: 'Full-time', join: '2025-03-01' },
    { empId: 'EMP-1049', fn: 'Natasha', ln: 'Fernandes', email: 'natasha.f@peoplepay360.com', phone: '+91 98201 45726', dept: dMkt, pos: 15, mgr: 13, wage: 78000, bank: 'HDFC Bank', acc: '50100456789134', ifsc: 'HDFC0000128', pan: 'ABCPS1049W', status: 'Active', gender: 'Female', type: 'Full-time', join: '2025-04-01' },
    { empId: 'EMP-1050', fn: 'Dinesh', ln: 'Karthik', email: 'dinesh.k@peoplepay360.com', phone: '+91 98201 45727', dept: dCs, pos: 16, mgr: 18, wage: 76000, bank: 'ICICI Bank', acc: '001205678922', ifsc: 'ICIC0000012', pan: 'ABCPS1050X', status: 'Active', gender: 'Male', type: 'Full-time', join: '2025-05-01' },
    { empId: 'EMP-1051', fn: 'Rhea', ln: 'Kapoor', email: 'rhea.kapoor@peoplepay360.com', phone: '+91 98201 45728', dept: dEng, pos: 4, mgr: 5, wage: 82000, bank: 'State Bank of India', acc: '30456789021', ifsc: 'SBIN0000456', pan: 'ABCPS1051Y', status: 'Active', gender: 'Female', type: 'Full-time', join: '2025-06-01' },
    { empId: 'EMP-1052', fn: 'Kunal', ln: 'Shah', email: 'kunal.shah@peoplepay360.com', phone: '+91 98201 45729', dept: dEng, pos: 3, mgr: 5, wage: 135000, bank: 'Axis Bank', acc: '914010045678921', ifsc: 'UTIB0000140', pan: 'ABCPS1052Z', status: 'Active', gender: 'Male', type: 'Full-time', join: '2025-07-01' }
  ];

  const insertedEmployees = [];
  for (const emp of employeeRaw) {
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fn}_${emp.ln}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    const [insertedId] = await db('employees').insert({
      employee_id: emp.empId,
      first_name: emp.fn,
      last_name: emp.ln,
      email: emp.email,
      phone: emp.phone,
      date_of_birth: '1992-05-14',
      gender: emp.gender,
      address: '104 Silicon Valley Towers, Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560103',
      country: 'India',
      emergency_name: 'Anjali ' + emp.ln,
      emergency_phone: '+91 98111 22334',
      emergency_relation: 'Spouse',
      department_id: emp.dept,
      job_position_id: emp.pos,
      manager_id: emp.mgr,
      employee_type: emp.type,
      employment_status: emp.status,
      joining_date: emp.join,
      schedule_id: sStd,
      bank_name: emp.bank,
      account_number: emp.acc,
      ifsc_code: emp.ifsc,
      pan_number: emp.pan,
      uan_number: '100987654321',
      avatar_url: avatar,
      notes: 'Key team member'
    }).returning('id');

    const empDbId = insertedId?.id || insertedId;
    insertedEmployees.push({ ...emp, dbId: empDbId });

    // Insert Contract for each employee
    const isExpired = emp.empId === 'EMP-1033';
    await db('contracts').insert({
      contract_id: `CNT-${emp.empId}`,
      employee_id: empDbId,
      start_date: emp.join,
      end_date: isExpired ? '2026-06-30' : '2028-12-31',
      department_id: emp.dept,
      job_position_id: emp.pos,
      employment_type: emp.type,
      wage: emp.wage,
      wage_type: 'monthly',
      salary_structure_id: stStd,
      working_schedule_id: sStd,
      status: isExpired ? 'expired' : 'active',
      contract_notes: isExpired ? 'Contract expired on 30 June 2026. Needs renewal!' : 'Standard annual compensation agreement'
    });

    // Leave allocations for 2026
    await db('time_off_allocations').insert([
      { employee_id: empDbId, leave_type_id: tCL, year: 2026, allocated_days: 12.0, used_days: 2.0, pending_days: 0.0, remaining_days: 10.0, valid_from: '2026-01-01', valid_to: '2026-12-31', status: 'active' },
      { employee_id: empDbId, leave_type_id: tSL, year: 2026, allocated_days: 10.0, used_days: 1.0, pending_days: 0.0, remaining_days: 9.0, valid_from: '2026-01-01', valid_to: '2026-12-31', status: 'active' },
      { employee_id: empDbId, leave_type_id: tPL, year: 2026, allocated_days: 18.0, used_days: 3.0, pending_days: 0.0, remaining_days: 15.0, valid_from: '2026-01-01', valid_to: '2026-12-31', status: 'active' }
    ]);
  }

  // 10. Demo User Accounts
  await db('users').insert([
    { username: 'admin', email: 'admin@peoplepay360.com', password_hash: adminHash, role: ROLES.ADMIN, employee_id: insertedEmployees[0].dbId, is_active: true },
    { username: 'hr_manager', email: 'hrmanager@peoplepay360.com', password_hash: hrHash, role: ROLES.HR_MANAGER, employee_id: insertedEmployees[1].dbId, is_active: true },
    { username: 'payroll_user', email: 'payrolluser@peoplepay360.com', password_hash: payrollUserHash, role: ROLES.HR_PAYROLL_USER, employee_id: insertedEmployees[5].dbId, is_active: true },
    { username: 'payroll_manager', email: 'payrollmgr@peoplepay360.com', password_hash: payrollMgrHash, role: ROLES.HR_PAYROLL_MANAGER, employee_id: insertedEmployees[2].dbId, is_active: true },
    { username: 'employee', email: 'employee@peoplepay360.com', password_hash: empHash, role: ROLES.EMPLOYEE, employee_id: insertedEmployees[7].dbId, is_active: true }
  ]);

  // 11. Attendance Records for current month (August 2026)
  const augDays = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'];
  for (let i = 0; i < insertedEmployees.length; i++) {
    const emp = insertedEmployees[i];
    for (const dt of augDays) {
      let status = ATTENDANCE_STATUS.PRESENT;
      let checkIn = '09:05';
      let checkOut = '18:05';
      let workedHours = 8.0;
      let lateMins = 5;
      let otHours = 0;

      // Deliberate exception for Pooja Verma on 2026-08-18
      if (emp.empId === 'EMP-1019' && dt === '2026-08-18') {
        status = ATTENDANCE_STATUS.MISSING_CHECKOUT;
        checkIn = '09:12';
        checkOut = null;
        workedHours = 0;
        lateMins = 12;
      } else if (emp.empId === 'EMP-1008' && dt === '2026-08-14') {
        status = ATTENDANCE_STATUS.OVERTIME;
        checkIn = '09:00';
        checkOut = '22:00';
        workedHours = 12.0;
        otHours = 4.0;
      }

      await db('attendance').insert({
        employee_id: emp.dbId,
        date: dt,
        check_in: checkIn,
        check_out: checkOut,
        worked_hours: workedHours,
        expected_hours: 8.0,
        overtime_hours: otHours,
        late_minutes: lateMins,
        status: status,
        source: 'Biometric Scanner'
      });
    }
  }

  // 12. Time Off Requests
  await db('time_off_requests').insert([
    {
      employee_id: insertedEmployees[7].dbId, // Amit Patel
      leave_type_id: tCL,
      start_date: '2026-08-24',
      end_date: '2026-08-25',
      duration_days: 2.0,
      reason: 'Family function in Ahmedabad',
      status: TIME_OFF_STATUS.APPROVED,
      approver_id: 2,
      approver_comment: 'Approved. Enjoy!',
      approved_at: '2026-08-15 10:30:00'
    },
    {
      employee_id: insertedEmployees[9].dbId, // Rajesh Gupta
      leave_type_id: tSL,
      start_date: '2026-08-28',
      end_date: '2026-08-28',
      duration_days: 1.0,
      reason: 'Doctor appointment for routine checkup',
      status: TIME_OFF_STATUS.SUBMITTED
    },
    {
      employee_id: insertedEmployees[13].dbId, // Rahul Sharma
      leave_type_id: tPL,
      start_date: '2026-09-01',
      end_date: '2026-09-05',
      duration_days: 5.0,
      reason: 'Annual vacation trip to Ladakh',
      status: TIME_OFF_STATUS.SUBMITTED
    }
  ]);

  // 13. System Settings
  await db('system_settings').insert([
    { key: 'company_name', value: 'PeoplePay360 Global Technologies Ltd.', category: 'company', description: 'Registered legal company name' },
    { key: 'company_address', value: 'Level 14, Prestige Tech Park IV, Marathahalli, Bengaluru, Karnataka 560103', category: 'company', description: 'Registered corporate headquarters' },
    { key: 'company_tax_id', value: '29ABCDE1234F1Z5', category: 'company', description: 'GSTIN / Corporate Tax Registration' },
    { key: 'currency', value: 'INR', category: 'payroll', description: 'Default system currency code' },
    { key: 'currency_symbol', value: '₹', category: 'payroll', description: 'Currency symbol for payslips and UI' },
    { key: 'overtime_rate_multiplier', value: '1.5', category: 'payroll', description: 'Multiplier for overtime compensation calculation' },
    { key: 'lop_policy', value: 'calendar_days', category: 'payroll', description: 'Method of deduction for unpaid leave (calendar vs working days)' },
    { key: 'variance_threshold_percent', value: '15.0', category: 'payroll', description: 'Anomaly detection threshold percentage' },
    { key: 'email_notifications_enabled', value: 'true', category: 'notifications', description: 'Send automated email notifications' }
  ]);

  // 14. Prior Finalized Payrun (July 2026 - PAID)
  const [julyPayrunId] = await db('payruns').insert({
    payrun_number: 'PR-2026-07',
    title: 'July 2026 Regular Monthly Payrun',
    period_start: '2026-07-01',
    period_end: '2026-07-31',
    payment_date: '2026-08-01',
    salary_structure_id: stStd,
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
  }).returning('id');
  const julId = julyPayrunId?.id || julyPayrunId || 1;

  // Insert sample payslips for July
  for (let i = 0; i < 10; i++) {
    const emp = insertedEmployees[i];
    const gross = emp.wage;
    const basic = gross * 0.50;
    const hra = basic * 0.40;
    const sa = gross - (basic + hra);
    const pf = Math.min(basic, 15000) * 0.12;
    const pt = 200;
    const tds = gross > 75000 ? (gross - pf - pt) * 0.10 : 0;
    const net = gross - (pf + pt + tds);

    const [pId] = await db('payslips').insert({
      payslip_number: `PS-2026-07-${emp.empId}`,
      payrun_id: julId,
      employee_id: emp.dbId,
      contract_id: 1,
      salary_structure_id: stStd,
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
    }).returning('id');
    const payslipDbId = pId?.id || pId;

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

  // 15. Current Active Payrun (August 2026 - VALIDATION_REQUIRED)
  const [augPayrunId] = await db('payruns').insert({
    payrun_number: 'PR-2026-08',
    title: 'August 2026 Monthly Payroll Cycle',
    period_start: '2026-08-01',
    period_end: '2026-08-31',
    payment_date: '2026-09-01',
    salary_structure_id: stStd,
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
  }).returning('id');
  const augId = augPayrunId?.id || augPayrunId || 2;

  // Insert Pre-Flight Validation Issues for August Payrun demonstrating blockers and warnings
  await db('payroll_validation_issues').insert([
    {
      payrun_id: augId,
      employee_id: insertedEmployees[13].dbId, // Rahul Sharma
      category: VALIDATION_CATEGORY.BANK,
      severity: VALIDATION_SEVERITY.BLOCKER,
      title: 'Missing Bank Account Details',
      description: 'Rahul Sharma does not have an active bank account or IFSC number on file.',
      impact: 'Payment cannot be disbursed via direct bank transfer.',
      recommended_action: 'Update employee bank details in Employee 360 profile.',
      is_resolved: false
    },
    {
      payrun_id: augId,
      employee_id: insertedEmployees[27].dbId, // Meera Nair
      category: VALIDATION_CATEGORY.BANK,
      severity: VALIDATION_SEVERITY.BLOCKER,
      title: 'Missing Bank Account Details',
      description: 'Meera Nair does not have bank account details configured.',
      impact: 'Direct deposit file generation will fail.',
      recommended_action: 'Add valid Account Number and IFSC Code.',
      is_resolved: false
    },
    {
      payrun_id: augId,
      employee_id: insertedEmployees[32].dbId, // Rohan Das
      category: VALIDATION_CATEGORY.CONTRACT,
      severity: VALIDATION_SEVERITY.BLOCKER,
      title: 'Contract Expired Prior to Payroll Period',
      description: 'Rohan Das contract expired on 30 June 2026 and no renewal contract was found for August 2026.',
      impact: 'Unauthorized salary disbursement risk.',
      recommended_action: 'Renew or extend contract in Contract Management before processing.',
      is_resolved: false
    },
    {
      payrun_id: augId,
      employee_id: insertedEmployees[18].dbId, // Pooja Verma
      category: VALIDATION_CATEGORY.ATTENDANCE,
      severity: VALIDATION_SEVERITY.WARNING,
      title: 'Unresolved Missing Checkout',
      description: 'Missing checkout recorded on 18 August 2026.',
      impact: 'Worked hours calculated as 0 for that shift, potentially lowering payable hours.',
      recommended_action: 'Review and approve attendance correction entry in Attendance module.',
      is_resolved: false
    },
    {
      payrun_id: augId,
      employee_id: insertedEmployees[7].dbId, // Amit Patel
      category: VALIDATION_CATEGORY.SALARY,
      severity: VALIDATION_SEVERITY.WARNING,
      title: 'Unusual Overtime Spike (>30% variance)',
      description: 'Overtime compensation increased significantly compared to previous month (4h logged on 14 Aug).',
      impact: 'Gross payout exceeds standard budgeted compensation.',
      recommended_action: 'Verify overtime log with Engineering manager.',
      is_resolved: false
    },
    {
      payrun_id: augId,
      employee_id: insertedEmployees[44].dbId, // Ananya Rao
      category: VALIDATION_CATEGORY.TIME_OFF,
      severity: VALIDATION_SEVERITY.INFO,
      title: 'Probationary Employee Leave Allocation Notice',
      description: 'Ananya Rao is on probation; leave balances are subject to 6-month probation policy.',
      impact: 'Informational only.',
      recommended_action: 'No action required if probation leave policy is verified.',
      is_resolved: true
    }
  ]);

  // Insert Payroll Variances for August Payrun
  await db('payroll_variances').insert([
    {
      payrun_id: augId,
      employee_id: insertedEmployees[7].dbId, // Amit Patel
      prev_payrun_id: julId,
      prev_net: 114500.0,
      curr_net: 148850.0,
      delta_amount: 34350.0,
      delta_percentage: 29.9,
      variance_category: 'Overtime & Salary Revision',
      variance_reason: 'High overtime logged and merit wage adjustment',
      is_flagged: true
    },
    {
      payrun_id: augId,
      employee_id: insertedEmployees[18].dbId, // Pooja Verma
      prev_payrun_id: julId,
      prev_net: 71200.0,
      curr_net: 68500.0,
      delta_amount: -2700.0,
      delta_percentage: -3.8,
      variance_category: 'Missing Checkout Hours',
      variance_reason: '1 day unconfirmed hours',
      is_flagged: false
    }
  ]);

  // 16. Audit Logs
  await db('audit_logs').insert([
    {
      user_id: 1,
      user_name: 'Aarav Sharma',
      user_role: ROLES.ADMIN,
      action: 'SYSTEM_INITIALIZATION',
      entity: 'System',
      entity_id: 'SYS-001',
      old_values: null,
      new_values: JSON.stringify({ version: '3.6.0', db: 'PostgreSQL / SQLite' }),
      reason: 'Platform setup and database migration',
      ip_address: '127.0.0.1'
    },
    {
      user_id: 4,
      user_name: 'Vikram Singhania',
      user_role: ROLES.HR_PAYROLL_MANAGER,
      action: 'PAYRUN_COMPUTATION',
      entity: 'Payrun',
      entity_id: 'PR-2026-08',
      old_values: JSON.stringify({ status: 'draft' }),
      new_values: JSON.stringify({ status: 'validation_required', total_employees: 52 }),
      reason: 'Triggered automated batch computation for August period',
      ip_address: '192.168.1.45'
    }
  ]);

  // 17. Notifications
  await db('notifications').insert([
    {
      user_id: 4,
      type: 'PAYROLL_VALIDATION_ALERT',
      title: '3 Blockers in August 2026 Payrun',
      message: 'Pre-flight check detected 3 blockers (Missing bank details & expired contracts) requiring resolution before approval.',
      link: '/payroll/validation/2',
      is_read: false
    },
    {
      user_id: 2,
      type: 'LEAVE_REQUEST_PENDING',
      title: 'Pending Leave Request from Rajesh Gupta',
      message: 'Rajesh Gupta submitted Sick Leave request for 28 Aug 2026.',
      link: '/time-off',
      is_read: false
    }
  ]);

  console.log('Database seeded successfully with 52 employees, contracts, schedules, attendance, payruns, and pre-flight validations.');
}

module.exports = { seedDatabase };
