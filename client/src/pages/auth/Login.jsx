// client/src/pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Logo from '../../components/ui/Logo';
import {
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

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
      desc: 'Full system management, user provisioning, global settings & audit trail',
      badge: 'Admin Access',
      badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
    },
    {
      role: 'payroll_manager',
      title: 'HR Payroll Manager',
      user: 'payroll_manager',
      pass: 'payrollmgr123',
      name: 'Vikram Singhania',
      desc: 'Pre-flight blocker approvals, payment locks, and salary rule architecture',
      badge: 'Payroll Approver',
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
    },
    {
      role: 'payroll_user',
      title: 'HR Payroll Specialist',
      user: 'payroll_user',
      pass: 'payroll123',
      name: 'Kavita Iyer',
      desc: '4-step payrun creation wizard, attendance sync, and payslip generation',
      badge: 'Payroll Preparer',
      badgeColor: 'bg-teal-50 text-teal-700 border border-teal-200/60'
    },
    {
      role: 'hr_manager',
      title: 'HR Operations Manager',
      user: 'hr_manager',
      pass: 'hr123',
      name: 'Aditi Verma',
      desc: 'Employee 360, contract lifecycles, and leave allocation approvals',
      badge: 'HR Manager',
      badgeColor: 'bg-pink-50 text-pink-700 border border-pink-200/60'
    },
    {
      role: 'employee',
      title: 'Employee Self-Service',
      user: 'employee',
      pass: 'emp123',
      name: 'Amit Patel',
      desc: 'Punch attendance, check leave balances, and download monthly payslip PDFs',
      badge: 'Employee ESS',
      badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200/60'
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
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
      {/* Subtle ambient decorative gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container - Balanced 50/50 Grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center z-10">

        {/* Left Branding Showcase (Desktop - Exactly Half Width) */}
        <div className="hidden lg:flex flex-col items-center justify-center text-center px-4 py-8 space-y-6">
          <div className="w-full flex items-center justify-center">
            <Logo
              size="hero"
              className="justify-center"
              imgClassName="max-w-[360px] xl:max-w-[440px] w-full h-auto select-none transition-transform duration-300 hover:scale-102 drop-shadow-xs"
            />
          </div>

        </div>

        {/* Right Authentication Card (Desktop - Exactly Half Width) */}
        <div className="w-full">
          <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200/80">

            {/* Header in mobile or title */}
            <div className="mb-6 lg:mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="lg:hidden flex justify-center sm:justify-start mb-4">
                  <Logo size="lg" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Sign In to Platform
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Enter your credentials to access your workspace
                </p>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secure Auth</span>
              </div>
            </div>

            {/* Standard Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Corporate Email or Username"
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

              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-400 text-[11px]">First time or forgot password?</span>
                <Link
                  to="/forgot-password"
                  className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline cursor-pointer"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full font-semibold shadow-xs"
                  icon={<ArrowRight className="w-4 h-4 ml-1" />}
                >
                  Sign In to Workspace
                </Button>
              </div>
            </form>



            {/* Micro footer inside card */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-500 font-normal">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Protected by Enterprise Role-Based Access Control
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

export default Login;
