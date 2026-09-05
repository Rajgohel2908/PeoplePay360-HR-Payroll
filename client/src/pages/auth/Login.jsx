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
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Calculator, 
  Users,
  FileCheck,
  TrendingUp,
  Key,
  Check,
  AlertCircle,
  HelpCircle
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

      {/* Main Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10">
        
        {/* Left Hero & Feature Showcase (Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-8 pr-4">
          <div>
            <Logo size="lg" className="mb-6" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Enterprise Platform</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              One Connected Platform for HR & Payroll Operations
            </h1>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Eliminate payroll errors with dynamic contract resolution, attendance-driven proration, sequenced salary rules, and automated 9-category pre-flight blocker checks.
            </p>
          </div>

          {/* Interactive Live Metric Card Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Current Payroll Cycle</p>
                  <p className="text-[11px] text-slate-400">August 2026 &bull; Active Run</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-800">
                100% Calculated
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Gross Wage</p>
                <p className="text-xs font-bold font-mono text-slate-900 mt-0.5">₹42.8L</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Deductions</p>
                <p className="text-xs font-bold font-mono text-slate-900 mt-0.5">₹5.2L</p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-900">
                <p className="text-[10px] uppercase font-semibold text-emerald-700">Net Payable</p>
                <p className="text-xs font-bold font-mono text-emerald-800 mt-0.5">₹37.6L</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Pre-Flight Validation Center
              </span>
              <span className="font-semibold text-slate-700">3 Blockers Detected</span>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 pt-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>AES-256 Bank Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Variance Anomaly Flags</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PDFKit Payslip Engine</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Strict 5-Tier RBAC</span>
            </div>
          </div>
        </div>

        {/* Right Authentication & 1-Click Persona Card */}
        <div className="w-full lg:col-span-7">
          <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200/80">
            
            {/* Header in mobile or title */}
            <div className="mb-6 lg:mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="lg:hidden flex justify-center sm:justify-start mb-3">
                  <Logo size="md" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Sign In to Platform
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Enter credentials or choose an instant 1-click persona to explore
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

            {/* 1-Click Interactive Demo Role Switcher */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Instant Demo Persona Switcher
                </span>
                <span className="text-[11px] text-slate-400 font-medium">1-click instant login</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {demoAccounts.map((acc) => (
                  <button
                    type="button"
                    key={acc.role}
                    onClick={() => handleQuickLogin(acc)}
                    className={`
                      p-3 rounded-2xl border border-slate-200/80 hover:border-emerald-500/70 bg-slate-50/60 hover:bg-white
                      cursor-pointer transition-all duration-150 hover:shadow-sm group flex flex-col justify-between text-left
                      ${acc.role === 'admin' ? 'sm:col-span-2 bg-emerald-50/30 border-emerald-200/70' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {acc.title}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{acc.name}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${acc.badgeColor}`}>
                        {acc.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 line-clamp-1 leading-snug">
                      {acc.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

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
