// client/src/components/layout/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileSignature,
  Clock,
  CalendarCheck,
  Palmtree,
  Calculator,
  ReceiptIndianRupee,
  FileBarChart2,
  ShieldCheck,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../ui/Logo';

export function Sidebar({ collapsed, onToggle }) {
  const { user, isEmployeeOnly } = useAuth();

  const navItems = isEmployeeOnly
    ? [
        { title: 'My Self-Service', path: '/ess', icon: LayoutDashboard },
        { title: 'My Attendance', path: '/attendance', icon: CalendarCheck },
        { title: 'My Time Off', path: '/time-off', icon: Palmtree },
        { title: 'My Payslips', path: '/payslips', icon: ReceiptIndianRupee },
        { title: 'My Profile (360)', path: `/employees/360/${user?.employee_id || 1}`, icon: Users }
      ]
    : [
        {
          section: 'MAIN'
        },
        { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        {
          section: 'HR OPERATIONS'
        },
        { title: 'Employees', path: '/employees', icon: Users },
        { title: 'Contracts', path: '/contracts', icon: FileSignature },
        { title: 'Working Schedules', path: '/schedules', icon: Clock },
        { title: 'Attendance', path: '/attendance', icon: CalendarCheck },
        { title: 'Time Off / Leave', path: '/time-off', icon: Palmtree },
        {
          section: 'PAYROLL & SALARY'
        },
        { title: 'Salary Structures', path: '/salary', icon: Calculator, roles: ['admin', 'payroll_manager', 'payroll_user'] },
        { title: 'Payruns', path: '/payroll', icon: Sparkles, roles: ['admin', 'payroll_manager', 'payroll_user'] },
        { title: 'Payslips', path: '/payslips', icon: ReceiptIndianRupee },
        {
          section: 'ANALYTICS & ADMIN'
        },
        { title: 'Reports', path: '/reports', icon: FileBarChart2 },
        { title: 'Audit Trail', path: '/admin/audit', icon: ShieldCheck, roles: ['admin', 'payroll_manager'] },
        { title: 'User Management', path: '/admin/users', icon: Settings, roles: ['admin'] }
      ];

  return (
    <aside
      className={`
        bg-white text-slate-800 flex flex-col border-r border-stone-200/90 transition-all duration-300 shrink-0 z-30 shadow-xs
        ${collapsed ? 'w-20' : 'w-[264px]'}
      `}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-stone-100 bg-white">
        <div className="flex items-center gap-3 overflow-hidden">
          {collapsed ? (
            <Logo variant="icon" size="sm" showText={false} className="shrink-0" />
          ) : (
            <Logo size="md" showText={true} className="shrink-0 max-h-9" />
          )}
        </div>

        <button
          onClick={onToggle}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-stone-100 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item, idx) => {
          if (item.section) {
            if (collapsed) return <div key={idx} className="my-3 border-t border-stone-100" />;
            return (
              <p
                key={idx}
                className="px-3.5 pt-5 pb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"
              >
                {item.section}
              </p>
            );
          }

          if (item.roles && !item.roles.includes(user?.role) && user?.role !== 'admin') {
            return null;
          }

          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] transition-all duration-150 group select-none
                ${isActive
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80 shadow-xs'
                  : 'text-slate-800 hover:bg-stone-100/70 hover:text-slate-950 font-semibold'
                }
              `}
              title={collapsed ? item.title : undefined}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-105 ${
                  item.path === window.location.pathname ? 'text-emerald-700' : 'text-slate-600 group-hover:text-slate-900'
                }`}
              />
              {!collapsed && (
                <span className="truncate leading-5 tracking-tight flex-1">
                  {item.title}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Current User Pill */}
      <div className="p-3 border-t border-stone-100 bg-stone-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-stone-200/90 shadow-xs">
          <img
            src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`}
            alt="Avatar"
            className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 object-cover shrink-0"
          />
          {!collapsed && (
            <div className="truncate flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </p>
              <p className="text-[10.5px] font-semibold text-emerald-700 uppercase tracking-wide truncate mt-0.5">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
