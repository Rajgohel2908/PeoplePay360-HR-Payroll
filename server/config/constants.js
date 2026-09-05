// server/config/constants.js

const ROLES = {
  EMPLOYEE: 'employee',
  HR_MANAGER: 'hr_manager',
  HR_PAYROLL_USER: 'payroll_user',
  HR_PAYROLL_MANAGER: 'payroll_manager',
  ADMIN: 'admin'
};

const PAYRUN_STATUS = {
  DRAFT: 'draft',
  COMPUTING: 'computing',
  COMPUTED: 'computed',
  VALIDATION_REQUIRED: 'validation_required',
  READY_FOR_APPROVAL: 'ready_for_approval',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived'
};

const VALIDATION_SEVERITY = {
  BLOCKER: 'blocker',
  WARNING: 'warning',
  INFO: 'info'
};

const VALIDATION_CATEGORY = {
  EMPLOYEE: 'employee',
  CONTRACT: 'contract',
  ATTENDANCE: 'attendance',
  TIME_OFF: 'time_off',
  SALARY: 'salary',
  PAYROLL: 'payroll',
  BANK: 'bank',
  DUPLICATE: 'duplicate',
  CONFIGURATION: 'configuration'
};

const TIME_OFF_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REFUSED: 'refused',
  CANCELLED: 'cancelled'
};

const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  LATE: 'late',
  ABSENT: 'absent',
  HALF_DAY: 'half_day',
  ON_LEAVE: 'on_leave',
  OVERTIME: 'overtime',
  MISSING_CHECKOUT: 'missing_checkout',
  MANUAL_CORRECTION: 'manual_correction'
};

const CONTRACT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  TERMINATED: 'terminated'
};

const RULE_CATEGORY = {
  BASIC: 'basic',
  ALLOWANCE: 'allowance',
  GROSS: 'gross',
  DEDUCTION: 'deduction',
  CONTRIBUTION: 'contribution',
  NET: 'net'
};

const CALCULATION_TYPE = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
  FORMULA: 'formula',
  CONDITIONAL: 'conditional'
};

module.exports = {
  ROLES,
  PAYRUN_STATUS,
  VALIDATION_SEVERITY,
  VALIDATION_CATEGORY,
  TIME_OFF_STATUS,
  ATTENDANCE_STATUS,
  CONTRACT_STATUS,
  RULE_CATEGORY,
  CALCULATION_TYPE
};
