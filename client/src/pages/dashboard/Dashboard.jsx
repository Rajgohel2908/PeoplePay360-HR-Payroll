// client/src/pages/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  Receipt,
  Palmtree,
  Activity,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Building,
  CheckCircle2,
  FileSignature
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import api from '../../api/client';
import { StatCard, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DashboardSkeleton } from '../../components/ui/SkeletonLoader';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('2026');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const res = await api.get(`/dashboard?period_year=${periodFilter}`);
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [periodFilter]);

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  const { kpis, charts, alerts, latestPayrun } = data;

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const pieColors = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Header & Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Executive HR & Payroll Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial disbursements, contract statuses, and pre-flight payroll health
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="2026">Payroll Year 2026</option>
            <option value="2025">Payroll Year 2025</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/payroll/wizard')}
            icon={DollarSign}
          >
            New Payrun Wizard
          </Button>
        </div>
      </div>

      {/* Critical Operational Alert Banners if Blockers Exist */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-subtle ${
                alert.severity === 'blocker'
                  ? 'bg-red-50/80 border-red-200 text-red-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${alert.severity === 'blocker' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  {alert.severity === 'blocker' ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider">{alert.title}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${alert.severity === 'blocker' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 opacity-90">{alert.description}</p>
                  {alert.items && alert.items.length > 0 && (
                    <p className="text-[11px] font-semibold mt-1 opacity-80">
                      Affected: {alert.items.join(' • ')}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant={alert.severity === 'blocker' ? 'danger' : 'warning'}
                size="xs"
                onClick={() => navigate(alert.actionLink)}
                className="shrink-0 font-bold"
              >
                Resolve in {alert.type}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Headcount"
          value={`${kpis.activeEmployees} / ${kpis.totalEmployees}`}
          subtitle="Full-time & Probation staff"
          icon={Users}
          variant="emerald"
          onClick={() => navigate('/employees')}
        />

        <StatCard
          title="Total Gross Payroll"
          value={formatCurrency(kpis.totalGrossSalary)}
          subtitle="Current active payroll cycle"
          icon={DollarSign}
          variant="blue"
          onClick={() => navigate('/payroll')}
        />

        <StatCard
          title="Net Disbursement"
          value={formatCurrency(kpis.totalNetSalary)}
          subtitle="Net wages after taxes & PF"
          icon={Receipt}
          variant="purple"
          onClick={() => navigate('/payslips')}
        />

        <StatCard
          title="Pre-Flight Health"
          value={kpis.payrollBlockers > 0 ? `${kpis.payrollBlockers} Blockers` : 'All Checks Passed'}
          badgeText={kpis.payrollBlockers > 0 ? `${kpis.payrollBlockers} Blockers` : `${kpis.payrollWarnings} Warnings`}
          badgeVariant={kpis.payrollBlockers > 0 ? 'danger' : 'warning'}
          subtitle={`${kpis.payrollWarnings} Warnings under review`}
          icon={ShieldAlert}
          variant={kpis.payrollBlockers > 0 ? 'red' : 'amber'}
          onClick={() => navigate('/payroll')}
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Health</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{kpis.attendanceHealthPercent}% Present Rate</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Biometric logs current month</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Time Off</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{kpis.pendingTimeOff} Requests</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting manager approval</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Palmtree className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Historical Payslips</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{kpis.payslipsGenerated} Generated</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Archived PDF payslip records</p>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Payroll Cost Trend */}
        <Card
          title="Monthly Payroll Trend (Gross vs Net)"
          subtitle="Real-time aggregation from executed payruns"
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="xs" onClick={() => navigate('/payroll')}>
              View All Payruns <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.payrollTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="payrun_number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Area type="monotone" dataKey="total_gross" name="Gross Salary" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorGross)" />
                <Area type="monotone" dataKey="total_net" name="Net Disbursed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Attendance Distribution Donut */}
        <Card title="Attendance Distribution" subtitle="August shift logs breakdown">
          <div className="h-72 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={charts.attendanceDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {charts.attendanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 w-full text-[11px] text-slate-600 pt-2 border-t border-slate-100">
              {charts.attendanceDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}: <b>{item.value}</b></span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Department Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Salary Cost */}
        <Card title="Monthly Salary Cost by Department" subtitle="Active employment contract distribution">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.departmentCost} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <YAxis type="category" dataKey="department_name" stroke="#64748b" fontSize={11} width={110} tickLine={false} />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), 'Monthly Cost']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Bar dataKey="total_salary_cost" fill="#059669" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Leave Usage by Type */}
        <Card title="Leave Usage Breakdown" subtitle="Approved time off days by leave category">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.leaveUsage} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="leave_name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} Days`, 'Total Taken']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Bar dataKey="total_days_taken" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
