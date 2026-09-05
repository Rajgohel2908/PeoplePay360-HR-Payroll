// server/database/migrations.js
const db = require('./connection');

async function runMigrations() {
  console.log('Running database migrations...');

  // 1. Roles
  if (!(await db.schema.hasTable('roles'))) {
    await db.schema.createTable('roles', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('display_name').notNullable();
      table.text('description');
    });
  }

  // 2. Permissions
  if (!(await db.schema.hasTable('permissions'))) {
    await db.schema.createTable('permissions', (table) => {
      table.string('id').primary();
      table.string('code').unique().notNullable();
      table.string('module').notNullable();
      table.text('description');
    });
  }

  // 3. Role Permissions
  if (!(await db.schema.hasTable('role_permissions'))) {
    await db.schema.createTable('role_permissions', (table) => {
      table.increments('id').primary();
      table.string('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
      table.string('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
      table.unique(['role_id', 'permission_id']);
    });
  }

  // 4. Departments
  if (!(await db.schema.hasTable('departments'))) {
    await db.schema.createTable('departments', (table) => {
      table.increments('id').primary();
      table.string('name').unique().notNullable();
      table.string('code').unique().notNullable();
      table.integer('manager_id');
      table.string('cost_center');
      table.string('color').defaultTo('#4f46e5');
      table.timestamps(true, true);
    });
  }

  // 5. Job Positions
  if (!(await db.schema.hasTable('job_positions'))) {
    await db.schema.createTable('job_positions', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.integer('department_id').references('id').inTable('departments').onDelete('SET NULL');
      table.string('grade');
      table.text('description');
      table.timestamps(true, true);
    });
  }

  // 6. Working Schedules
  if (!(await db.schema.hasTable('working_schedules'))) {
    await db.schema.createTable('working_schedules', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('schedule_type').defaultTo('standard'); // standard, flexible, shift
      table.string('timezone').defaultTo('Asia/Kolkata');
      table.decimal('weekly_hours', 5, 2).defaultTo(40.0);
      table.timestamps(true, true);
    });
  }

  // 7. Schedule Days
  if (!(await db.schema.hasTable('schedule_days'))) {
    await db.schema.createTable('schedule_days', (table) => {
      table.increments('id').primary();
      table.integer('schedule_id').notNullable().references('id').inTable('working_schedules').onDelete('CASCADE');
      table.string('day_of_week').notNullable(); // monday, tuesday, etc.
      table.boolean('is_working').defaultTo(true);
      table.string('start_time').defaultTo('09:00');
      table.string('end_time').defaultTo('18:00');
      table.integer('break_duration_mins').defaultTo(60);
      table.decimal('expected_hours', 4, 2).defaultTo(8.0);
      table.unique(['schedule_id', 'day_of_week']);
    });
  }

  // 8. Employees
  if (!(await db.schema.hasTable('employees'))) {
    await db.schema.createTable('employees', (table) => {
      table.increments('id').primary();
      table.string('employee_id').unique().notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('email').unique().notNullable();
      table.string('phone');
      table.date('date_of_birth');
      table.string('gender');
      table.string('address');
      table.string('city');
      table.string('state');
      table.string('postal_code');
      table.string('country').defaultTo('India');
      table.string('emergency_name');
      table.string('emergency_phone');
      table.string('emergency_relation');
      table.integer('department_id').references('id').inTable('departments').onDelete('SET NULL');
      table.integer('job_position_id').references('id').inTable('job_positions').onDelete('SET NULL');
      table.integer('manager_id').references('id').inTable('employees').onDelete('SET NULL');
      table.string('employee_type').defaultTo('Full-time'); // Full-time, Part-time, Contract, Intern
      table.string('employment_status').defaultTo('Active'); // Active, Probation, Notice, Resigned, Terminated
      table.date('joining_date').notNullable();
      table.date('exit_date');
      table.integer('schedule_id').references('id').inTable('working_schedules').onDelete('SET NULL');
      table.string('bank_name');
      table.string('account_number');
      table.string('ifsc_code');
      table.string('pan_number');
      table.string('uan_number');
      table.string('avatar_url');
      table.text('notes');
      table.timestamps(true, true);
      table.index(['department_id', 'employment_status']);
    });
  }

  // 9. Users
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').unique().notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('role').notNullable().references('id').inTable('roles');
      table.integer('employee_id').references('id').inTable('employees').onDelete('SET NULL');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // 10. Salary Structures
  if (!(await db.schema.hasTable('salary_structures'))) {
    await db.schema.createTable('salary_structures', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').unique().notNullable();
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // 11. Salary Rules
  if (!(await db.schema.hasTable('salary_rules'))) {
    await db.schema.createTable('salary_rules', (table) => {
      table.increments('id').primary();
      table.integer('structure_id').notNullable().references('id').inTable('salary_structures').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('code').notNullable();
      table.string('category').notNullable(); // basic, allowance, gross, deduction, contribution, net
      table.integer('sequence').notNullable().defaultTo(1);
      table.string('calculation_type').notNullable().defaultTo('fixed'); // fixed, percentage, formula, conditional
      table.decimal('fixed_amount', 12, 2).defaultTo(0);
      table.decimal('percentage_rate', 6, 2).defaultTo(0);
      table.string('percentage_base_code');
      table.text('formula_expression');
      table.text('condition_expression');
      table.string('depends_on_codes'); // comma separated
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.index(['structure_id', 'sequence']);
    });
  }

  // 12. Contracts
  if (!(await db.schema.hasTable('contracts'))) {
    await db.schema.createTable('contracts', (table) => {
      table.increments('id').primary();
      table.string('contract_id').unique().notNullable();
      table.integer('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.date('start_date').notNullable();
      table.date('end_date');
      table.integer('department_id').references('id').inTable('departments').onDelete('SET NULL');
      table.integer('job_position_id').references('id').inTable('job_positions').onDelete('SET NULL');
      table.string('employment_type').defaultTo('Full-time');
      table.decimal('wage', 12, 2).notNullable();
      table.string('wage_type').defaultTo('monthly'); // monthly, hourly
      table.integer('salary_structure_id').references('id').inTable('salary_structures').onDelete('RESTRICT');
      table.integer('working_schedule_id').references('id').inTable('working_schedules').onDelete('SET NULL');
      table.string('status').defaultTo('active'); // draft, active, expired, terminated
      table.text('contract_notes');
      table.timestamps(true, true);
      table.index(['employee_id', 'status', 'start_date', 'end_date']);
    });
  }

  // 13. Attendance
  if (!(await db.schema.hasTable('attendance'))) {
    await db.schema.createTable('attendance', (table) => {
      table.increments('id').primary();
      table.integer('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.date('date').notNullable();
      table.string('check_in');
      table.string('check_out');
      table.decimal('worked_hours', 5, 2).defaultTo(0);
      table.decimal('expected_hours', 5, 2).defaultTo(8.0);
      table.decimal('overtime_hours', 5, 2).defaultTo(0);
      table.integer('late_minutes').defaultTo(0);
      table.string('status').defaultTo('present');
      table.string('source').defaultTo('Web');
      table.text('notes');
      table.integer('corrected_by').references('id').inTable('users').onDelete('SET NULL');
      table.text('correction_reason');
      table.timestamps(true, true);
      table.unique(['employee_id', 'date']);
      table.index(['employee_id', 'date', 'status']);
    });
  }

  // 14. Time Off Types
  if (!(await db.schema.hasTable('time_off_types'))) {
    await db.schema.createTable('time_off_types', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').unique().notNullable();
      table.string('unit').defaultTo('days');
      table.boolean('requires_allocation').defaultTo(true);
      table.boolean('paid').defaultTo(true);
      table.string('color').defaultTo('#10b981');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // 15. Time Off Allocations
  if (!(await db.schema.hasTable('time_off_allocations'))) {
    await db.schema.createTable('time_off_allocations', (table) => {
      table.increments('id').primary();
      table.integer('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('leave_type_id').notNullable().references('id').inTable('time_off_types').onDelete('CASCADE');
      table.integer('year').notNullable();
      table.decimal('allocated_days', 5, 2).notNullable().defaultTo(0);
      table.decimal('used_days', 5, 2).defaultTo(0);
      table.decimal('pending_days', 5, 2).defaultTo(0);
      table.decimal('remaining_days', 5, 2).notNullable().defaultTo(0);
      table.date('valid_from').notNullable();
      table.date('valid_to').notNullable();
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
      table.unique(['employee_id', 'leave_type_id', 'year']);
    });
  }

  // 16. Time Off Requests
  if (!(await db.schema.hasTable('time_off_requests'))) {
    await db.schema.createTable('time_off_requests', (table) => {
      table.increments('id').primary();
      table.integer('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('leave_type_id').notNullable().references('id').inTable('time_off_types').onDelete('RESTRICT');
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.decimal('duration_days', 5, 2).notNullable();
      table.text('reason');
      table.string('status').defaultTo('submitted'); // draft, submitted, approved, refused, cancelled
      table.integer('approver_id').references('id').inTable('users').onDelete('SET NULL');
      table.text('approver_comment');
      table.datetime('approved_at');
      table.timestamps(true, true);
      table.index(['employee_id', 'status', 'start_date', 'end_date']);
    });
  }

  // 17. Payruns
  if (!(await db.schema.hasTable('payruns'))) {
    await db.schema.createTable('payruns', (table) => {
      table.increments('id').primary();
      table.string('payrun_number').unique().notNullable();
      table.string('title').notNullable();
      table.date('period_start').notNullable();
      table.date('period_end').notNullable();
      table.date('payment_date');
      table.integer('salary_structure_id').references('id').inTable('salary_structures').onDelete('SET NULL');
      table.integer('department_id').references('id').inTable('departments').onDelete('SET NULL');
      table.string('employee_type');
      table.string('status').defaultTo('draft');
      table.integer('total_employees').defaultTo(0);
      table.decimal('total_gross', 14, 2).defaultTo(0);
      table.decimal('total_deductions', 14, 2).defaultTo(0);
      table.decimal('total_net', 14, 2).defaultTo(0);
      table.decimal('total_overtime', 12, 2).defaultTo(0);
      table.decimal('total_lop', 12, 2).defaultTo(0);
      table.integer('prepared_by').references('id').inTable('users').onDelete('SET NULL');
      table.integer('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
      table.integer('approved_by').references('id').inTable('users').onDelete('SET NULL');
      table.datetime('approved_at');
      table.datetime('paid_at');
      table.text('notes');
      table.timestamps(true, true);
      table.index(['status', 'period_start', 'period_end']);
    });
  }

  // 18. Payrun Employees
  if (!(await db.schema.hasTable('payrun_employees'))) {
    await db.schema.createTable('payrun_employees', (table) => {
      table.increments('id').primary();
      table.integer('payrun_id').notNullable().references('id').inTable('payruns').onDelete('CASCADE');
      table.integer('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('contract_id').references('id').inTable('contracts').onDelete('SET NULL');
      table.boolean('is_included').defaultTo(true);
      table.string('exclusion_reason');
      table.timestamps(true, true);
      table.unique(['payrun_id', 'employee_id']);
    });
  }

  // 19. Payslips
  if (!(await db.schema.hasTable('payslips'))) {
    await db.schema.createTable('payslips', (table) => {
      table.increments('id').primary();
      table.string('payslip_number').unique().notNullable();
      table.integer('payrun_id').notNullable().references('id').inTable('payruns').onDelete('CASCADE');
      table.integer('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('contract_id').references('id').inTable('contracts').onDelete('RESTRICT');
      table.integer('salary_structure_id').references('id').inTable('salary_structures').onDelete('RESTRICT');
      table.date('period_start').notNullable();
      table.date('period_end').notNullable();
      table.decimal('worked_days', 5, 2).defaultTo(0);
      table.decimal('paid_days', 5, 2).defaultTo(0);
      table.decimal('unpaid_days', 5, 2).defaultTo(0);
      table.decimal('overtime_hours', 5, 2).defaultTo(0);
      table.decimal('gross_salary', 12, 2).defaultTo(0);
      table.decimal('total_deductions', 12, 2).defaultTo(0);
      table.decimal('net_salary', 12, 2).defaultTo(0);
      table.string('payment_status').defaultTo('Unpaid');
      table.string('email_status').defaultTo('Pending');
      table.datetime('sent_at');
      table.timestamps(true, true);
      table.unique(['payrun_id', 'employee_id']);
      table.index(['employee_id', 'period_start', 'period_end']);
    });
  }

  // 20. Payslip Lines
  if (!(await db.schema.hasTable('payslip_lines'))) {
    await db.schema.createTable('payslip_lines', (table) => {
      table.increments('id').primary();
      table.integer('payslip_id').notNullable().references('id').inTable('payslips').onDelete('CASCADE');
      table.integer('rule_id');
      table.string('rule_name').notNullable();
      table.string('rule_code').notNullable();
      table.string('category').notNullable();
      table.integer('sequence').defaultTo(1);
      table.string('calculation_type');
      table.decimal('base_amount', 12, 2).defaultTo(0);
      table.decimal('rate', 8, 4).defaultTo(0);
      table.decimal('amount', 12, 2).notNullable().defaultTo(0);
      table.text('note');
      table.index(['payslip_id', 'sequence']);
    });
  }

  // 21. Payroll Validation Issues
  if (!(await db.schema.hasTable('payroll_validation_issues'))) {
    await db.schema.createTable('payroll_validation_issues', (table) => {
      table.increments('id').primary();
      table.integer('payrun_id').notNullable().references('id').inTable('payruns').onDelete('CASCADE');
      table.integer('employee_id').references('id').inTable('employees').onDelete('CASCADE');
      table.string('category').notNullable();
      table.string('severity').notNullable(); // blocker, warning, info
      table.string('title').notNullable();
      table.text('description').notNullable();
      table.text('impact');
      table.text('recommended_action');
      table.boolean('is_resolved').defaultTo(false);
      table.integer('resolved_by').references('id').inTable('users').onDelete('SET NULL');
      table.datetime('resolved_at');
      table.text('resolution_notes');
      table.timestamps(true, true);
      table.index(['payrun_id', 'severity', 'is_resolved']);
    });
  }

  // 22. Payroll Variances
  if (!(await db.schema.hasTable('payroll_variances'))) {
    await db.schema.createTable('payroll_variances', (table) => {
      table.increments('id').primary();
      table.integer('payrun_id').notNullable().references('id').inTable('payruns').onDelete('CASCADE');
      table.integer('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('prev_payrun_id').references('id').inTable('payruns').onDelete('SET NULL');
      table.decimal('prev_net', 12, 2).defaultTo(0);
      table.decimal('curr_net', 12, 2).defaultTo(0);
      table.decimal('delta_amount', 12, 2).defaultTo(0);
      table.decimal('delta_percentage', 6, 2).defaultTo(0);
      table.string('variance_category');
      table.text('variance_reason');
      table.boolean('is_flagged').defaultTo(false);
      table.timestamps(true, true);
      table.index(['payrun_id', 'is_flagged']);
    });
  }

  // 23. Notifications
  if (!(await db.schema.hasTable('notifications'))) {
    await db.schema.createTable('notifications', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('type').notNullable();
      table.string('title').notNullable();
      table.text('message').notNullable();
      table.string('link');
      table.boolean('is_read').defaultTo(false);
      table.text('metadata');
      table.timestamps(true, true);
      table.index(['user_id', 'is_read']);
    });
  }

  // 24. Audit Logs
  if (!(await db.schema.hasTable('audit_logs'))) {
    await db.schema.createTable('audit_logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('user_name');
      table.string('user_role');
      table.string('action').notNullable();
      table.string('entity').notNullable();
      table.string('entity_id');
      table.text('old_values');
      table.text('new_values');
      table.text('reason');
      table.string('ip_address');
      table.timestamps(true, true);
      table.index(['entity', 'entity_id', 'created_at']);
    });
  }

  // 25. Documents
  if (!(await db.schema.hasTable('documents'))) {
    await db.schema.createTable('documents', (table) => {
      table.increments('id').primary();
      table.integer('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.string('title').notNullable();
      table.string('file_name').notNullable();
      table.string('file_type');
      table.integer('file_size');
      table.string('document_type'); // ID, Contract, Resume, Certificate
      table.integer('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
    });
  }

  // 26. Email Logs
  if (!(await db.schema.hasTable('email_logs'))) {
    await db.schema.createTable('email_logs', (table) => {
      table.increments('id').primary();
      table.integer('payrun_id').references('id').inTable('payruns').onDelete('CASCADE');
      table.integer('payslip_id').references('id').inTable('payslips').onDelete('CASCADE');
      table.integer('employee_id').references('id').inTable('employees').onDelete('CASCADE');
      table.string('recipient_email').notNullable();
      table.string('subject').notNullable();
      table.string('status').defaultTo('Sent'); // Sent, Failed, Pending
      table.text('error_message');
      table.datetime('sent_at');
      table.timestamps(true, true);
    });
  }

  // 27. System Settings
  if (!(await db.schema.hasTable('system_settings'))) {
    await db.schema.createTable('system_settings', (table) => {
      table.increments('id').primary();
      table.string('key').unique().notNullable();
      table.text('value').notNullable();
      table.string('category').defaultTo('general');
      table.text('description');
      table.timestamps(true, true);
    });
  }

  console.log('Database schema created successfully.');
}

module.exports = { runMigrations };
