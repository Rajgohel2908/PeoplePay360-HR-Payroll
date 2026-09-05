// client/src/pages/timeoff/TimeOffDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Palmtree,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Check,
  X
} from 'lucide-react';
import api from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function TimeOffDashboard() {
  const [allocations, setAllocations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('approve'); // 'approve' | 'refuse'
  const [approverComment, setApproverComment] = useState('');
  const [employees, setEmployees] = useState([]);

  const { showSuccess, showError } = useNotifications();
  const { user, hasRole, isEmployeeOnly } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type_id: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    duration_days: 1.0,
    reason: 'Personal time off'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [typesRes, allocRes, reqRes] = await Promise.all([
        api.get('/time-off/types'),
        api.get('/time-off/allocations'),
        api.get('/time-off/requests')
      ]);

      if (typesRes.success) setTypes(typesRes.data);
      if (allocRes.success) setAllocations(allocRes.data);
      if (reqRes.success) setRequests(reqRes.data);
    } catch (err) {
      showError(err.message || 'Failed to load time off data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    async function loadEmps() {
      if (hasRole(['admin', 'hr_manager', 'payroll_manager'])) {
        const res = await api.get('/employees?limit=100');
        if (res.success) setEmployees(res.data);
      }
    }
    loadEmps();
  }, []);

  // Auto-calculate duration days from dates
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const s = new Date(formData.start_date);
      const e = new Date(formData.end_date);
      if (e >= s) {
        const diffTime = Math.abs(e - s);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setFormData(prev => ({ ...prev, duration_days: diffDays }));
      }
    }
  }, [formData.start_date, formData.end_date]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        employee_id: isEmployeeOnly ? user.employee_id : (formData.employee_id || user.employee_id)
      };

      const res = await api.post('/time-off/requests', payload);
      if (res.success) {
        showSuccess('Time off request submitted successfully for approval.');
        setShowRequestModal(false);
        loadData();
      }
    } catch (err) {
      showError(err.message || 'Failed to submit leave request.');
    }
  };

  const handleDecision = async (e) => {
    e.preventDefault();
    try {
      const endpoint = actionType === 'approve'
        ? `/time-off/requests/${selectedRequest.id}/approve`
        : `/time-off/requests/${selectedRequest.id}/refuse`;

      const res = await api.post(endpoint, { approver_comment: approverComment });
      if (res.success) {
        showSuccess(`Leave request ${actionType === 'approve' ? 'APPROVED' : 'REFUSED'} and ledger updated.`);
        setShowActionModal(false);
        loadData();
      }
    } catch (err) {
      showError(err.message || 'Failed to process decision.');
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
      header: 'Leave Type',
      accessor: 'leave_type_name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.leave_color || '#10b981' }} />
          <span className="font-semibold text-slate-900 text-xs">{row.leave_type_name}</span>
        </div>
      )
    },
    {
      header: 'Dates & Duration',
      accessor: 'duration_days',
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs">{row.duration_days} Day{row.duration_days > 1 ? 's' : ''}</span>
          <p className="text-[11px] text-slate-500">{row.start_date} &rarr; {row.end_date}</p>
        </div>
      )
    },
    {
      header: 'Reason',
      accessor: 'reason',
      cell: (row) => <span className="text-xs text-slate-600 italic">"{row.reason || 'Personal'}"</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <Badge
          variant={
            row.status === 'approved' ? 'success' :
            row.status === 'submitted' ? 'warning' :
            row.status === 'refused' ? 'danger' : 'neutral'
          }
          dot
          size="sm"
        >
          {row.status.toUpperCase()}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {hasRole(['admin', 'hr_manager', 'payroll_manager']) && row.status === 'submitted' && (
            <>
              <Button
                variant="primary"
                size="xs"
                onClick={() => {
                  setSelectedRequest(row);
                  setActionType('approve');
                  setApproverComment('Approved.');
                  setShowActionModal(true);
                }}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="xs"
                onClick={() => {
                  setSelectedRequest(row);
                  setActionType('refuse');
                  setApproverComment('');
                  setShowActionModal(true);
                }}
              >
                Refuse
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Time Off & Leave Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Annual leave balance allocations, request submissions, and manager approval workflows
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setShowRequestModal(true)}
        >
          Request Time Off
        </Button>
      </div>

      {/* Allocation Ledger Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {allocations.map((alloc) => (
          <div key={alloc.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">{alloc.leave_type_name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${alloc.leave_color}20`, color: alloc.leave_color }}>
                {alloc.leave_type_code}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{alloc.remaining_days}</span>
              <span className="text-xs font-semibold text-slate-500">of {alloc.allocated_days} days</span>
            </div>

            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(parseFloat(alloc.remaining_days) / parseFloat(alloc.allocated_days || 1)) * 100}%`,
                  backgroundColor: alloc.leave_color || '#10b981'
                }}
              />
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Used: <b>{alloc.used_days}d</b></span>
              <span>Pending: <b>{alloc.pending_days}d</b></span>
            </div>
          </div>
        ))}
      </div>

      {/* Requests Table */}
      <DataTable
        columns={columns}
        data={requests}
        loading={loading}
        searchPlaceholder="Search requests by employee or reason..."
      />

      {/* Submit Leave Request Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Submit Time Off Request"
        subtitle="Request leave days from annual balance allocations"
        size="md"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          {!isEmployeeOnly && (
            <Select
              label="Select Employee"
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            >
              <option value="">Choose Employee (or Self)...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>
              ))}
            </Select>
          )}

          <Select
            label="Leave Type"
            required
            value={formData.leave_type_id}
            onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
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
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Calculated Duration:</span>
            <span className="font-bold text-slate-900 text-sm">{formData.duration_days} Day(s)</span>
          </div>

          <Input
            label="Reason / Remarks"
            required
            placeholder="e.g. Family function in Ahmedabad"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          />

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowRequestModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Decision Modal (Approve / Refuse) */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={actionType === 'approve' ? 'Approve Time Off Request' : 'Refuse Time Off Request'}
        subtitle={`Action for ${selectedRequest?.first_name} ${selectedRequest?.last_name} (${selectedRequest?.duration_days} days of ${selectedRequest?.leave_type_name})`}
        size="md"
      >
        <form onSubmit={handleDecision} className="space-y-4">
          <Input
            label={actionType === 'approve' ? 'Approver Comments' : 'Mandatory Refusal Reason'}
            required={actionType === 'refuse'}
            value={approverComment}
            onChange={(e) => setApproverComment(e.target.value)}
            placeholder={actionType === 'approve' ? 'Approved. Enjoy your time off!' : 'Reason for declining...'}
          />

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowActionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={actionType === 'approve' ? 'primary' : 'danger'}>
              Confirm {actionType === 'approve' ? 'Approval' : 'Refusal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TimeOffDashboard;
