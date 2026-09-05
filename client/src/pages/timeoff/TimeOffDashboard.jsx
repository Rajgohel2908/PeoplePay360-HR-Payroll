import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  X,
  Users,
  Filter,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  Search,
  ChevronDown,
  Building
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
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
  const { user, isEmployeeOnly, hasRole } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('approve'); // 'approve' | 'refuse'
  const [approverComment, setApproverComment] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Filtering & Tab View States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'ledger'
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const term = employeeSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.first_name?.toLowerCase().includes(term) ||
        e.last_name?.toLowerCase().includes(term) ||
        e.employee_id?.toLowerCase().includes(term) ||
        e.department_name?.toLowerCase().includes(term)
    );
  }, [employees, employeeSearch]);

  const getLocalTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalTodayString();

  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type_id: 1,
    start_date: today,
    end_date: today,
    duration_days: 1.0,
    reason: 'Personal time off'
  });

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
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
        setFormData((prev) => ({ ...prev, duration_days: diffDays }));
      }
    }
  }, [formData.start_date, formData.end_date]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    const currentToday = getLocalTodayString();
    if (formData.start_date < currentToday) {
      showError('Start date cannot be in the past. Please select today or a future date.');
      return;
    }

    if (formData.end_date < formData.start_date) {
      showError('End date cannot be earlier than start date.');
      return;
    }

    const payload = {
      ...formData,
      employee_id: isEmployeeOnly ? user.employee_id : (formData.employee_id || user.employee_id)
    };

    // 1. Instantly close modal
    setShowRequestModal(false);

    // 2. Instantly show toast notification
    showSuccess('Leave request submitted successfully for manager approval.');

    // 3. Optimistically create request in UI
    const selectedType = types.find((t) => t.id === Number(formData.leave_type_id)) || {};
    const optimisticId = `temp-${Date.now()}`;
    const optimisticReq = {
      id: optimisticId,
      employee_id: payload.employee_id,
      first_name: user?.first_name || user?.username,
      last_name: user?.last_name || '',
      emp_code: user?.employee_id || 'EMP',
      leave_type_id: payload.leave_type_id,
      leave_type_name: selectedType.name || 'Leave',
      leave_type_code: selectedType.code || 'LV',
      leave_color: selectedType.color || '#10b981',
      start_date: payload.start_date,
      end_date: payload.end_date,
      duration_days: payload.duration_days,
      reason: payload.reason,
      status: 'submitted',
      created_at: new Date().toISOString()
    };

    setRequests((prev) => [optimisticReq, ...prev]);

    // 4. Send API request in background
    try {
      const res = await api.post('/time-off/requests', payload);
      if (res.success && res.data) {
        setRequests((prev) =>
          prev.map((r) => (r.id === optimisticId ? { ...optimisticReq, ...res.data } : r))
        );
        api.get('/time-off/allocations').then((aRes) => {
          if (aRes.success) setAllocations(aRes.data);
        });
      }
    } catch (err) {
      setRequests((prev) => prev.filter((r) => r.id !== optimisticId));
      showError(err.message || 'Failed to submit leave request.');
    }
  };

  const handleDecision = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    const reqId = selectedRequest.id;
    const isApprove = actionType === 'approve';
    const newStatus = isApprove ? 'approved' : 'refused';
    const comment = approverComment;

    // 1. Instantly close modal
    setShowActionModal(false);

    // 2. Instantly show success toast notification
    showSuccess(`Leave request ${newStatus.toUpperCase()} successfully.`);

    // 3. Instantly update table row status in state (Zero lag!)
    setRequests((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? {
              ...r,
              status: newStatus,
              approver_comment: comment || (isApprove ? 'Approved' : 'Refused'),
              approver_name: user?.username || 'You',
              approved_at: isApprove ? new Date().toISOString() : r.approved_at
            }
          : r
      )
    );

    // 4. Optimistically update allocation balance cards
    if (selectedRequest.requires_allocation || selectedRequest.leave_type_id) {
      setAllocations((prev) =>
        prev.map((a) => {
          if (
            Number(a.leave_type_id) === Number(selectedRequest.leave_type_id) &&
            String(a.employee_id) === String(selectedRequest.employee_id)
          ) {
            const duration = parseFloat(selectedRequest.duration_days || 0);
            const pending = Math.max(0, parseFloat(a.pending_days || 0) - duration);
            const used = isApprove ? parseFloat(a.used_days || 0) + duration : parseFloat(a.used_days || 0);
            const remaining = Math.max(0, parseFloat(a.allocated_days || 0) - used);
            return {
              ...a,
              pending_days: pending,
              used_days: used,
              remaining_days: remaining
            };
          }
          return a;
        })
      );
    }

    // 5. Send API call in background
    const endpoint = isApprove
      ? `/time-off/requests/${reqId}/approve`
      : `/time-off/requests/${reqId}/refuse`;

    api.post(endpoint, { approver_comment: comment })
      .then((res) => {
        if (res.success && res.data) {
          setRequests((prev) =>
            prev.map((r) => (r.id === reqId ? { ...r, ...res.data } : r))
          );
        }
        api.get('/time-off/allocations').then((aRes) => {
          if (aRes.success) setAllocations(aRes.data);
        });
      })
      .catch((err) => {
        showError(err.message || 'Failed to update leave status on server.');
        loadData(true);
      });
  };

  // High-level request counts
  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'submitted').length, [requests]);
  const approvedCount = useMemo(() => requests.filter((r) => r.status === 'approved').length, [requests]);
  const refusedCount = useMemo(() => requests.filter((r) => r.status === 'refused').length, [requests]);
  const totalDaysTaken = useMemo(
    () => requests.filter((r) => r.status === 'approved').reduce((acc, r) => acc + parseFloat(r.duration_days || 0), 0),
    [requests]
  );

  // Selected Employee Info (if filtered)
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find((e) => String(e.id) === String(selectedEmployeeId));
  }, [selectedEmployeeId, employees]);

  /**
   * Display Allocations (EXACTLY 4 Cards):
   * 1. For normal employee: their 4 personal cards.
   * 2. For admin with an employee selected: that employee's 4 cards.
   * 3. For admin with company-wide overview (default): exactly 4 cards aggregated by leave type across the company.
   * NEVER renders 156 repetitive cards!
   */
  const displayAllocations = useMemo(() => {
    if (isEmployeeOnly) {
      return allocations;
    }

    if (selectedEmployeeId) {
      return allocations.filter((a) => String(a.employee_id) === String(selectedEmployeeId));
    }

    // Company-wide aggregation grouped by leave type
    const typeMap = {};
    allocations.forEach((a) => {
      const key = a.leave_type_id || a.leave_type_code;
      if (!typeMap[key]) {
        typeMap[key] = {
          id: `agg-${key}`,
          leave_type_name: a.leave_type_name,
          leave_type_code: a.leave_type_code,
          leave_color: a.leave_color || '#10b981',
          allocated_days: 0,
          used_days: 0,
          pending_days: 0,
          remaining_days: 0,
          is_company_aggregate: true,
          employee_count: 0
        };
      }
      typeMap[key].allocated_days += parseFloat(a.allocated_days || 0);
      typeMap[key].used_days += parseFloat(a.used_days || 0);
      typeMap[key].pending_days += parseFloat(a.pending_days || 0);
      typeMap[key].remaining_days += parseFloat(a.remaining_days || 0);
      typeMap[key].employee_count += 1;
    });

    return Object.values(typeMap);
  }, [allocations, isEmployeeOnly, selectedEmployeeId]);

  // Filtered Requests based on status & employee
  const filteredRequests = useMemo(() => {
    let list = requests;
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (selectedEmployeeId) {
      list = list.filter((r) => String(r.employee_id) === String(selectedEmployeeId));
    }
    return list;
  }, [requests, statusFilter, selectedEmployeeId]);

  // Staff Balance Ledger: Summarized per employee in a clean, professional table
  const staffBalanceLedger = useMemo(() => {
    const empMap = {};
    allocations.forEach((a) => {
      const empId = a.employee_id;
      if (!empMap[empId]) {
        empMap[empId] = {
          id: empId,
          employee_id: empId,
          first_name: a.first_name,
          last_name: a.last_name,
          emp_code: a.emp_code,
          avatar_url: a.avatar_url,
          cl_remaining: 0,
          cl_allocated: 0,
          cl_used: 0,
          sl_remaining: 0,
          sl_allocated: 0,
          sl_used: 0,
          pl_remaining: 0,
          pl_allocated: 0,
          pl_used: 0,
          lop_used: 0,
          total_used: 0
        };
      }
      const code = (a.leave_type_code || '').toUpperCase();
      const rem = parseFloat(a.remaining_days || 0);
      const alloc = parseFloat(a.allocated_days || 0);
      const used = parseFloat(a.used_days || 0);

      if (code === 'CL') {
        empMap[empId].cl_remaining = rem;
        empMap[empId].cl_allocated = alloc;
        empMap[empId].cl_used = used;
      } else if (code === 'SL') {
        empMap[empId].sl_remaining = rem;
        empMap[empId].sl_allocated = alloc;
        empMap[empId].sl_used = used;
      } else if (code === 'PL') {
        empMap[empId].pl_remaining = rem;
        empMap[empId].pl_allocated = alloc;
        empMap[empId].pl_used = used;
      } else if (code === 'LOP') {
        empMap[empId].lop_used = used;
      }
      empMap[empId].total_used += used;
    });

    return Object.values(empMap);
  }, [allocations]);

  // Columns for Requests Table
  const requestColumns = [
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
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.leave_color || '#10b981' }} />
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
          <p className="text-[11px] text-slate-500 font-medium">{formatDate(row.start_date)} &rarr; {formatDate(row.end_date)}</p>
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

  // Columns for Staff Balance Ledger
  const ledgerColumns = [
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
            <p className="text-[10px] text-slate-400 font-mono">{row.emp_code}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Casual Leave (CL)',
      accessor: 'cl_remaining',
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs">{row.cl_remaining}d</span>
          <span className="text-[11px] text-slate-400"> / {row.cl_allocated}d</span>
          <p className="text-[10px] text-slate-500">Used: {row.cl_used}d</p>
        </div>
      )
    },
    {
      header: 'Sick Leave (SL)',
      accessor: 'sl_remaining',
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs">{row.sl_remaining}d</span>
          <span className="text-[11px] text-slate-400"> / {row.sl_allocated}d</span>
          <p className="text-[10px] text-slate-500">Used: {row.sl_used}d</p>
        </div>
      )
    },
    {
      header: 'Paid Leave (PL)',
      accessor: 'pl_remaining',
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs">{row.pl_remaining}d</span>
          <span className="text-[11px] text-slate-400"> / {row.pl_allocated}d</span>
          <p className="text-[10px] text-slate-500">Used: {row.pl_used}d</p>
        </div>
      )
    },
    {
      header: 'Loss of Pay (LOP)',
      accessor: 'lop_used',
      cell: (row) => (
        <div>
          <span className={`font-bold text-xs ${row.lop_used > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
            {row.lop_used}d
          </span>
          <p className="text-[10px] text-slate-400">Unpaid Days</p>
        </div>
      )
    },
    {
      header: 'Total Used',
      accessor: 'total_used',
      cell: (row) => (
        <Badge variant={row.total_used > 5 ? 'warning' : 'neutral'} size="sm">
          {row.total_used} Days
        </Badge>
      )
    },
    {
      header: 'Action',
      align: 'right',
      cell: (row) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            setSelectedEmployeeId(String(row.employee_id));
            setActiveTab('requests');
          }}
        >
          View Balances
        </Button>
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

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              const currentToday = getLocalTodayString();
              setFormData((prev) => ({
                ...prev,
                start_date: !prev.start_date || prev.start_date < currentToday ? currentToday : prev.start_date,
                end_date: !prev.end_date || prev.end_date < currentToday ? currentToday : prev.end_date
              }));
              setShowRequestModal(true);
            }}
          >
            Request Time Off
          </Button>
        </div>
      </div>

      {/* Admin Executive Summary Row (Only for Managers & Admins) */}
      {!isEmployeeOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leave Categories</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{types.length} Active Types</p>
              <p className="text-[11px] text-slate-500 mt-0.5">CL, SL, PL, LOP configured</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Palmtree className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('submitted')}
            className={`bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition-all hover:border-amber-400 ${
              statusFilter === 'submitted' ? 'ring-2 ring-amber-500 bg-amber-50/20' : ''
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xl font-bold text-slate-900">{pendingCount}</p>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 animate-pulse">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Click to filter submitted</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('approved')}
            className={`bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition-all hover:border-emerald-400 ${
              statusFilter === 'approved' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved Requests</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{approvedCount} Leaves</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Verified & calculated</p>
            </div>
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Days Taken</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{totalDaysTaken} Days</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Company-wide YTD</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar for Balances */}
      {!isEmployeeOnly && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">Display Leave Balances For:</span>
          </div>

          <div className="relative w-full sm:w-80" ref={dropdownRef}>
            {/* Search Input Box */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder={selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name} (${selectedEmployee.employee_id})` : 'Search employee or all staff...'}
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg pl-8 pr-16 py-2 text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {selectedEmployeeId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmployeeId('');
                      setEmployeeSearch('');
                      setIsDropdownOpen(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                    title="Clear filter & view all staff"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dropdown Popover */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto py-1 divide-y divide-slate-100">
                {/* Company-Wide Option (No Emoji) */}
                <div
                  onClick={() => {
                    setSelectedEmployeeId('');
                    setEmployeeSearch('');
                    setIsDropdownOpen(false);
                  }}
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                    !selectedEmployeeId ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Building className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Company-Wide Overview</p>
                      <p className="text-[10px] text-slate-500">All staff aggregated balances</p>
                    </div>
                  </div>
                  {!selectedEmployeeId && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </div>

                {/* Filtered Employee List */}
                <div className="py-1">
                  {filteredEmployees.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-500">
                      No employees found matching "{employeeSearch}"
                    </div>
                  ) : (
                    filteredEmployees.map((e) => {
                      const isSelected = String(selectedEmployeeId) === String(e.id);
                      return (
                        <div
                          key={e.id}
                          onClick={() => {
                            setSelectedEmployeeId(e.id);
                            setEmployeeSearch('');
                            setIsDropdownOpen(false);
                          }}
                          className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={e.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${e.first_name}`}
                              alt={e.first_name}
                              className="w-7 h-7 rounded-full bg-slate-100 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">
                                {e.first_name} {e.last_name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {e.employee_id} {e.department_name ? `• ${e.department_name}` : ''}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Allocation Ledger Cards (EXACTLY 4 Clean Cards: CL, SL, PL, LOP) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>
              {selectedEmployee
                ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}'s Leave Balances`
                : isEmployeeOnly
                ? 'My Annual Leave Balances'
                : 'Company-Wide Leave Balances (Aggregated by Category)'}
            </span>
            {selectedEmployee && (
              <Badge variant="neutral" size="sm">
                {selectedEmployee.employee_id}
              </Badge>
            )}
          </h2>
          <span className="text-xs text-slate-500">
            {displayAllocations.length} Active Categories
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayAllocations.map((alloc) => (
            <div key={alloc.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{alloc.leave_type_name}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${alloc.leave_color}20`, color: alloc.leave_color }}
                >
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
                    width: `${Math.min(
                      100,
                      (parseFloat(alloc.remaining_days) / parseFloat(alloc.allocated_days || 1)) * 100
                    )}%`,
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
      </div>

      {/* Main Content Area: Tabs between Requests & Staff Balance Ledger */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'requests'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              Time Off Requests ({filteredRequests.length})
            </button>

            {!isEmployeeOnly && (
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'ledger'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Staff Balance Ledger ({staffBalanceLedger.length} Employees)
              </button>
            )}
          </div>

          {activeTab === 'requests' && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'All', count: requests.length },
                { id: 'submitted', label: 'Pending', count: pendingCount },
                { id: 'approved', label: 'Approved', count: approvedCount },
                { id: 'refused', label: 'Refused', count: refusedCount }
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    statusFilter === pill.id
                      ? 'bg-emerald-100 text-emerald-900 font-bold'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View 1: Requests Table */}
        {activeTab === 'requests' && (
          <DataTable
            columns={requestColumns}
            data={filteredRequests}
            loading={loading}
            searchPlaceholder="Search requests by employee or reason..."
          />
        )}

        {/* View 2: Staff Balance Ledger Table */}
        {activeTab === 'ledger' && !isEmployeeOnly && (
          <DataTable
            columns={ledgerColumns}
            data={staffBalanceLedger}
            loading={loading}
            searchPlaceholder="Search employee balances by name or code..."
          />
        )}
      </div>

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
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} ({e.employee_id})
                </option>
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
              min={getLocalTodayString()}
              value={formData.start_date}
              onChange={(e) => {
                const newStart = e.target.value;
                const currentToday = getLocalTodayString();
                if (newStart < currentToday) {
                  showError('Start date cannot be in the past.');
                  return;
                }
                setFormData((prev) => ({
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
              min={formData.start_date || getLocalTodayString()}
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
            <Button
              type="submit"
              variant="primary"
              loading={submittingRequest}
              disabled={submittingRequest}
            >
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
            <Button
              type="submit"
              variant={actionType === 'approve' ? 'primary' : 'danger'}
              loading={submittingDecision}
              disabled={submittingDecision}
            >
              Confirm {actionType === 'approve' ? 'Approval' : 'Refusal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TimeOffDashboard;
