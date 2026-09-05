# PEOPLEPAY360: BACKEND REQUIREMENTS & ARCHITECTURAL SPECIFICATION

> **Source of Truth**: The `client/` application architecture, UI schemas, forms, data models, and API interfaces define all backend requirements. All backend implementations reside strictly in `server/` (or `backend/`) and fulfill the end-to-end data flow required by `client/`.

---

## 1. System Overview & Core Connected Principles

`PEOPLEPAY360` is not an isolated CRUD application. The backend operates as **ONE CONNECTED FINANCIAL & HR SYSTEM**:

```text
Employee (client/src/pages/employees)
   ↓
Contract (client/src/pages/contracts)
   ↓
Working Schedule (client/src/pages/schedules)
   ↓
Attendance (client/src/pages/attendance)
   ↓
Time Off / Leave (client/src/pages/timeoff)
   ↓
Salary Structure (client/src/pages/salary)
   ↓
Salary Rules (client/src/pages/salary)
   ↓
Payrun Wizard (client/src/pages/payroll/PayrunWizard.jsx)
   ↓
Payroll Validation (client/src/pages/payroll/PayrollValidationCenter.jsx)
   ↓
Payslip (client/src/pages/payslips)
   ↓
Approval & Payment Disbursement (client/src/pages/payroll/PayrollDetail.jsx)
   ↓
Employee Delivery / ESS (client/src/pages/ess/EmployeePortal.jsx)
   ↓
Reports / Analytics / Audit History (client/src/pages/reports, client/src/pages/admin)
```

---

## 2. Database Entities & Relational Schema (27 Tables)

All schema definitions, constraints, primary keys, foreign keys, and indexes are implemented in `server/database/migrations.js`:

