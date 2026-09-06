// client/src/pages/ess/EmployeePortal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  LogIn,
  LogOut,
  CalendarCheck,
  Palmtree,
  ReceiptIndianRupee,
  Download,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { QuickAttendanceWidget } from '../../components/attendance/QuickAttendanceWidget';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function EmployeePortal() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [types, setTypes] = useState([]);

  const { showSuccess, showError } = useNotifications();
  const navigate = useNavigate();

  const getLocalTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalTodayString();

  const [submittingLeave, setSubmittingLeave] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: 1,
    start_date: today,
    end_date: today,
    duration_days: 1.0,
    reason: 'Personal time off'
  });

  // Auto-calculate leave duration in ESS portal
  useEffect(() => {
    if (leaveForm.start_date && leaveForm.end_date) {
      const s = new Date(leaveForm.start_date);
      const e = new Date(leaveForm.end_date);
      if (e >= s) {
        const diffTime = e.getTime() - s.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setLeaveForm((prev) => ({ ...prev, duration_days: Math.max(1, diffDays) }));
      }
    }
  }, [leaveForm.start_date, leaveForm.end_date]);

  const loadESSData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const empId = user?.employee_id || 1;
      const [res360, typesRes] = await Promise.all([
        api.get(`/employees/360/${empId}`),
        api.get('/time-off/types')
      ]);

      if (res360.success) setProfileData(res360.data);
      if (typesRes.success) setTypes(typesRes.data);
    } catch (err) {
      showError(err.message || 'Failed to load ESS portal.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadESSData();
  }, [user]);

  const handleCheckIn = async () => {
    try {
      const res = await api.post('/attendance/check-in', {});
      if (res.success) {
        showSuccess(res.message);
        loadESSData(true);
      }
    } catch (err) {
      showError(err.message || 'Check-in failed.');
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await api.post('/attendance/check-out', {});
      if (res.success) {
        showSuccess(res.message);
        loadESSData(true);
      }
    } catch (err) {
      showError(err.message || 'Check-out failed.');
    }
  };

  const handleDownloadPdf = (payslipId) => {
    // Navigate to the payslip detail page where the pixel-perfect
    // client-side html2canvas export is available
    navigate(`/payslips/${payslipId}`);
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();

    const currentToday = getLocalTodayString();
    if (leaveForm.start_date < currentToday) {
      showError('Start date cannot be in the past. Please select today or a future date.');
      return;
    }

    if (leaveForm.end_date < leaveForm.start_date) {
      showError('End date cannot be earlier than start date.');
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await api.post('/time-off/requests', {
        ...leaveForm,
        employee_id: user?.employee_id
      });
      if (res.success) {
        showSuccess(res.message || 'Leave request submitted successfully to HR department.');
        setShowLeaveModal(false);
        await loadESSData(true);
      }
    } catch (err) {
      showError(err.message || 'Failed to submit leave.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  if (loading || !profileData) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading Employee Self-Service portal...</p>
      </div>
    );
  }

  const { employee, activeContract, attendance, timeOff, payslips } = profileData;
  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      {/* Welcome Banner (Light Sky-Blue with Crystal-Clear High-Contrast Text) */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-indigo-50/40 border border-sky-200/90 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={employee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.first_name}`}
            alt={employee.first_name}
            className="w-16 h-16 rounded-2xl bg-white object-cover border-2 border-sky-200 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Welcome back, {employee.first_name}!
              </h1>
              <Badge variant="success" size="sm" dot>Active</Badge>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {employee.position_title} &bull; <span className="text-emerald-700 font-bold">{employee.department_name}</span> &bull; <span className="font-mono text-slate-600">{employee.employee_id}</span>
            </p>
          </div>
        </div>

        {/* Actions: Attendance */}
        <div className="flex flex-wrap items-center gap-2">
          <QuickAttendanceWidget onAttendanceChange={loadESSData} variant="banner" />
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Base Wage"
          value={activeContract ? formatCurrency(activeContract.wage) : 'N/A'}
          subtitle={activeContract ? `Contract #${activeContract.contract_id}` : 'No active contract'}
          icon={User}
          variant="emerald"
        />
        <StatCard
          title="Present Days (Month)"
          value={`${attendance.stats?.present_days || 0} Days`}
          subtitle={`${attendance.stats?.total_worked_hours || 0} Hours Worked`}
          icon={CalendarCheck}
          variant="blue"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          title="Available Leave"
          value={`${timeOff.allocations?.reduce((acc, a) => acc + parseFloat(a.remaining_days || 0), 0) || 0} Days`}
          subtitle="Remaining across all types"
          icon={Palmtree}
          variant="amber"
          onClick={() => navigate('/time-off')}
        />
        <StatCard
          title="My Payslips"
          value={`${payslips.length} Records`}
          subtitle="Latest ready for download"
          icon={ReceiptIndianRupee}
          variant="purple"
          onClick={() => navigate('/payslips')}
        />
      </div>

      {/* Leave Balances Ledger & Quick Request */}
      <Card
        title="My Annual Leave Balances"
        subtitle="2026 Entitlements and balance breakdown"
        action={
          <Button
            variant="primary"
            size="xs"
            icon={Plus}
            onClick={() => {
              const currentToday = getLocalTodayString();
              setLeaveForm((prev) => ({
                ...prev,
                start_date: !prev.start_date || prev.start_date < currentToday ? currentToday : prev.start_date,
                end_date: !prev.end_date || prev.end_date < currentToday ? currentToday : prev.end_date
              }));
              setShowLeaveModal(true);
            }}
          >
            Apply For Leave
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {timeOff.allocations?.map((alloc) => (
            <div key={alloc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{alloc.leave_type_name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${alloc.leave_color}20`, color: alloc.leave_color }}>
                  {alloc.leave_type_code}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{alloc.remaining_days}</span>
                <span className="text-xs text-slate-500">of {alloc.allocated_days} days left</span>
              </div>
              <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(parseFloat(alloc.remaining_days) / parseFloat(alloc.allocated_days || 1)) * 100}%`,
                    backgroundColor: alloc.leave_color || '#10b981'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Latest Payslips & Attendance Logs Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Payslips */}
        <Card
          title="My Recent Payslips"
          subtitle="Download official PDF compensation slips"
          action={
            <Button variant="ghost" size="xs" onClick={() => navigate('/payslips')}>
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="space-y-3">
            {payslips.slice(0, 4).map((ps) => (
              <div key={ps.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold font-mono text-slate-900">{ps.payslip_number}</p>
                  <p className="text-[11px] text-slate-500">{formatDate(ps.period_start)} &rarr; {formatDate(ps.period_end)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-emerald-700 text-sm">{formatCurrency(ps.net_salary)}</span>
                  <Button
                    variant="outline"
                    size="xs"
                    icon={Download}
                    onClick={() => handleDownloadPdf(ps.id)}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Attendance Logs */}
        <Card
          title="Recent Attendance"
          subtitle="Daily check-in and check-out records"
          action={
            <Button variant="ghost" size="xs" onClick={() => navigate('/attendance')}>
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="space-y-2">
            {attendance.recentLogs?.slice(0, 5).map((log) => {
              let sessions = [];
              if (log.notes) {
                try {
                  const p = JSON.parse(log.notes);
                  if (Array.isArray(p?.sessions)) sessions = p.sessions;
                } catch (e) {}
              }
              const isActive = sessions.some((s) => !s.out);

              return (
                <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{formatDate(log.date)}</span>
                      {sessions.length > 1 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {sessions.length} sessions
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      In: {log.check_in || '--:--'} &bull; Out:{' '}
                      {log.check_out ? (
                        log.check_out
                      ) : isActive ? (
                        <span className="text-emerald-600 font-semibold">Active</span>
                      ) : (
                        '--:--'
                      )}{' '}
                      &bull; <span className="font-semibold text-slate-700">{log.worked_hours || 0}h total</span>
                    </p>
                  </div>
                  <Badge variant={log.status === 'present' ? 'success' : log.status === 'late' ? 'warning' : log.status === 'overtime' ? 'purple' : 'danger'} size="sm" dot>
                    {log.status.replace('_', ' ')}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Submit Time Off Request"
        subtitle="Request leave days from your available balance"
        size="md"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <Select
            label="Leave Type"
            required
            value={leaveForm.leave_type_id}
            onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.paid ? 'Paid' : 'Unpaid / Loss of Pay'})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              required
              min={getLocalTodayString()}
              value={leaveForm.start_date}
              onChange={(e) => {
                const newStart = e.target.value;
                const currentToday = getLocalTodayString();
                if (newStart < currentToday) {
                  showError('Start date cannot be in the past.');
                  return;
                }
                setLeaveForm((prev) => ({
                  ...prev,
                  start_date: newStart,
                  end_date: prev.end_date && prev.end_date < newStart ? newStart : prev.end_date
                }));
              }}
            />
            <Input
              label="End Date"
              type="date"
              required
              min={leaveForm.start_date || getLocalTodayString()}
              value={leaveForm.end_date}
              onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
            />
          </div>

          <Input
            label="Reason / Notes"
            required
            placeholder="e.g. Doctor appointment"
            value={leaveForm.reason}
            onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
          />

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowLeaveModal(false)} disabled={submittingLeave}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingLeave} disabled={submittingLeave}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default EmployeePortal;
