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
  Receipt,
  FileBarChart2,
  ShieldCheck,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar({ collapsed, onToggle }) {
  const { user, isEmployeeOnly } = useAuth();

  const navItems = isEmployeeOnly
    ? [
        { title: 'My Self-Service', path: '/ess', icon: LayoutDashboard },
        { title: 'My Attendance', path: '/attendance', icon: CalendarCheck },
        { title: 'My Time Off', path: '/time-off', icon: Palmtree },
        { title: 'My Payslips', path: '/payslips', icon: Receipt },
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
        { title: 'Payslips', path: '/payslips', icon: Receipt },
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
        bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-300 shrink-0 z-30
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
            360
          </div>
          {!collapsed && (
            <div className="truncate">
              <span className="text-sm font-black tracking-wider text-white">PEOPLEPAY</span>
              <span className="text-xs font-bold text-emerald-400 ml-1">360</span>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">HR & Payroll Platform</p>
            </div>
          )}
        </div>

        <button
          onClick={onToggle}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item, idx) => {
          if (item.section) {
            if (collapsed) return <div key={idx} className="my-3 border-t border-slate-800" />;
            return (
              <p
                key={idx}
                className="px-3 pt-4 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
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
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group
                ${isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
              title={collapsed ? item.title : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110`} />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Current User Pill */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <img
            src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`}
            alt="Avatar"
            className="w-8 h-8 rounded-full bg-slate-700 object-cover shrink-0"
          />
          {!collapsed && (
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-white truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </p>
              <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide truncate">
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
