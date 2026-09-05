// client/src/components/layout/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  UserCheck,
  LogOut,
  ChevronDown,
  CheckCheck,
  ExternalLink,
  Menu,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import GlobalSearchModal from '../ui/GlobalSearchModal';
import Logo from '../ui/Logo';

export function Header({ onMobileMenuToggle }) {
  const { user, logout, switchDemoRole } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showSearch, setShowSearch] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const roleMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target)) setShowRoleMenu(false);
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) setShowNotifMenu(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const demoRoles = [
    { role: 'admin', label: 'Admin (System Administrator)', username: 'admin', pass: 'admin123', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { role: 'payroll_manager', label: 'HR Payroll Manager (Approver)', username: 'payroll_manager', pass: 'payrollmgr123', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { role: 'payroll_user', label: 'HR Payroll Specialist (Preparer)', username: 'payroll_user', pass: 'payroll123', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    { role: 'hr_manager', label: 'HR Operations Manager', username: 'hr_manager', pass: 'hr123', bg: 'bg-pink-50 text-pink-700 border-pink-200' },
    { role: 'employee', label: 'Employee (Self-Service View)', username: 'employee', pass: 'emp123', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
  ];

  const handleRoleSwitch = async (username, pass) => {
    setShowRoleMenu(false);
    await switchDemoRole(username, pass);
    if (username === 'employee') {
      navigate('/ess');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
        {/* Left: Mobile Toggle & Global Search Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="lg:hidden flex items-center">
            <Logo variant="light" size="xs" className="h-7 w-auto" />
          </div>

          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-white text-xs transition-all shadow-sm w-44 sm:w-64"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">Quick search (EMP, payrun)...</span>
            <kbd className="hidden sm:inline-block ml-auto px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Role Switcher, Notifications, User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Demo Role Switcher */}
          <div className="relative" ref={roleMenuRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-all shadow-sm"
              title="Switch demo user role"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline capitalize">{user?.role?.replace('_', ' ')}</span>
              <ChevronDown className="w-3 h-3 text-emerald-600" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-dropdown border border-slate-200 p-2 z-50 animate-slide-up">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Demo Persona
                  </p>
                  <p className="text-[11px] text-slate-500">Instant role switching for demo testing</p>
                </div>
                <div className="space-y-1">
                  {demoRoles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => handleRoleSwitch(r.username, r.pass)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        user?.role === r.role ? 'bg-emerald-50 text-emerald-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{r.label}</span>
                      {user?.role === r.role && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-dropdown border border-slate-200 p-3 z-50 animate-slide-up">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-medium text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No notifications at this time.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link) navigate(n.link);
                          setShowNotifMenu(false);
                        }}
                        className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors border ${
                          n.is_read
                            ? 'bg-white border-transparent text-slate-600 hover:bg-slate-50'
                            : 'bg-emerald-50/60 border-emerald-100 text-slate-900 hover:bg-emerald-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900 leading-tight">{n.title}</p>
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`}
                alt="Avatar"
                className="w-7 h-7 rounded-full bg-slate-200 object-cover"
              />
              <span className="hidden sm:inline text-xs font-semibold text-slate-700">
                {user?.first_name || user?.username}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-dropdown border border-slate-200 p-1.5 z-50 animate-slide-up">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate(user?.employee_id ? `/employees/360/${user.employee_id}` : '/dashboard');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  My Profile
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
}

export default Header;
