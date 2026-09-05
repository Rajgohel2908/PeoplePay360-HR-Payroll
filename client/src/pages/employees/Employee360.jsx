// client/src/pages/employees/Employee360.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  FileSignature,
  CalendarCheck,
  Palmtree,
  ReceiptIndianRupee,
  FileText,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ExternalLink,
  Edit2,
  Download,
  AlertTriangle,
  Key,
  Lock
} from 'lucide-react';
import api from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function Employee360() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [pwdLoading, setPwdLoading] = useState(false);

  const { showSuccess, showError } = useNotifications();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const loadEmployee360 = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/employees/360/${id}`);
      if (res.success) {
        setData(res.data);
        setEditFormData(res.data.employee);
      }
    } catch (err) {
      console.error(err);
      showError(err.message || 'Failed to load Employee 360 data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployee360();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading Unified Employee 360 operational hub...</p>
      </div>
    );
  }

  const { employee, activeContract, contracts, attendance, timeOff, payslips, documents, auditLogs } = data;

  const openEditModal = () => {
    setEditFormData({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      phone: employee.phone || '',
      employment_status: employee.employment_status || 'Active',
      bank_name: employee.bank_name || '',
      account_number: employee.account_number || '',
      ifsc_code: employee.ifsc_code || '',
      pan_number: employee.pan_number || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        phone: editFormData.phone,
        employment_status: editFormData.employment_status,
        bank_name: editFormData.bank_name,
        account_number: editFormData.account_number,
        ifsc_code: editFormData.ifsc_code,
        pan_number: editFormData.pan_number
      };
      const res = await api.put(`/employees/${employee.id}`, payload);
      if (res.success) {
        showSuccess('Employee profile updated successfully!');
        setShowEditModal(false);
        loadEmployee360();
      }
    } catch (err) {
      showError(err.message || 'Failed to update employee profile.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password.length < 6) {
      showError('New password must be at least 6 characters in length.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showError('New passwords do not match. Please re-enter.');
      return;
    }
    setPwdLoading(true);
    try {
      const res = await api.put('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      showSuccess(res.message || 'Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      showError(err.message || 'Failed to change password. Check your current password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'personal', label: 'Personal & Statutory', icon: FileText },
    { id: 'contracts', label: 'Contracts', icon: FileSignature, badge: contracts?.length },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'timeoff', label: 'Time Off / Leave', icon: Palmtree, badge: timeOff?.requests?.length },
    { id: 'payroll', label: 'Payroll & Payslips', icon: ReceiptIndianRupee, badge: payslips?.length }
  ];

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const isMissingBank = !employee.bank_name || !employee.account_number;
  const isSelf = String(user?.employee_id) === String(employee.id);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(hasRole(['admin', 'hr_manager']) ? '/employees' : '/ess')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {hasRole(['admin', 'hr_manager']) ? 'Back to Employee Directory' : 'Back to Self-Service'}
        </button>

        <div className="flex items-center gap-2">
          {(isSelf || hasRole(['admin'])) && (
            <Button
              variant="outline"
              size="sm"
              icon={Key}
              onClick={() => setShowPasswordModal(true)}
            >
              Change Password
            </Button>
          )}

          {hasRole(['admin', 'hr_manager', 'payroll_manager']) && (
            <Button
              variant="outline"
              size="sm"
              icon={Edit2}
              onClick={openEditModal}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={employee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.first_name}`}
                alt={employee.first_name}
                className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-white shadow-md object-cover"
              />
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                employee.employment_status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {employee.first_name} {employee.last_name}
                </h1>
                <Badge variant={employee.employment_status === 'Active' ? 'success' : 'warning'} dot>
                  {employee.employment_status}
                </Badge>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {employee.employee_id}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                {employee.position_title} &bull; <span className="font-semibold text-slate-800">{employee.department_name}</span>
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {employee.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {employee.phone || 'N/A'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> Manager: <b>{employee.manager_name || 'Executive Leadership'}</b>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Header Pill */}
          <div className="flex md:flex-col items-end gap-2 bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl w-full md:w-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Monthly Wage
            </span>
            <span className="text-xl font-black text-emerald-600">
              {activeContract ? formatCurrency(activeContract.wage) : 'No Active Contract'}
            </span>
            <span className="text-[10px] text-slate-400">
              {activeContract ? `Contract #${activeContract.contract_id}` : 'Requires Contract Assignment'}
            </span>
          </div>
        </div>

        {/* Missing Bank Details Warning Banner if applicable */}
        {isMissingBank && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span><b>Payroll Blocker:</b> Bank details missing. Salary cannot be disbursed until account & IFSC are updated.</span>
            </div>
            <Button variant="danger" size="xs" onClick={() => setShowEditModal(true)}>
              Update Bank Details
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Contract"
              value={activeContract ? formatCurrency(activeContract.wage) : 'None'}
              subtitle={activeContract ? `Valid to ${activeContract.end_date ? formatDate(activeContract.end_date) : 'Open-ended'}` : 'Expired or Missing'}
              icon={FileSignature}
              variant="emerald"
            />
            <StatCard
              title="Attendance Health"
              value={`${attendance.stats?.present_days || 0} Present`}
              subtitle={`${attendance.stats?.total_worked_hours || 0} Hours Logged`}
              icon={CalendarCheck}
              variant="blue"
            />
            <StatCard
              title="Leave Remaining"
              value={`${timeOff.allocations?.reduce((acc, a) => acc + parseFloat(a.remaining_days || 0), 0) || 0} Days`}
              subtitle="2026 Annual Available"
              icon={Palmtree}
              variant="amber"
            />
            <StatCard
              title="Generated Payslips"
              value={`${payslips.length} Cycles`}
              subtitle="Confidential PDF records"
              icon={ReceiptIndianRupee}
              variant="purple"
            />
          </div>

          {/* Quick Employment Snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Employment Details">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-slate-400 font-medium">Employee ID</dt>
                  <dd className="font-bold text-slate-900 font-mono mt-0.5">{employee.employee_id}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Joining Date</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{formatDate(employee.joining_date)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Employment Type</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{employee.employee_type}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Working Schedule</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{employee.schedule_name || 'Standard 40h'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Cost Center</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{employee.department_code || 'GEN'}-100</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Reporting Line</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{employee.manager_name || 'Executive Lead'}</dd>
                </div>
              </dl>
            </Card>

            <Card title="Bank & Statutory Overview">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-slate-400 font-medium">Bank Name</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{employee.bank_name || 'Not Configured (Blocker)'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Account Number</dt>
                  <dd className="font-bold text-slate-900 font-mono mt-0.5">{employee.account_number || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">IFSC Code</dt>
                  <dd className="font-bold text-slate-900 font-mono mt-0.5">{employee.ifsc_code || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">PAN Card</dt>
                  <dd className="font-bold text-slate-900 font-mono mt-0.5">{employee.pan_number || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">UAN Number</dt>
                  <dd className="font-bold text-slate-900 font-mono mt-0.5">{employee.uan_number || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Tax Status</dt>
                  <dd className="font-bold text-emerald-600 mt-0.5">TDS Deductible</dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: PERSONAL & STATUTORY */}
      {activeTab === 'personal' && (
        <Card title="Personal Information & Contact Directory">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider">Date of Birth</p>
              <p className="font-bold text-slate-900 mt-1">{formatDate(employee.date_of_birth)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider">Gender</p>
              <p className="font-bold text-slate-900 mt-1">{employee.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider">Country of Residence</p>
              <p className="font-bold text-slate-900 mt-1">{employee.country || 'India'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-400 font-semibold uppercase tracking-wider">Permanent Residential Address</p>
              <p className="font-bold text-slate-900 mt-1">{employee.address}, {employee.city}, {employee.state} - {employee.postal_code}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider">Emergency Contact Person</p>
              <p className="font-bold text-slate-900 mt-1">{employee.emergency_name || 'N/A'} ({employee.emergency_relation || 'Relation'})</p>
              <p className="text-slate-500 mt-0.5">{employee.emergency_phone || 'N/A'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: CONTRACTS */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Contract Lifecycle History</h3>
            {hasRole(['admin', 'hr_manager']) && (
              <Button variant="primary" size="xs" onClick={() => navigate('/contracts')}>
                Create New Contract
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {contracts.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border transition-all ${
                  c.status === 'active' ? 'bg-emerald-50/40 border-emerald-300' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">Contract #{c.contract_id}</h4>
                      <Badge variant={c.status === 'active' ? 'success' : 'neutral'} dot>
                        {c.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDate(c.start_date)} &rarr; {c.end_date ? formatDate(c.end_date) : 'Open-ended'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Structure: <b>{c.salary_structure_name || 'Standard IT'}</b> &bull; Schedule: <b>{c.schedule_name || 'Standard 40h'}</b>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-emerald-600">{formatCurrency(c.wage)}</span>
                    <span className="text-[10px] text-slate-400 block uppercase">Monthly Base Compensation</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard title="Present Days" value={attendance.stats?.present_days || 0} variant="emerald" />
            <StatCard title="Late Check-ins" value={attendance.stats?.late_days || 0} variant="amber" />
            <StatCard title="Missing Checkouts" value={attendance.stats?.missing_checkouts || 0} variant="red" />
            <StatCard title="Total Overtime" value={`${attendance.stats?.total_overtime_hours || 0}h`} variant="blue" />
          </div>

          <Card title="Recent Daily Attendance Logs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Check In</th>
                    <th className="py-2.5 px-3">Check Out</th>
                    <th className="py-2.5 px-3">Worked Hours</th>
                    <th className="py-2.5 px-3">Overtime</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.recentLogs?.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{formatDate(log.date)}</td>
                      <td className="py-2.5 px-3 font-mono">{log.check_in || '--:--'}</td>
                      <td className="py-2.5 px-3 font-mono">{log.check_out || '--:--'}</td>
                      <td className="py-2.5 px-3 font-bold">{log.worked_hours}h</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-semibold">{log.overtime_hours > 0 ? `+${log.overtime_hours}h` : '--'}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={
                          log.status === 'present' ? 'success' :
                          log.status === 'late' ? 'warning' :
                          log.status === 'missing_checkout' ? 'danger' : 'neutral'
                        } size="sm" dot>
                          {log.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5: TIME OFF / LEAVE */}
      {activeTab === 'timeoff' && (
        <div className="space-y-6">
          {/* Allocations Ledger */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {timeOff.allocations?.map((alloc) => (
              <div key={alloc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{alloc.leave_type_name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${alloc.leave_color}20`, color: alloc.leave_color }}>
                    {alloc.leave_type_code}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900">{alloc.remaining_days}</span>
                  <span className="text-xs text-slate-500">of {alloc.allocated_days} days remaining</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(parseFloat(alloc.remaining_days) / parseFloat(alloc.allocated_days)) * 100}%`,
                      backgroundColor: alloc.leave_color || '#10b981'
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Used: {alloc.used_days}d &bull; Pending: {alloc.pending_days}d</p>
              </div>
            ))}
          </div>

          {/* Leave Requests Table */}
          <Card title="Leave Request History">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Leave Type</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Dates</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeOff.requests?.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{req.leave_type_name}</td>
                      <td className="py-2.5 px-3 font-bold">{req.duration_days} Days</td>
                      <td className="py-2.5 px-3 text-slate-600">{formatDate(req.start_date)} &rarr; {formatDate(req.end_date)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{req.reason || 'Personal'}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={
                          req.status === 'approved' ? 'success' :
                          req.status === 'submitted' ? 'warning' :
                          req.status === 'refused' ? 'danger' : 'neutral'
                        } size="sm" dot>
                          {req.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 6: PAYROLL & PAYSLIPS */}
      {activeTab === 'payroll' && (
        <Card title="Historical Payslip Records">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Payslip ID</th>
                  <th className="py-2.5 px-3">Pay Period</th>
                  <th className="py-2.5 px-3">Gross Salary</th>
                  <th className="py-2.5 px-3">Deductions</th>
                  <th className="py-2.5 px-3">Net Disbursed</th>
                  <th className="py-2.5 px-3">Payment Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ps.payslip_number}</td>
                    <td className="py-2.5 px-3 text-slate-600">{formatDate(ps.period_start)} &rarr; {formatDate(ps.period_end)}</td>
                    <td className="py-2.5 px-3 font-semibold">{formatCurrency(ps.gross_salary)}</td>
                    <td className="py-2.5 px-3 text-red-600 font-semibold">{formatCurrency(ps.total_deductions)}</td>
                    <td className="py-2.5 px-3 font-black text-emerald-600">{formatCurrency(ps.net_salary)}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={ps.payment_status === 'Paid' ? 'success' : 'warning'} size="sm" dot>
                        {ps.payment_status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => navigate(`/payslips/${ps.id}`)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        View & Download PDF &rarr;
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Employee Information"
        subtitle={`Update master records for ${employee.first_name} ${employee.last_name}`}
        size="lg"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              value={editFormData.first_name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={editFormData.last_name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
            />
            <Input
              label="Contact Phone"
              value={editFormData.phone || ''}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
            <Select
              label="Employment Status"
              value={editFormData.employment_status || 'Active'}
              onChange={(e) => setEditFormData({ ...editFormData, employment_status: e.target.value })}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Probation', label: 'Probation' },
                { value: 'Notice', label: 'Notice Period' },
                { value: 'Terminated', label: 'Terminated' }
              ]}
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Bank & Statutory Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                required
                value={editFormData.bank_name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, bank_name: e.target.value })}
              />
              <Input
                label="Account Number"
                required
                value={editFormData.account_number || ''}
                onChange={(e) => setEditFormData({ ...editFormData, account_number: e.target.value })}
              />
              <Input
                label="IFSC Code"
                required
                value={editFormData.ifsc_code || ''}
                onChange={(e) => setEditFormData({ ...editFormData, ifsc_code: e.target.value })}
              />
              <Input
                label="PAN Card Number"
                value={editFormData.pan_number || ''}
                onChange={(e) => setEditFormData({ ...editFormData, pan_number: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* In-App Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        }}
        title="Change Account Password"
        subtitle="Update your user login credentials"
        size="md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            required
            icon={Lock}
            value={passwordForm.current_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
            placeholder="Enter your current password"
          />

          <Input
            label="New Password"
            type="password"
            required
            icon={Key}
            value={passwordForm.new_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
            placeholder="Minimum 6 characters"
          />

          <Input
            label="Confirm New Password"
            type="password"
            required
            icon={Key}
            value={passwordForm.confirm_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
            placeholder="Re-enter new password"
          />

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={pwdLoading}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Employee360;
