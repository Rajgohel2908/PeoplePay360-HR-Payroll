// client/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import SkeletonLoader from './components/ui/SkeletonLoader';

// Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import Employee360 from './pages/employees/Employee360';
import ContractList from './pages/contracts/ContractList';
import ScheduleList from './pages/schedules/ScheduleList';
import AttendanceList from './pages/attendance/AttendanceList';
import TimeOffDashboard from './pages/timeoff/TimeOffDashboard';
import SalaryStructures from './pages/salary/SalaryStructures';
import PayrunList from './pages/payroll/PayrunList';
import PayrunWizard from './pages/payroll/PayrunWizard';
import PayrollDetail from './pages/payroll/PayrollDetail';
import PayrollValidationCenter from './pages/payroll/PayrollValidationCenter';
import PayslipList from './pages/payslips/PayslipList';
import PayslipDetail from './pages/payslips/PayslipDetail';
import EmployeePortal from './pages/ess/EmployeePortal';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuditLogViewer from './pages/admin/AuditLogViewer';
import SystemSettings from './pages/admin/SystemSettings';

/**
 * Route guard requiring active session and optional RBAC role whitelist
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 animate-pulse mx-auto flex items-center justify-center text-slate-950 font-black text-xl">
            360
          </div>
          <p className="text-slate-400 font-medium text-sm">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is employee-only and accessing admin routes, redirect to ESS
  if (user?.role === 'employee' && allowedRoles && !allowedRoles.includes('employee')) {
    return <Navigate to="/ess" replace />;
  }

  // If user role is not whitelisted
  if (allowedRoles && !allowedRoles.includes(user?.role) && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * Root Index Redirection based on role
 */
function IndexRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'employee') {
    return <Navigate to="/ess" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export function App() {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated Application Wrapper */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Dynamic Root Redirection */}
        <Route path="/" element={<IndexRedirect />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'payroll_manager', 'payroll_user']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Employee Management */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'payroll_manager', 'payroll_user']}>
              <EmployeeList />
            </ProtectedRoute>
          }
        />
        <Route path="/employees/:id" element={<Employee360 />} />
        <Route path="/employees/360/:id" element={<Employee360 />} />

        {/* Contracts & Schedules */}
        <Route
          path="/contracts"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'payroll_manager', 'payroll_user']}>
              <ContractList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'payroll_manager', 'payroll_user']}>
              <ScheduleList />
            </ProtectedRoute>
          }
        />

        {/* Attendance & Time Off */}
        <Route path="/attendance" element={<AttendanceList />} />
        <Route path="/time-off" element={<TimeOffDashboard />} />

        {/* Salary Structures & Formula Sequencer */}
        <Route
          path="/salary"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <SalaryStructures />
            </ProtectedRoute>
          }
        />
        <Route
          path="/salary-structures"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <SalaryStructures />
            </ProtectedRoute>
          }
        />

        {/* Payroll Engine & Payruns */}
        <Route
          path="/payroll"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <PayrunList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payruns"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <PayrunList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <PayrunWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payruns/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <PayrunWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <PayrollDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payruns/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <PayrollDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/validation/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <PayrollValidationCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payruns/validation/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager', 'payroll_user']}>
              <PayrollValidationCenter />
            </ProtectedRoute>
          }
        />

        {/* Payslips */}
        <Route path="/payslips" element={<PayslipList />} />
        <Route path="/payslips/:id" element={<PayslipDetail />} />

        {/* Employee Self-Service (ESS) */}
        <Route path="/ess" element={<EmployeePortal />} />
        <Route path="/portal" element={<EmployeePortal />} />

        {/* Analytics & Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'payroll_manager', 'payroll_user']}>
              <ReportsDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Settings & Audit Trail */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager']}>
              <AuditLogViewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin', 'payroll_manager']}>
              <SystemSettings />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
