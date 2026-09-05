// client/src/components/layout/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  UserCheck,
  LogOut,
  ChevronDown,
  CheckCheck,
  Menu,
  Sparkles,
  ExternalLink
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
        setShowSearch((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const demoRoles = [
    { role: 'admin', label: 'Admin (System Administrator)', username: 'admin', pass: 'admin123' },
    { role: 'payroll_manager', label: 'HR Payroll Manager (Approver)', username: 'payroll_manager', pass: 'payrollmgr123' },
    { role: 'payroll_user', label: 'HR Payroll Specialist (Preparer)', username: 'payroll_user', pass: 'payroll123' },
    { role: 'hr_manager', label: 'HR Operations Manager', username: 'hr_manager', pass: 'hr123' },
    { role: 'employee', label: 'Employee (Self-Service View)', username: 'employee', pass: 'emp123' }
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
      <header className="h-16 bg-white border-b border-stone-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        {/* Left: Mobile Toggle & Global Search Trigger */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-stone-100 hover:text-slate-900 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="lg:hidden flex items-center">
            <Logo variant="light" size="xs" className="h-7 w-auto" />
          </div>

          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl border border-stone-200/90 bg-stone-50/70 text-slate-500 hover:border-stone-300 hover:text-slate-800 hover:bg-white text-[13px] font-medium transition-all shadow-xs w-48 sm:w-72"
          >
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate font-medium">Search employees, payruns...</span>
            <kbd className="hidden sm:inline-block ml-auto px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-white border border-stone-200 rounded-md">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Role Switcher, Notifications, User Menu */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Quick Demo Role Switcher */}
          <div className="relative" ref={roleMenuRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200/90 hover:bg-emerald-100/80 text-[13px] font-bold transition-all shadow-xs"
              title="Switch demo user role"
            >
              <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="hidden sm:inline capitalize tracking-tight">{user?.role?.replace('_', ' ')}</span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl shadow-dropdown border border-stone-200/90 p-2.5 z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-stone-100 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Switch Demo Role
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">Instant persona switching for testing</p>
                </div>
                <div className="space-y-1">
                  {demoRoles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => handleRoleSwitch(r.username, r.pass)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-between transition-colors ${
                        user?.role === r.role
                          ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80'
                          : 'hover:bg-stone-50 text-slate-800 hover:text-slate-950'
                      }`}
                    >
                      <span className="truncate mr-2">{r.label}</span>
                      {user?.role === r.role && <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />}
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
              className="relative p-2.5 rounded-xl text-slate-600 hover:bg-stone-100/80 hover:text-slate-900 transition-colors border border-transparent hover:border-stone-200/60"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-2xl shadow-dropdown border border-stone-200/90 p-3 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900">Platform Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No notifications at this time.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isBlocker = n.title?.includes('[BLOCKER]') || n.type?.includes('BLOCKER');
                      const isWarning = n.title?.includes('[WARNING]') || n.type?.includes('WARNING');

                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            if (n.link) navigate(n.link);
                            setShowNotifMenu(false);
                          }}
                          className={`p-3 rounded-2xl text-xs cursor-pointer transition-all border ${
                            isBlocker
                              ? 'bg-rose-50/70 border-rose-200/90 text-rose-950 hover:bg-rose-50'
                              : isWarning
                              ? 'bg-amber-50/70 border-amber-200/90 text-amber-950 hover:bg-amber-50'
                              : n.is_read
                              ? 'bg-white border-stone-200/70 text-slate-800 hover:bg-stone-50'
                              : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950 hover:bg-emerald-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold leading-tight">{n.title}</p>
                            {!n.is_read && (
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                                  isBlocker ? 'bg-rose-600' : isWarning ? 'bg-amber-600' : 'bg-emerald-600'
                                }`}
                              />
                            )}
                          </div>
                          <p className="text-[11.5px] opacity-85 mt-1 leading-relaxed font-normal">{n.message}</p>
                          {n.link && (
                            <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold underline opacity-90">
                              <span>Open related view</span>
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-stone-100/80 transition-colors border border-transparent hover:border-stone-200/60"
            >
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`}
                alt="Avatar"
                className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 object-cover"
              />
              <span className="hidden sm:inline text-[13px] font-bold text-slate-900">
                {user?.first_name || user?.username}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-2xl shadow-dropdown border border-stone-200/90 p-2 z-50 animate-fadeIn">
                <div className="px-3.5 py-2.5 border-b border-stone-100 mb-1">
                  <p className="text-[13px] font-bold text-slate-900 truncate">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate(user?.employee_id ? `/employees/360/${user.employee_id}` : '/dashboard');
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-800 hover:bg-stone-50 transition-colors"
                >
                  My Profile
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-2 mt-1"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
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
