// client/src/pages/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Lock, Mail, Shield, UserCheck, ArrowRight, Sparkles } from 'lucide-react';
import Logo from '../../components/ui/Logo';

export function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login, switchDemoRole } = useAuth();
  const { showError, showSuccess } = useNotifications();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password);
      showSuccess(`Welcome back, ${user.first_name || user.username}!`);
      if (user.role === 'employee') {
        navigate('/ess');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      showError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      role: 'admin',
      title: 'System Administrator',
      user: 'admin',
      pass: 'admin123',
      name: 'Aarav Sharma',
      desc: 'Full system access, user management, audit trail & configurations',
      badge: 'Admin Access',
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      role: 'payroll_manager',
      title: 'HR Payroll Manager',
      user: 'payroll_manager',
      pass: 'payrollmgr123',
      name: 'Vikram Singhania',
      desc: 'Payroll validation, blocker approvals, rule engine, payment lock',
      badge: 'Payroll Approver',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      role: 'payroll_user',
      title: 'HR Payroll Specialist',
      user: 'payroll_user',
      pass: 'payroll123',
      name: 'Kavita Iyer',
      desc: 'Payrun creation wizard, batch computation, email dispatch',
      badge: 'Payroll Preparer',
      badgeColor: 'bg-teal-100 text-teal-800'
    },
    {
      role: 'hr_manager',
      title: 'HR Operations Manager',
      user: 'hr_manager',
      pass: 'hr123',
      name: 'Aditi Verma',
      desc: 'Employee management, contract lifecycles, attendance & leave approvals',
      badge: 'HR Manager',
      badgeColor: 'bg-pink-100 text-pink-800'
    },
    {
      role: 'employee',
      title: 'Employee Self-Service',
      user: 'employee',
      pass: 'emp123',
      name: 'Amit Patel',
      desc: 'Personal attendance check-in, leave requests, balance ledger, payslip PDF',
      badge: 'Employee ESS',
      badgeColor: 'bg-amber-100 text-amber-800'
    }
  ];

  const handleQuickLogin = async (acc) => {
    setUsername(acc.user);
    setPassword(acc.pass);
    setLoading(true);
    try {
      const user = await switchDemoRole(acc.user, acc.pass);
      showSuccess(`Logged in as ${acc.title} (${user.first_name || user.username})`);
      if (acc.role === 'employee') {
        navigate('/ess');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      showError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 mb-2">
        <div className="flex justify-center mb-3">
          <Logo variant="dark" size="xl" className="h-16 w-auto drop-shadow-lg" />
        </div>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
          Connected Enterprise HR & Payroll Management Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        {/* Main Login Card */}
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-200/80">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username or Corporate Email"
              type="text"
              required
              icon={Mail}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or admin@peoplepay360.com"
            />

            <Input
              label="Password"
              type="password"
              required
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-bold shadow-md shadow-emerald-600/20"
            >
              Sign In to Platform
            </Button>
          </form>

          {/* 1-Click Interactive Demo Role Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                1-Click Demo Persona Switcher
              </span>
              <span className="text-[11px] text-slate-400">Select any role to test</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoAccounts.map((acc) => (
                <div
                  key={acc.role}
                  onClick={() => handleQuickLogin(acc)}
                  className={`
                    p-3 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/70 hover:bg-white
                    cursor-pointer transition-all duration-150 hover:shadow-md group flex flex-col justify-between
                    ${acc.role === 'admin' ? 'sm:col-span-2 bg-emerald-50/40 border-emerald-200' : ''}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                          {acc.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{acc.name}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${acc.badgeColor}`}>
                      {acc.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 line-clamp-1 leading-snug">
                    {acc.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>AES-256 Encrypted &bullet; Immutable Payroll Audit &bullet; Role-Based Access Control</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