1. **`roles`**: `id`, `name`, `display_name`, `description`, `created_at`, `updated_at`.
2. **`permissions`**: `id`, `name`, `category`, `description`.
3. **`role_permissions`**: `role_id` (FK &rarr; `roles`), `permission_id` (FK &rarr; `permissions`).
4. **`departments`**: `id`, `name`, `code` (Unique), `manager_id` (FK &rarr; `employees`), `is_active`.
5. **`job_positions`**: `id`, `title`, `code` (Unique), `department_id` (FK &rarr; `departments`), `employment_type`.
6. **`working_schedules`**: `id`, `name`, `schedule_type`, `weekly_hours`, `timezone`, `is_active`.
7. **`working_schedule_days`**: `id`, `schedule_id` (FK &rarr; `working_schedules`), `day_of_week` (0-6), `is_working_day`, `start_time`, `end_time`, `break_minutes`.
8. **`public_holidays`**: `id`, `name`, `date` (Unique), `type`, `description`.
9. **`salary_structures`**: `id`, `name`, `code` (Unique), `description`, `is_active`.
10. **`salary_rules`**: `id`, `structure_id` (FK &rarr; `salary_structures`), `name`, `code` (Unique in structure), `category` (`basic`, `allowance`, `gross`, `deduction`, `contribution`, `net`), `sequence`, `calculation_type` (`fixed`, `percentage`, `formula`, `conditional`), `fixed_amount`, `percentage`, `formula`, `condition_code`, `depends_on`, `is_active`.
11. **`employees`**: `id`, `employee_id` (Unique, e.g. `EMP-1001`), `first_name`, `last_name`, `email` (Unique), `phone`, `date_of_birth`, `gender`, `marital_status`, `address`, `city`, `state`, `postal_code`, `country`, `emergency_name`, `emergency_phone`, `emergency_relation`, `department_id` (FK &rarr; `departments`), `job_position_id` (FK &rarr; `job_positions`), `manager_id` (FK &rarr; `employees`), `employee_type`, `employment_status`, `joining_date`, `schedule_id` (FK &rarr; `working_schedules`), `bank_name`, `account_number`, `ifsc_code`, `pan_number`, `uan_number`, `avatar_url`, `notes`.
12. **`contracts`**: `id`, `contract_id` (Unique, e.g. `CNT-EMP-1001`), `employee_id` (FK &rarr; `employees`), `start_date`, `end_date`, `department_id` (FK &rarr; `departments`), `job_position_id` (FK &rarr; `job_positions`), `employment_type`, `wage`, `wage_type`, `salary_structure_id` (FK &rarr; `salary_structures`), `working_schedule_id` (FK &rarr; `working_schedules`), `status` (`draft`, `active`, `expired`, `terminated`), `contract_notes`.
13. **`attendance`**: `id`, `employee_id` (FK &rarr; `employees`), `date`, `check_in`, `check_out`, `worked_hours`, `expected_hours`, `overtime_hours`, `late_minutes`, `status` (`present`, `late`, `absent`, `half_day`, `on_leave`, `overtime`, `missing_checkout`, `manual_correction`), `source`, `notes`, `corrected_by` (FK &rarr; `users`), `correction_reason`. Unique index on `[employee_id, date]`.
14. **`time_off_types`**: `id`, `name`, `code` (Unique), `unit` (`days`/`hours`), `requires_allocation`, `paid`, `color`, `is_active`.
15. **`time_off_allocations`**: `id`, `employee_id` (FK &rarr; `employees`), `leave_type_id` (FK &rarr; `time_off_types`), `year`, `allocated_days`, `used_days`, `pending_days`, `remaining_days`, `valid_from`, `valid_to`, `status`.
16. **`time_off_requests`**: `id`, `employee_id` (FK &rarr; `employees`), `leave_type_id` (FK &rarr; `time_off_types`), `start_date`, `end_date`, `duration_days`, `reason`, `status` (`draft`, `submitted`, `approved`, `refused`, `cancelled`), `approver_id` (FK &rarr; `users`), `approver_comments`, `approved_at`.
17. **`users`**: `id`, `username` (Unique), `email` (Unique), `password_hash`, `role` (FK &rarr; `roles`), `employee_id` (FK &rarr; `employees`), `is_active`.
18. **`payruns`**: `id`, `payrun_number` (Unique, e.g. `PR-2026-08`), `title`, `period_start`, `period_end`, `payment_date`, `salary_structure_id` (FK &rarr; `salary_structures`), `status` (`draft`, `computing`, `validation_required`, `ready_for_approval`, `approved`, `paid`, `cancelled`), `total_employees`, `total_gross`, `total_deductions`, `total_net`, `prepared_by` (FK &rarr; `users`), `reviewed_by` (FK &rarr; `users`), `approved_by` (FK &rarr; `users`), `notes`.
19. **`payrun_employees`**: `id`, `payrun_id` (FK &rarr; `payruns`), `employee_id` (FK &rarr; `employees`), `contract_id` (FK &rarr; `contracts`), `status`.
20. **`payslips`**: `id`, `payslip_number` (Unique, e.g. `PS-2026-08-EMP-1001`), `payrun_id` (FK &rarr; `payruns`), `employee_id` (FK &rarr; `employees`), `contract_id` (FK &rarr; `contracts`), `salary_structure_id` (FK &rarr; `salary_structures`), `period_start`, `period_end`, `working_days`, `worked_days`, `paid_days`, `unpaid_days`, `gross_salary`, `total_deductions`, `net_salary`, `status` (`draft`, `approved`, `paid`, `cancelled`), `payment_method`, `paid_at`.
21. **`payslip_lines`**: `id`, `payslip_id` (FK &rarr; `payslips`), `rule_id`, `rule_name`, `rule_code`, `category` (`basic`, `allowance`, `gross`, `deduction`, `contribution`, `net`), `sequence`, `calculation_type`, `base_amount`, `rate`, `amount`, `note`.
22. **`payroll_validation_issues`**: `id`, `payrun_id` (FK &rarr; `payruns`), `employee_id` (FK &rarr; `employees`), `category`, `severity` (`blocker`, `warning`, `info`), `title`, `description`, `impact`, `recommended_action`, `is_resolved`, `resolved_by` (FK &rarr; `users`), `resolved_at`, `resolution_notes`.
23. **`payroll_variances`**: `id`, `payrun_id` (FK &rarr; `payruns`), `employee_id` (FK &rarr; `employees`), `prev_payrun_id` (FK &rarr; `payruns`), `prev_net`, `curr_net`, `delta_amount`, `delta_percentage`, `variance_category`, `variance_reason`, `is_flagged`.
24. **`notifications`**: `id`, `user_id` (FK &rarr; `users`), `type`, `title`, `message`, `link`, `is_read`, `metadata`.
25. **`audit_logs`**: `id`, `user_id` (FK &rarr; `users`), `user_name`, `user_role`, `action`, `entity`, `entity_id`, `old_values` (JSON), `new_values` (JSON), `reason`, `ip_address`.
26. **`documents`**: `id`, `employee_id` (FK &rarr; `employees`), `title`, `file_name`, `file_type`, `file_size`, `document_type`, `uploaded_by` (FK &rarr; `users`).
27. **`email_logs`**: `id`, `payrun_id` (FK &rarr; `payruns`), `payslip_id` (FK &rarr; `payslips`), `employee_id` (FK &rarr; `employees`), `recipient_email`, `subject`, `status` (`Sent`, `Failed`, `Pending`), `error_message`, `sent_at`.
28. **`system_settings`**: `id`, `key` (Unique), `value`, `category`, `description`.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Endpoint Group | `employee` | `hr_manager` | `payroll_user` | `payroll_manager` | `admin` |
|---|:---:|:---:|:---:|:---:|:---:|
| `/api/auth/*` | ✅ (Self) | ✅ | ✅ | ✅ | ✅ |
| `/api/dashboard` | ❌ (Redirect &rarr; ESS) | ✅ | ✅ | ✅ | ✅ |
| `/api/employees` (List/CRUD) | ❌ (Self 360 only) | ✅ | ✅ | ✅ | ✅ |
| `/api/contracts` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/api/schedules` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/api/attendance` | ✅ (Punch & View Self) | ✅ (Full) | ✅ (Full) | ✅ (Full) | ✅ (Full) |
| `/api/time-off/requests` | ✅ (Create & View Self) | ✅ (Approve/Refuse) | ✅ (Full) | ✅ (Full) | ✅ (Full) |
| `/api/salary-structures` & `/rules` | ❌ | ❌ | ✅ (Read/Simulate) | ✅ (CRUD) | ✅ (CRUD) |
| `/api/payruns` (Create / Compute) | ❌ | ❌ | ✅ (Draft/Compute) | ✅ (Full CRUD) | ✅ (Full CRUD) |
| `/api/payruns/:id/approve` & `/pay` | ❌ | ❌ | ❌ (Blocker View Only) | ✅ | ✅ |
| `/api/payslips` (List & PDF) | ✅ (Self Only) | ✅ (Summaries) | ✅ (Full) | ✅ (Full) | ✅ (Full) |
| `/api/reports` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/*` (Users, Logs, Config) | ❌ | ❌ | ❌ | ❌ (Audit Only) | ✅ (Full) |

---

## 4. API Endpoints & Request/Response Contracts

### Authentication (`/api/auth`)
- `POST /api/auth/login`: `{ username, password }` &rarr; `{ success: true, data: { token, user } }`.
- `GET /api/auth/profile`: Header `Authorization: Bearer <token>` &rarr; `{ success: true, data: user }`.

### Employees & 360 Operational Hub (`/api/employees`)
- `GET /api/employees`: Query filters: `department_id`, `status`, `search`, `page`, `limit`.
- `GET /api/employees/:id/360`: Returns aggregated 8-part operational hub:
  ```json
  {
    "employee": { ... },
    "contracts": [ ... ],
    "currentContract": { ... },
    "attendance": [ ... ],
    "leaveAllocations": [ ... ],
    "leaveRequests": [ ... ],
    "payslips": [ ... ],
    "schedule": { ... },
    "documents": [ ... ],
    "auditLogs": [ ... ]
  }
  ```
- `POST /api/employees`: Multi-tab onboarding payload.
- `PUT /api/employees/:id`: Profile mutation + audit logging.

### Contracts (`/api/contracts`)
- `GET /api/contracts`: Filter by `employee_id`, `status`, `department_id`.
- `POST /api/contracts`: Validates date overlaps before insertion.
- `PUT /api/contracts/:id`: Automatic status synchronization (`expired` / `active`).

### Working Schedules (`/api/schedules`)
- `GET /api/schedules`: Returns schedules with nested 7-day timing matrix (`working_schedule_days`).
- `POST /api/schedules`: Automatically computes `weekly_hours` from shift durations.

### Attendance & Corrections (`/api/attendance`)
- `GET /api/attendance`: Filter by `employee_id`, `start_date`, `end_date`, `status`.
- `POST /api/attendance/check-in`: Punch in for authenticated user.
- `POST /api/attendance/check-out`: Punch out + auto-calculate `worked_hours`, `overtime_hours`, `late_minutes`.
- `POST /api/attendance/correction`: Authorized manager manual adjustment + audit justification.

### Time Off & Leave Allocations (`/api/time-off`)
- `GET /api/time-off/types`: List active leave categories.
- `GET /api/time-off/allocations`: Employee annual leave ledgers (`allocated_days`, `used_days`, `remaining_days`).
- `POST /api/time-off/requests`: Request submission with balance check.
- `POST /api/time-off/requests/:id/approve`: Approval transaction deducting allocation and updating status.
- `POST /api/time-off/requests/:id/refuse`: Rejection with reason note.

### Salary Structures & Rule Engine Sandbox (`/api/salary-structures`, `/api/salary-rules`)
- `GET /api/salary-structures`: Structures with sequenced rule arrays.
- `POST /api/salary-structures/simulate`: Live rule execution sandbox testing wages against formula sequences:
  - Input: `{ wage: 120000, daysWorked: 22, totalDays: 22, unpaidDays: 0, structureId: 1 }`
  - Output: Full breakdown of `BASIC`, `HRA`, `SPECIAL_ALLOWANCE`, `PF_EE`, `PT`, `TDS`, `LOP`, `GROSS`, `NET`.

### Payruns & 4-Step Wizard (`/api/payruns`)
- `GET /api/payruns`: List historical payruns with status badges and KPI totals.
- `POST /api/payruns/eligible-employees`: Step 2 wizard employee resolver for given period and contract validity.
- `POST /api/payruns`: Initialize payrun header.
- `POST /api/payruns/:id/compute`: Executes deterministic calculation engine across all eligible employees in transaction.
- `GET /api/payruns/:id/validation`: Fetches 9 validation categories with blocker count and resolution status.
- `POST /api/payruns/:id/resolve-issue`: 1-click blocker override with mandatory audit reason.
- `POST /api/payruns/:id/approve`: Approval state transition (Blocked if any unresolved `blocker` issues exist).
- `POST /api/payruns/:id/pay`: Finalizes disbursement and permanently locks payrun records.
- `POST /api/payruns/:id/send-payslips`: Bulk simulated SMTP email dispatch recording to `email_logs`.

### Payslips & PDF Generation (`/api/payslips`)
- `GET /api/payslips`: Filterable payslip archive.
- `GET /api/payslips/:id`: Detailed 2-column breakdown of earnings and deductions.
- `GET /api/payslips/:id/pdf`: Server-rendered PDF stream with header `application/pdf`.

### Analytics, Reports & Audit Logs (`/api/dashboard`, `/api/reports`, `/api/admin`)
- `GET /api/dashboard`: Live KPI aggregations, department payroll charts, headcount distribution, exception alerts.
- `GET /api/reports/:reportType`: Live reports with CSV download parameter.
- `GET /api/admin/audit-logs`: Filterable compliance logs with previous and committed JSON state diffs.
- `GET /api/admin/settings` & `PUT /api/admin/settings`: Enterprise configuration parameters.
- `GET /api/admin/search`: Global quick-search across Employees, Contracts, Payruns, and Payslips.

---

## 5. Mock-Data to Real-API Mapping

All simulated mock data in `client/` connects directly to real backend SQL tables:

| `client/` Feature / View | Endpoint | Database Tables Involved |
|---|---|---|
| Dashboard Analytics & KPIs | `GET /api/dashboard` | `employees`, `payruns`, `payslips`, `attendance`, `time_off_requests` |
| Employee List & Kanban | `GET /api/employees` | `employees`, `departments`, `job_positions` |
| Employee 360 Full Hub | `GET /api/employees/:id/360` | `employees`, `contracts`, `attendance`, `time_off_allocations`, `payslips`, `working_schedules` |
| Contracts & Active Periods | `GET /api/contracts` | `contracts`, `employees`, `salary_structures`, `working_schedules` |
| Biometric Logs & Punch | `GET /api/attendance` | `attendance`, `employees`, `working_schedules` |
| Leave Balances & Requests | `GET /api/time-off/*` | `time_off_types`, `time_off_allocations`, `time_off_requests` |
| Rule Engine & Sandbox | `GET /api/salary-structures` | `salary_structures`, `salary_rules` |
| Payrun Wizard & Engine | `POST /api/payruns/eligible-employees`, `POST /api/payruns/:id/compute` | `payruns`, `payrun_employees`, `payslips`, `payslip_lines` |
| Pre-Flight Validation Center | `GET /api/payruns/:id/validation` | `payroll_validation_issues`, `payroll_variances` |
| Payslip 2-Column Breakdown | `GET /api/payslips/:id` | `payslips`, `payslip_lines`, `contracts`, `employees` |
| PDF Download | `GET /api/payslips/:id/pdf` | PDFKit runtime stream |
| Tamper-Proof Audit Trail | `GET /api/admin/audit-logs` | `audit_logs`, `users` |
| Global Quick Search | `GET /api/admin/search` | Full indexed search across all core entities |

---

## 6. Verification Status

- **Automated Tests**: `npm test` in `server/` executes all Jest test suites (`tests/payroll.test.js` and `tests/api.test.js`) with 100% pass rate.
- **Seeded Data**: 52 realistic employees, active/expired contracts, attendance records with exceptions, 2026 leave allocations, salary rules, and payruns with pre-flight validation issues.
- **Client Build**: `npm run build` in `client/` builds in under 5 seconds with 0 errors.
