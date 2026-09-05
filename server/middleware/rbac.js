// server/middleware/rbac.js
const { ROLES } = require('../config/constants');

/**
 * Middleware ensuring user has one of the required roles.
 * @param {Array<string>|string} roles
 */
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'User is not authenticated.'
      });
    }

    // Admin always has bypass access
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Action requires one of the following roles: ${allowed.join(', ')}. Your role is '${req.user.role}'.`
      });
    }

    next();
  };
}

/**
 * Middleware ensuring an Employee can only access their own record, or an HR/Payroll/Admin can access.
 * @param {string} paramKey
 */
function requireSelfOrHR(paramKey = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required.'
      });
    }

    // Admin, HR Manager, HR Payroll Manager, HR Payroll User have privileged access
    if ([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER].includes(req.user.role)) {
      return next();
    }

    // Employee role check
    const targetEmployeeId = parseInt(req.params[paramKey] || req.query[paramKey] || req.body[paramKey], 10);
    if (req.user.role === ROLES.EMPLOYEE && req.user.employee_id && req.user.employee_id === targetEmployeeId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      code: 'ACCESS_DENIED',
      message: 'You are only authorized to access your own employee data.'
    });
  };
}

module.exports = {
  requireRole,
  requireSelfOrHR
};
