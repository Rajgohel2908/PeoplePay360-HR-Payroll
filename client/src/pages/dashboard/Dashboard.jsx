// client/src/pages/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  IndianRupee,
  ReceiptIndianRupee,
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
  FileSignature,
  Bell
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
import { useInView } from '../../hooks/useInView';
import { useAuth } from '../../contexts/AuthContext';

/**
 * AnimatedChartCard wraps dashboard charts in a scroll-triggered viewport observer.
 * Transitions smoothly into view and mounts the Recharts animation right as it scrolls into screen.
 */
function AnimatedChartCard({ title, subtitle, action, className = '', delay = 0, children }) {
  const [ref, inView] = useInView({ threshold: 0.08, rootMargin: '0px 0px -20px 0px', triggerOnce: true });

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out transform ${
        inView
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-6 scale-[0.99]'
      } ${className}`}
    >
      <Card title={title} subtitle={subtitle} action={action}>
        {inView ? (
          children
        ) : (
          <div className="h-72 w-full flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-stone-200 border-t-emerald-500 animate-spin opacity-20" />
          </div>
        )}
      </Card>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('2026');
  const navigate = useNavigate();

  const isHrManager = user?.role === 'hr_manager';

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

  const payrollTrendsData = charts?.payrollTrends || [];
  const attendanceDistData = charts?.attendanceDistribution || [];
  const departmentCostData = charts?.departmentCost || [];
  const leaveUsageData = charts?.leaveUsage || [];

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const pieColors = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Executive Welcome Banner (Light Sky-Blue with Crystal-Clear High-Contrast Text) */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-indigo-50/40 border border-sky-200/90 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 border border-sky-200/80 shadow-xs flex items-center justify-center font-black text-xl shrink-0">
            {user?.first_name ? user.first_name[0] : (user?.username ? user.username[0].toUpperCase() : 'P')}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isHrManager ? 'HR Operations Dashboard' : 'Executive HR & Payroll Dashboard'}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wider">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Welcome back, <span className="font-bold text-slate-900">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</span> &bull; {isHrManager ? 'Employee headcount, contract lifecycle, and attendance monitoring' : 'Real-time financial disbursements, contract statuses, and pre-flight payroll health'}
            </p>
          </div>
        </div>

        {!isHrManager && (
          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
            >
              <option value="2026">Payroll Year 2026</option>
              <option value="2025">Payroll Year 2025</option>
            </select>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/payroll/wizard')}
              icon={IndianRupee}
            >
              New Payrun Wizard
            </Button>
          </div>
        )}
      </div>

      {/* Discreet Operational Alerts Routing Notice (Hidden for HR Manager) */}
      {!isHrManager && alerts && alerts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-white rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-900">
                {alerts.length} Operational Exception(s) Routed to Notification Center
              </p>
              <p className="text-xs text-slate-500">
                Missing bank information, expired contracts, and checkout exceptions are actively monitored in your Notifications.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate('/payroll')}
            className="text-xs font-semibold shrink-0"
          >
            Open Validation Center
          </Button>
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
          icon={IndianRupee}
          variant="blue"
          onClick={() => navigate('/payroll')}
        />

        <StatCard
          title="Net Disbursement"
          value={formatCurrency(kpis.totalNetSalary)}
          subtitle="Net wages after taxes & PF"
          icon={ReceiptIndianRupee}
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
            <ReceiptIndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Payroll Cost Trend */}
        <AnimatedChartCard
          title="Monthly Payroll Trend (Gross vs Net)"
          subtitle="Real-time aggregation from executed payruns"
          className="lg:col-span-2"
          delay={0}
          action={
            <Button variant="ghost" size="xs" onClick={() => navigate('/payroll')}>
              View All Payruns <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollTrendsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}
                  itemStyle={{ color: '#ffffff', fontSize: '12px', fontWeight: 600 }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px', border: '1px solid #334155' }}
                />
                <Area
                  type="monotone"
                  dataKey="total_gross"
                  name="Gross Salary"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGross)"
                  isAnimationActive={true}
                  animationDuration={1400}
                  animationEasing="ease-out"
                  animationBegin={100}
                />
                <Area
                  type="monotone"
                  dataKey="total_net"
                  name="Net Disbursed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNet)"
                  isAnimationActive={true}
                  animationDuration={1400}
                  animationEasing="ease-out"
                  animationBegin={250}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AnimatedChartCard>

        {/* Attendance Distribution Donut */}
        <AnimatedChartCard
          title="Attendance Distribution"
          subtitle="August shift logs breakdown"
          delay={120}
        >
          <div className="h-72 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={attendanceDistData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={true}
                  animationDuration={1300}
                  animationEasing="ease-out"
                  animationBegin={150}
                >
                  {attendanceDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const sliceName = data.name || data.payload?.name || 'Shift Log';
                      const sliceValue = data.value !== undefined ? data.value : (data.payload?.value || 0);
                      const sliceColor = data.payload?.color || data.color || '#10b981';
                      const total = attendanceDistData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
                      const percentage = total > 0 ? ((Number(sliceValue) / total) * 100).toFixed(1) : 0;

                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 px-3.5 py-2.5 rounded-xl shadow-2xl text-white pointer-events-none min-w-[150px]">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: sliceColor }}
                            />
                            <span className="text-xs font-bold text-slate-100">{sliceName}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-4 text-xs">
                            <span className="text-slate-400 font-medium">Employees:</span>
                            <span className="font-extrabold text-white text-sm">{sliceValue}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-4 text-[11px] pt-1 mt-1 border-t border-slate-800 text-slate-400">
                            <span>Share:</span>
                            <span className="font-semibold text-emerald-400">{percentage}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 w-full text-[11px] text-slate-600 pt-2 border-t border-slate-100">
              {attendanceDistData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}: <b>{item.value}</b></span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedChartCard>
      </div>

      {/* Department Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Salary Cost */}
        <AnimatedChartCard
          title="Monthly Salary Cost by Department"
          subtitle="Active employment contract distribution"
          delay={0}
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentCostData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <YAxis type="category" dataKey="department_name" stroke="#64748b" fontSize={11} width={110} tickLine={false} />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), 'Monthly Cost']}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}
                  itemStyle={{ color: '#ffffff', fontSize: '12px', fontWeight: 600 }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px', border: '1px solid #334155' }}
                />
                <Bar
                  dataKey="total_salary_cost"
                  fill="#059669"
                  radius={[0, 6, 6, 0]}
                  barSize={16}
                  isAnimationActive={true}
                  animationDuration={1300}
                  animationEasing="ease-out"
                  animationBegin={150}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedChartCard>

        {/* Leave Usage by Type */}
        <AnimatedChartCard
          title="Leave Usage Breakdown"
          subtitle="Approved time off days by leave category"
          delay={120}
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveUsageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="leave_name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} Days`, 'Total Taken']}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}
                  itemStyle={{ color: '#ffffff', fontSize: '12px', fontWeight: 600 }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px', border: '1px solid #334155' }}
                />
                <Bar
                  dataKey="total_days_taken"
                  fill="#8b5cf6"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                  isAnimationActive={true}
                  animationDuration={1300}
                  animationEasing="ease-out"
                  animationBegin={150}
                >
                  {leaveUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || pieColors[index % pieColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedChartCard>
      </div>
    </div>
  );
}

export default Dashboard;
