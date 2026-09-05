// client/src/pages/attendance/AttendanceList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Filter,
  Eye,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, StatCard } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function AttendanceList() {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [employees, setEmployees] = useState([]);

  const { showSuccess, showError } = useNotifications();
  const { user, hasRole, isEmployeeOnly } = useAuth();
  const navigate = useNavigate();

  const [correctionData, setCorrectionData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '09:00',
    check_out: '18:00',
    status: 'manual_correction',
    correction_reason: ''
  });

  const loadAttendance = async () => {
    setLoading(true);
    try {
      let url = `/attendance?page=${pagination.page}&limit=${pagination.limit}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const res = await api.get(url);
      if (res.success) {
        setAttendance(res.data);
        setStats(res.stats || {});
        setPagination(res.pagination);
      }
    } catch (err) {
      showError(err.message || 'Failed to load attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [pagination.page, statusFilter, startDate, endDate]);

  useEffect(() => {
    async function loadEmps() {
      if (hasRole(['admin', 'hr_manager', 'payroll_manager'])) {
        const res = await api.get('/employees?limit=100');
        if (res.success) setEmployees(res.data);
      }
    }
    loadEmps();
  }, []);

  const handleSelfCheckIn = async () => {
    try {
      const res = await api.post('/attendance/check-in', {});
      if (res.success) {
        showSuccess(res.message);
        loadAttendance();
      }
    } catch (err) {
      showError(err.message || 'Check-in failed.');
    }
  };

  const handleSelfCheckOut = async () => {
    try {
      const res = await api.post('/attendance/check-out', {});
      if (res.success) {
        showSuccess(res.message);
        loadAttendance();
      }
    } catch (err) {
      showError(err.message || 'Check-out failed.');
    }
  };

  const openCorrection = (record) => {
    setSelectedRecord(record);
    setCorrectionData({
      employee_id: record.employee_id,
      date: record.date,
      check_in: record.check_in || '09:00',
      check_out: record.check_out || '18:00',
      status: 'manual_correction',
      correction_reason: ''
    });
    setShowCorrectionModal(true);
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    try {
      const url = selectedRecord ? `/attendance/correct/${selectedRecord.id}` : '/attendance/manual';
      const res = await api.post(url, correctionData);
      if (res.success) {
        showSuccess('Attendance correction saved and logged in system audit trail.');
        setShowCorrectionModal(false);
        loadAttendance();
      }
    } catch (err) {
      showError(err.message || 'Failed to save attendance correction.');
    }
  };

  const columns = [
    {
      header: 'Employee',
      accessor: 'first_name',
      cell: (row) => (
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => navigate(`/employees/360/${row.employee_id}`)}
        >
          <img
            src={row.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.first_name}`}
            alt={row.first_name}
            className="w-7 h-7 rounded-full bg-slate-100 object-cover"
          />
          <div>
            <p className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              {row.first_name} {row.last_name}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">{row.emp_code} • {row.department_name}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Date',
      accessor: 'date',
      cell: (row) => <span className="font-semibold text-slate-900">{row.date}</span>
    },
    {
      header: 'Check In / Out',
      accessor: 'check_in',
      cell: (row) => (
        <div className="text-xs font-mono">
          <span className="text-emerald-700 font-semibold">{row.check_in || '--:--'}</span>
          <span className="text-slate-400 mx-1.5">&rarr;</span>
          <span className={row.check_out ? 'text-slate-800 font-semibold' : 'text-red-500 font-bold'}>
            {row.check_out || 'Missing Out'}
          </span>
        </div>
      )
    },
    {
      header: 'Worked / Overtime',
      accessor: 'worked_hours',
      cell: (row) => (
        <div className="text-xs">
          <span className="font-bold text-slate-900">{row.worked_hours}h</span>
          {parseFloat(row.overtime_hours || 0) > 0 && (
            <span className="ml-1.5 text-emerald-600 font-bold text-[11px]">(+{row.overtime_hours}h OT)</span>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <Badge
          variant={
            row.status === 'present' ? 'success' :
            row.status === 'late' ? 'warning' :
            row.status === 'missing_checkout' ? 'danger' :
            row.status === 'overtime' ? 'purple' : 'neutral'
          }
          dot
          size="sm"
        >
          {row.status.replace('_', ' ').toUpperCase()}
        </Badge>
      )
    },
    ...(hasRole(['admin', 'hr_manager', 'payroll_manager']) ? [{
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => openCorrection(row)}
          >
            Correct
          </Button>
        </div>
      )
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Attendance & Time Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Biometric and web attendance logs driving worked hours, overtime, and payable days
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Check-In / Check-Out Widget */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <Button variant="primary" size="sm" icon={LogIn} onClick={handleSelfCheckIn}>
              Check In
            </Button>
            <Button variant="secondary" size="sm" icon={LogOut} onClick={handleSelfCheckOut}>
              Check Out
            </Button>
          </div>

          {hasRole(['admin', 'hr_manager']) && (
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => {
                setSelectedRecord(null);
                setShowCorrectionModal(true);
              }}
            >
              Manual Log
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Present Records" value={stats.present || 0} variant="emerald" />
        <StatCard title="Late Arrivals" value={stats.late || 0} variant="amber" />
        <StatCard
          title="Missing Checkouts"
          value={stats.missingCheckout || 0}
          variant="red"
          badgeText={stats.missingCheckout > 0 ? 'Requires Action' : 'All Clear'}
          badgeVariant={stats.missingCheckout > 0 ? 'danger' : 'success'}
        />
        <StatCard title="Total Overtime" value={`${stats.totalOvertimeHours || 0} Hours`} variant="blue" />
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
        >
          <option value="">All Attendance Statuses</option>
          <option value="present">Present</option>
          <option value="late">Late Arrival</option>
          <option value="missing_checkout">Missing Checkout (Exception)</option>
          <option value="overtime">Overtime Shift</option>
          <option value="manual_correction">Manual Correction</option>
        </select>
      </div>

      {/* Attendance Table */}
      <DataTable
        columns={columns}
        data={attendance}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
      />

      {/* Manual Correction Modal */}
      <Modal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        title={selectedRecord ? 'Attendance Correction & Audit' : 'Create Manual Attendance Log'}
        subtitle="Manual adjustments require an explicit audit justification reason"
        size="md"
      >
        <form onSubmit={handleSaveCorrection} className="space-y-4">
          {!selectedRecord && (
            <Select
              label="Select Employee"
              required
              value={correctionData.employee_id}
              onChange={(e) => setCorrectionData({ ...correctionData, employee_id: e.target.value })}
            >
              <option value="">Choose Employee...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Attendance Date"
              type="date"
              required
              value={correctionData.date}
              onChange={(e) => setCorrectionData({ ...correctionData, date: e.target.value })}
            />
            <Select
              label="Status"
              value={correctionData.status}
              onChange={(e) => setCorrectionData({ ...correctionData, status: e.target.value })}
              options={[
                { value: 'manual_correction', label: 'Manual Correction' },
                { value: 'present', label: 'Present' },
                { value: 'half_day', label: 'Half Day' },
                { value: 'overtime', label: 'Overtime' }
              ]}
            />
            <Input
              label="Check-In Time"
              type="time"
              required
              value={correctionData.check_in}
              onChange={(e) => setCorrectionData({ ...correctionData, check_in: e.target.value })}
            />
            <Input
              label="Check-Out Time"
              type="time"
              required
              value={correctionData.check_out}
              onChange={(e) => setCorrectionData({ ...correctionData, check_out: e.target.value })}
            />
          </div>

          <Input
            label="Mandatory Audit Justification / Reason"
            required
            placeholder="e.g. Employee biometric scanner timeout verified by manager"
            value={correctionData.correction_reason}
            onChange={(e) => setCorrectionData({ ...correctionData, correction_reason: e.target.value })}
            helperText="This reason will be stored permanently in the system audit logs."
          />

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCorrectionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save & Audit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AttendanceList;
