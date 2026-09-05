// server/database/migrations.js
const db = require('./connection');

async function runMigrations() {
  console.log('Running database migrations (MySQL)...');

  // 1. Roles
  if (!(await db.schema.hasTable('roles'))) {
    await db.schema.createTable('roles', (table) => {
      table.string('id', 50).primary();
      table.string('name', 100).notNullable();
      table.string('display_name', 100).notNullable();
      table.text('description');
    });
  }

  // 2. Permissions
  if (!(await db.schema.hasTable('permissions'))) {
    await db.schema.createTable('permissions', (table) => {
      table.string('id', 50).primary();
      table.string('code', 100).unique().notNullable();
      table.string('module', 100).notNullable();
      table.text('description');
    });
  }

  // 3. Role Permissions
  if (!(await db.schema.hasTable('role_permissions'))) {
    await db.schema.createTable('role_permissions', (table) => {
      table.increments('id').primary();
      table.string('role_id', 50).notNullable().references('id').inTable('roles').onDelete('CASCADE');
      table.string('permission_id', 50).notNullable().references('id').inTable('permissions').onDelete('CASCADE');
      table.unique(['role_id', 'permission_id']);
    });
  }

  // 4. Departments
  if (!(await db.schema.hasTable('departments'))) {
    await db.schema.createTable('departments', (table) => {
      table.increments('id').primary();
      table.string('name', 150).unique().notNullable();
      table.string('code', 20).unique().notNullable();
      table.integer('manager_id').unsigned().nullable();
      table.string('cost_center', 50).nullable();
      table.string('color', 20).defaultTo('#4f46e5');
      table.timestamps(true, true);
    });
  }

  // 5. Job Positions
  if (!(await db.schema.hasTable('job_positions'))) {
    await db.schema.createTable('job_positions', (table) => {
      table.increments('id').primary();
      table.string('title', 200).notNullable();
      table.integer('department_id').unsigned().references('id').inTable('departments').onDelete('SET NULL').nullable();
      table.string('grade', 20).nullable();
      table.text('description').nullable();
      table.timestamps(true, true);
    });
  }

  // 6. Working Schedules
  if (!(await db.schema.hasTable('working_schedules'))) {
    await db.schema.createTable('working_schedules', (table) => {
      table.increments('id').primary();
      table.string('name', 200).notNullable();
      table.string('schedule_type', 50).defaultTo('standard');
      table.string('timezone', 100).defaultTo('Asia/Kolkata');
      table.decimal('weekly_hours', 5, 2).defaultTo(40.0);
      table.timestamps(true, true);
    });
  }

  // 7. Schedule Days
  if (!(await db.schema.hasTable('schedule_days'))) {
    await db.schema.createTable('schedule_days', (table) => {
      table.increments('id').primary();
      table.integer('schedule_id').unsigned().notNullable().references('id').inTable('working_schedules').onDelete('CASCADE');
      table.string('day_of_week', 20).notNullable();
      table.boolean('is_working').defaultTo(true);
      table.string('start_time', 10).defaultTo('09:00');
      table.string('end_time', 10).defaultTo('18:00');
      table.integer('break_duration_mins').defaultTo(60);
      table.decimal('expected_hours', 4, 2).defaultTo(8.0);
      table.unique(['schedule_id', 'day_of_week']);
    });
  }

  // 8. Employees
  if (!(await db.schema.hasTable('employees'))) {
    await db.schema.createTable('employees', (table) => {
      table.increments('id').primary();
      table.string('employee_id', 50).unique().notNullable();
      table.string('first_name', 100).notNullable();
      table.string('last_name', 100).notNullable();
      table.string('email', 200).unique().notNullable();
      table.string('phone', 20).nullable();
      table.date('date_of_birth').nullable();
      table.string('gender', 20).nullable();
      table.text('address').nullable();
      table.string('city', 100).nullable();
      table.string('state', 100).nullable();
      table.string('postal_code', 20).nullable();
      table.string('country', 100).defaultTo('India');
      table.string('emergency_name', 200).nullable();
      table.string('emergency_phone', 20).nullable();
      table.string('emergency_relation', 100).nullable();
      table.integer('department_id').unsigned().references('id').inTable('departments').onDelete('SET NULL').nullable();
      table.integer('job_position_id').unsigned().references('id').inTable('job_positions').onDelete('SET NULL').nullable();
      table.integer('manager_id').unsigned().references('id').inTable('employees').onDelete('SET NULL').nullable();
      table.string('employee_type', 50).defaultTo('Full-time');
      table.string('employment_status', 50).defaultTo('Active');
      table.date('joining_date').notNullable();
      table.date('exit_date').nullable();
      table.integer('schedule_id').unsigned().references('id').inTable('working_schedules').onDelete('SET NULL').nullable();
      table.string('bank_name', 200).nullable();
      table.string('account_number', 100).nullable();
      table.string('ifsc_code', 20).nullable();
      table.string('pan_number', 20).nullable();
      table.string('uan_number', 30).nullable();
      table.string('avatar_url', 500).nullable();
      table.text('notes').nullable();
      table.timestamps(true, true);
      table.index(['department_id', 'employment_status']);
    });
  }

  // 9. Users
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username', 100).unique().notNullable();
      table.string('email', 200).unique().notNullable();
      table.string('password_hash', 255).notNullable();
      table.string('role', 50).notNullable().references('id').inTable('roles');
      table.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('SET NULL').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // 10. Salary Structures
  if (!(await db.schema.hasTable('salary_structures'))) {
    await db.schema.createTable('salary_structures', (table) => {
      table.increments('id').primary();
      table.string('name', 200).notNullable();
      table.string('code', 50).unique().notNullable();
      table.text('description').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // 11. Salary Rules
  if (!(await db.schema.hasTable('salary_rules'))) {
    await db.schema.createTable('salary_rules', (table) => {
      table.increments('id').primary();
      table.integer('structure_id').unsigned().notNullable().references('id').inTable('salary_structures').onDelete('CASCADE');
      table.string('name', 200).notNullable();
      table.string('code', 50).notNullable();
      table.string('category', 50).notNullable();
      table.integer('sequence').notNullable().defaultTo(1);
      table.string('calculation_type', 50).notNullable().defaultTo('fixed');
      table.decimal('fixed_amount', 12, 2).defaultTo(0);
      table.decimal('percentage_rate', 6, 2).defaultTo(0);
      table.string('percentage_base_code', 50).nullable();
      table.text('formula_expression').nullable();
      table.text('condition_expression').nullable();
      table.text('depends_on_codes').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.index(['structure_id', 'sequence']);
    });
  }

  // 12. Contracts
  if (!(await db.schema.hasTable('contracts'))) {
    await db.schema.createTable('contracts', (table) => {
      table.increments('id').primary();
      table.string('contract_id', 100).unique().notNullable();
      table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.date('start_date').notNullable();
      table.date('end_date').nullable();
      table.integer('department_id').unsigned().references('id').inTable('departments').onDelete('SET NULL').nullable();
      table.integer('job_position_id').unsigned().references('id').inTable('job_positions').onDelete('SET NULL').nullable();
      table.string('employment_type', 50).defaultTo('Full-time');
      table.decimal('wage', 12, 2).notNullable();
      table.string('wage_type', 20).defaultTo('monthly');
      table.integer('salary_structure_id').unsigned().references('id').inTable('salary_structures').onDelete('RESTRICT').nullable();
      table.integer('working_schedule_id').unsigned().references('id').inTable('working_schedules').onDelete('SET NULL').nullable();
      table.string('status', 30).defaultTo('active');
      table.text('contract_notes').nullable();
      table.timestamps(true, true);
      table.index(['employee_id', 'status', 'start_date', 'end_date']);
    });
  }

  // 13. Attendance
  if (!(await db.schema.hasTable('attendance'))) {
    await db.schema.createTable('attendance', (table) => {
      table.increments('id').primary();
      table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.date('date').notNullable();
      table.string('check_in', 10).nullable();
      table.string('check_out', 10).nullable();
      table.decimal('worked_hours', 5, 2).defaultTo(0);
      table.decimal('expected_hours', 5, 2).defaultTo(8.0);
      table.decimal('overtime_hours', 5, 2).defaultTo(0);
      table.integer('late_minutes').defaultTo(0);
      table.string('status', 30).defaultTo('present');
      table.string('source', 50).defaultTo('Web');
      table.text('notes').nullable();
      table.integer('corrected_by').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable();
      table.text('correction_reason').nullable();
      table.timestamps(true, true);
      table.unique(['employee_id', 'date']);
      table.index(['employee_id', 'date', 'status']);
    });
  }

  // 14. Time Off Types
  if (!(await db.schema.hasTable('time_off_types'))) {
    await db.schema.createTable('time_off_types', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('code', 20).unique().notNullable();
      table.string('unit', 20).defaultTo('days');
      table.boolean('requires_allocation').defaultTo(true);
      table.boolean('paid').defaultTo(true);
      table.string('color', 20).defaultTo('#10b981');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // 15. Time Off Allocations
  if (!(await db.schema.hasTable('time_off_allocations'))) {
    await db.schema.createTable('time_off_allocations', (table) => {
      table.increments('id').primary();
      table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('leave_type_id').unsigned().notNullable().references('id').inTable('time_off_types').onDelete('CASCADE');
      table.integer('year').notNullable();
      table.decimal('allocated_days', 5, 2).notNullable().defaultTo(0);
      table.decimal('used_days', 5, 2).defaultTo(0);
      table.decimal('pending_days', 5, 2).defaultTo(0);
      table.decimal('remaining_days', 5, 2).notNullable().defaultTo(0);
      table.date('valid_from').notNullable();
      table.date('valid_to').notNullable();
      table.string('status', 20).defaultTo('active');
      table.timestamps(true, true);
      table.unique(['employee_id', 'leave_type_id', 'year']);
    });
  }

  // 16. Time Off Requests
  if (!(await db.schema.hasTable('time_off_requests'))) {
    await db.schema.createTable('time_off_requests', (table) => {
      table.increments('id').primary();
      table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('leave_type_id').unsigned().notNullable().references('id').inTable('time_off_types').onDelete('RESTRICT');
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.decimal('duration_days', 5, 2).notNullable();
      table.text('reason').nullable();
      table.string('status', 30).defaultTo('submitted');
      table.integer('approver_id').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable();
      table.text('approver_comment').nullable();
      table.datetime('approved_at').nullable();
      table.timestamps(true, true);
      table.index(['employee_id', 'status', 'start_date', 'end_date']);
    });
  }

  // 17. Payruns
  if (!(await db.schema.hasTable('payruns'))) {
    await db.schema.createTable('payruns', (table) => {
      table.increments('id').primary();
      table.string('payrun_number', 100).unique().notNullable();
      table.string('title', 200).notNullable();
      table.date('period_start').notNullable();
      table.date('period_end').notNullable();
      table.date('payment_date').nullable();
      table.integer('salary_structure_id').unsigned().references('id').inTable('salary_structures').onDelete('SET NULL').nullable();
      table.integer('department_id').unsigned().references('id').inTable('departments').onDelete('SET NULL').nullable();
      table.string('employee_type', 50).nullable();
      table.string('status', 30).defaultTo('draft');
      table.integer('total_employees').defaultTo(0);
      table.decimal('total_gross', 14, 2).defaultTo(0);
      table.decimal('total_deductions', 14, 2).defaultTo(0);
      table.decimal('total_net', 14, 2).defaultTo(0);
      table.decimal('total_overtime', 12, 2).defaultTo(0);
      table.decimal('total_lop', 12, 2).defaultTo(0);
      table.integer('prepared_by').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable();
      table.integer('reviewed_by').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable();
      table.integer('approved_by').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable();
      table.datetime('approved_at').nullable();
      table.datetime('paid_at').nullable();
      table.text('notes').nullable();
      table.timestamps(true, true);
      table.index(['status', 'period_start', 'period_end']);
    });
  }

  // 18. Payrun Employees
  if (!(await db.schema.hasTable('payrun_employees'))) {
    await db.schema.createTable('payrun_employees', (table) => {
      table.increments('id').primary();
      table.integer('payrun_id').unsigned().notNullable().references('id').inTable('payruns').onDelete('CASCADE');
      table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('contract_id').unsigned().references('id').inTable('contracts').onDelete('SET NULL').nullable();
      table.boolean('is_included').defaultTo(true);
      table.string('exclusion_reason', 500).nullable();
      table.timestamps(true, true);
      table.unique(['payrun_id', 'employee_id']);
    });
  }

  // 19. Payslips
  if (!(await db.schema.hasTable('payslips'))) {
    await db.schema.createTable('payslips', (table) => {
      table.increments('id').primary();
      table.string('payslip_number', 150).unique().notNullable();
      table.integer('payrun_id').unsigned().notNullable().references('id').inTable('payruns').onDelete('CASCADE');
      table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('contract_id').unsigned().references('id').inTable('contracts').onDelete('RESTRICT').nullable();
      table.integer('salary_structure_id').unsigned().references('id').inTable('salary_structures').onDelete('RESTRICT').nullable();
      table.date('period_start').notNullable();
      table.date('period_end').notNullable();
      table.decimal('worked_days', 5, 2).defaultTo(0);
      table.decimal('paid_days', 5, 2).defaultTo(0);
      table.decimal('unpaid_days', 5, 2).defaultTo(0);
      table.decimal('overtime_hours', 5, 2).defaultTo(0);
      table.decimal('gross_salary', 12, 2).defaultTo(0);
      table.decimal('total_deductions', 12, 2).defaultTo(0);
      table.decimal('net_salary', 12, 2).defaultTo(0);
      table.string('payment_status', 30).defaultTo('Unpaid');
      table.string('email_status', 30).defaultTo('Pending');
      table.datetime('sent_at').nullable();
      table.timestamps(true, true);
      table.unique(['payrun_id', 'employee_id']);
      table.index(['employee_id', 'period_start', 'period_end']);
    });
  }

  // 20. Payslip Lines
  if (!(await db.schema.hasTable('payslip_lines'))) {
    await db.schema.createTable('payslip_lines', (table) => {
      table.increments('id').primary();
      table.integer('payslip_id').unsigned().notNullable().references('id').inTable('payslips').onDelete('CASCADE');
      table.integer('rule_id').unsigned().nullable();
      table.string('rule_name', 200).notNullable();
      table.string('rule_code', 50).notNullable();
      table.string('category', 50).notNullable();
      table.integer('sequence').defaultTo(1);
      table.string('calculation_type', 50).nullable();
      table.decimal('base_amount', 12, 2).defaultTo(0);
      table.decimal('rate', 8, 4).defaultTo(0);
      table.decimal('amount', 12, 2).notNullable().defaultTo(0);
      table.text('note').nullable();
      table.index(['payslip_id', 'sequence']);
    });
  }

  // 21. Payroll Validation Issues
  if (!(await db.schema.hasTable('payroll_validation_issues'))) {
    await db.schema.createTable('payroll_validation_issues', (table) => {
      table.increments('id').primary();
      table.integer('payrun_id').unsigned().notNullable().references('id').inTable('payruns').onDelete('CASCADE');
      table.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('CASCADE').nullable();
      table.string('category', 50).notNullable();
      table.string('severity', 20).notNullable();
      table.string('title', 300).notNullable();
      table.text('description').notNullable();
      table.text('impact').nullable();
      table.text('recommended_action').nullable();
      table.boolean('is_resolved').defaultTo(false);
      table.integer('resolved_by').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable();
      table.datetime('resolved_at').nullable();
      table.text('resolution_notes').nullable();
      table.timestamps(true, true);
      table.index(['payrun_id', 'severity', 'is_resolved']);
    });
  }

  // 22. Payroll Variances
  if (!(await db.schema.hasTable('payroll_variances'))) {
    await db.schema.createTable('payroll_variances', (table) => {
      table.increments('id').primary();
      table.integer('payrun_id').unsigned().notNullable().references('id').inTable('payruns').onDelete('CASCADE');
      table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('prev_payrun_id').unsigned().references('id').inTable('payruns').onDelete('SET NULL').nullable();
      table.decimal('prev_net', 12, 2).defaultTo(0);
      table.decimal('curr_net', 12, 2).defaultTo(0);
      table.decimal('delta_amount', 12, 2).defaultTo(0);
      table.decimal('delta_percentage', 6, 2).defaultTo(0);
      table.string('variance_category', 100).nullable();
      table.text('variance_reason').nullable();
      table.boolean('is_flagged').defaultTo(false);
      table.timestamps(true, true);
      table.index(['payrun_id', 'is_flagged']);
    });
  }

  // 23. Notifications
  if (!(await db.schema.hasTable('notifications'))) {
    await db.schema.createTable('notifications', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').nullable();
      table.string('type', 100).notNullable();
      table.string('title', 300).notNullable();
      table.text('message').notNullable();
      table.string('link', 500).nullable();
      table.boolean('is_read').defaultTo(false);
      table.text('metadata').nullable();
      table.timestamps(true, true);
      table.index(['user_id', 'is_read']);
    });
  }

  // 24. Audit Logs
  if (!(await db.schema.hasTable('audit_logs'))) {
    await db.schema.createTable('audit_logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable();
      table.string('user_name', 200).nullable();
      table.string('user_role', 50).nullable();
      table.string('action', 100).notNullable();
      table.string('entity', 100).notNullable();
      table.string('entity_id', 100).nullable();
      table.text('old_values').nullable();
      table.text('new_values').nullable();
      table.text('reason').nullable();
      table.string('ip_address', 50).nullable();
      table.timestamps(true, true);
      table.index(['entity', 'entity_id', 'created_at']);
    });
  }

  // 25. Documents
  if (!(await db.schema.hasTable('documents'))) {
    await db.schema.createTable('documents', (table) => {
      table.increments('id').primary();
      table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.string('title', 300).notNullable();
      table.string('file_name', 300).notNullable();
      table.string('file_type', 100).nullable();
      table.integer('file_size').nullable();
      table.string('document_type', 100).nullable();
      table.integer('uploaded_by').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable();
      table.timestamps(true, true);
    });
  }

  // 26. Email Logs
  if (!(await db.schema.hasTable('email_logs'))) {
    await db.schema.createTable('email_logs', (table) => {
      table.increments('id').primary();
      table.integer('payrun_id').unsigned().references('id').inTable('payruns').onDelete('CASCADE').nullable();
      table.integer('payslip_id').unsigned().references('id').inTable('payslips').onDelete('CASCADE').nullable();
      table.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('CASCADE').nullable();
      table.string('recipient_email', 300).notNullable();
      table.string('subject', 500).notNullable();
      table.string('status', 30).defaultTo('Sent');
      table.text('error_message').nullable();
      table.datetime('sent_at').nullable();
      table.timestamps(true, true);
    });
  }

  // 27. System Settings
  if (!(await db.schema.hasTable('system_settings'))) {
    await db.schema.createTable('system_settings', (table) => {
      table.increments('id').primary();
      table.string('key', 100).unique().notNullable();
      table.text('value').notNullable();
      table.string('category', 50).defaultTo('general');
      table.text('description').nullable();
      table.timestamps(true, true);
    });
  }

  console.log('✓ MySQL database schema created/verified successfully.');
}

module.exports = { runMigrations };
