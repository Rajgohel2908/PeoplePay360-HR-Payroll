// client/src/components/layout/MobileNav.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, Palmtree, Sparkles, ReceiptIndianRupee } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function MobileNav() {
  const { isEmployeeOnly } = useAuth();

  const links = isEmployeeOnly
    ? [
        { title: 'ESS', path: '/ess', icon: LayoutDashboard },
        { title: 'Attendance', path: '/attendance', icon: CalendarCheck },
        { title: 'Leave', path: '/time-off', icon: Palmtree },
        { title: 'Payslips', path: '/payslips', icon: ReceiptIndianRupee }
      ]
    : [
        { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { title: 'Employees', path: '/employees', icon: Users },
        { title: 'Attendance', path: '/attendance', icon: CalendarCheck },
        { title: 'Payroll', path: '/payroll', icon: Sparkles },
        { title: 'Payslips', path: '/payslips', icon: ReceiptIndianRupee }
      ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-40 flex items-center justify-around px-2 shadow-lg">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-16 py-1 text-[10px] font-semibold transition-colors
              ${isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span>{link.title}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default MobileNav;
