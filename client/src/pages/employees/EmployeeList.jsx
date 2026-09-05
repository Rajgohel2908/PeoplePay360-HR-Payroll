// client/src/pages/employees/EmployeeList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  LayoutGrid,
  List,
  Search,
  Building,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Check,
  Key,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw
} from 'lucide-react';
import api from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [createdNotification, setCreatedNotification] = useState(null);

  const { showSuccess, showError } = useNotifications();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  // New Employee Form State (6 Sections)
  const [activeFormTab, setActiveFormTab] = useState('personal');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const getInitialFormData = () => ({
    employee_id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    department_id: '',
    job_position_id: '',
    employee_type: 'Full-time',
    employment_status: 'Active',
    joining_date: new Date().toISOString().split('T')[0],
    schedule_id: 1,
    wage: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    pan_number: '',
    emergency_name: '',
    emergency_phone: '',
    emergency_relation: '',
    notes: ''
  });

  const [formData, setFormData] = useState(getInitialFormData());

  const updateFormField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (formErrors[key]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const handleQuickFillSample = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    setFormData({
      employee_id: `EMP-${randomId}`,
      first_name: 'Aarav',
      last_name: 'Patel',
      email: `aarav.patel${randomId}@peoplepay360.com`,
      phone: '9876543210',
      date_of_birth: '1995-05-15',
      gender: 'Male',
      address: '100 Outer Ring Road, Tech Park',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560103',
      department_id: departments[0]?.id || 1,
      job_position_id: jobPositions[0]?.id || 3,
      employee_type: 'Full-time',
      employment_status: 'Active',
      joining_date: new Date().toISOString().split('T')[0],
      schedule_id: schedules[0]?.id || 1,
      wage: 85000,
      bank_name: 'HDFC Bank',
      account_number: '50100' + Math.floor(100000000 + Math.random() * 900000000),
      ifsc_code: 'HDFC0000128',
      pan_number: 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F',
      emergency_name: 'Suresh Kumar',
      emergency_phone: '9876543210',
      emergency_relation: 'Spouse',
      notes: 'Key hire for Q3 expansion'
    });
    setFormErrors({});
  };

  const validateTab = (tabId, currentData = formData) => {
    const errs = {};

    // 1. Personal Info Validation
    if (tabId === 'personal' || tabId === 'all') {
      if (!currentData.employee_id?.trim()) {
        errs.employee_id = 'Employee ID is required (e.g. EMP-1001)';
      } else if (!/^[A-Za-z0-9_-]{3,20}$/.test(currentData.employee_id.trim())) {
        errs.employee_id = 'Employee ID must be 3-20 letters, numbers, or hyphens';
      }

      if (!currentData.first_name?.trim()) {
        errs.first_name = 'First name is required';
      } else if (currentData.first_name.trim().length < 2) {
        errs.first_name = 'First name must be at least 2 characters';
      } else if (!/^[A-Za-z\s.'-]+$/.test(currentData.first_name.trim())) {
        errs.first_name = 'First name must contain only letters';
      }

      if (!currentData.last_name?.trim()) {
        errs.last_name = 'Last name is required';
      } else if (!/^[A-Za-z\s.'-]+$/.test(currentData.last_name.trim())) {
        errs.last_name = 'Last name must contain only letters';
      }

      if (!currentData.gender) {
        errs.gender = 'Please select gender';
      }

      if (!currentData.date_of_birth) {
        errs.date_of_birth = 'Date of birth is required';
      } else {
        const dob = new Date(currentData.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (isNaN(dob.getTime()) || dob >= today) {
          errs.date_of_birth = 'Date of birth must be a past date';
        } else if (age < 18) {
          errs.date_of_birth = 'Employee must be at least 18 years old';
        }
      }

      if (!currentData.joining_date) {
        errs.joining_date = 'Joining date is required';
      }
    }

    // 2. Employment & Role Validation
    if (tabId === 'employment' || tabId === 'all') {
      if (!currentData.department_id) {
        errs.department_id = 'Please select a department';
      }
      if (!currentData.job_position_id) {
        errs.job_position_id = 'Please select a job designation';
      }
      if (!currentData.employment_status) {
        errs.employment_status = 'Please select employment status';
      }
      if (!currentData.employee_type) {
        errs.employee_type = 'Please select employee type';
      }
      if (
        currentData.wage === '' ||
        currentData.wage === null ||
        isNaN(currentData.wage) ||
        Number(currentData.wage) <= 0
      ) {
        errs.wage = 'Monthly base wage must be greater than 0';
      }
      if (!currentData.schedule_id) {
        errs.schedule_id = 'Please select a working schedule';
      }
    }

    // 3. Contact Details Validation
    if (tabId === 'contact' || tabId === 'all') {
      if (!currentData.email?.trim()) {
        errs.email = 'Corporate email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentData.email.trim())) {
        errs.email = 'Please enter a valid email address (e.g. name@company.com)';
      }

      const cleanPhone = (currentData.phone || '').replace(/[\s+-]/g, '');
      if (!currentData.phone?.trim()) {
        errs.phone = 'Contact phone number is required';
      } else if (cleanPhone.length < 10 || cleanPhone.length > 13 || !/^\d+$/.test(cleanPhone)) {
        errs.phone = 'Please enter a valid 10-digit phone number';
      }

      if (!currentData.address?.trim()) {
        errs.address = 'Residential street address is required';
      } else if (currentData.address.trim().length < 5) {
        errs.address = 'Street address must be at least 5 characters';
      }

      if (!currentData.city?.trim()) {
        errs.city = 'City name is required';
      }

      if (!currentData.state?.trim()) {
        errs.state = 'State / province is required';
      }

      if (!currentData.postal_code?.trim()) {
        errs.postal_code = 'Postal PIN code is required';
      } else if (!/^\d{5,6}$/.test(currentData.postal_code.trim())) {
        errs.postal_code = 'PIN code must be 5 or 6 digits (e.g. 560103)';
      }
    }

    // 4. Bank & Statutory Validation
    if (tabId === 'bank' || tabId === 'all') {
      if (!currentData.bank_name?.trim()) {
        errs.bank_name = 'Bank name is required (e.g. HDFC Bank)';
      }

      const cleanAcc = (currentData.account_number || '').trim();
      if (!cleanAcc) {
        errs.account_number = 'Bank account number is required';
      } else if (!/^\d{9,18}$/.test(cleanAcc)) {
        errs.account_number = 'Bank account number must be 9-18 digits';
      }

      const cleanIfsc = (currentData.ifsc_code || '').trim().toUpperCase();
      if (!cleanIfsc) {
        errs.ifsc_code = 'Bank IFSC code is required';
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        errs.ifsc_code = 'Valid 11-character IFSC code is required (e.g. HDFC0000128)';
      }

      const cleanPan = (currentData.pan_number || '').trim().toUpperCase();
      if (!cleanPan) {
        errs.pan_number = 'PAN card number is required';
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        errs.pan_number = 'Valid 10-character PAN is required (e.g. ABCDE1234F)';
      }
    }

    // 5. Emergency Contact Validation
    if (tabId === 'emergency' || tabId === 'all') {
      if (!currentData.emergency_name?.trim()) {
        errs.emergency_name = 'Emergency contact person name is required';
      } else if (currentData.emergency_name.trim().length < 2) {
        errs.emergency_name = 'Contact name must be at least 2 characters';
      }

      const cleanEmPhone = (currentData.emergency_phone || '').replace(/[\s+-]/g, '');
      if (!currentData.emergency_phone?.trim()) {
        errs.emergency_phone = 'Emergency contact phone number is required';
      } else if (cleanEmPhone.length < 10 || cleanEmPhone.length > 13 || !/^\d+$/.test(cleanEmPhone)) {
        errs.emergency_phone = 'Please enter a valid 10-digit phone number';
      }

      if (!currentData.emergency_relation?.trim()) {
        errs.emergency_relation = 'Relationship is required (e.g. Spouse, Parent)';
      }
    }

    return errs;
  };

  const getTabErrorCount = (tabId) => {
    const tabKeys = {
      personal: ['employee_id', 'first_name', 'last_name', 'gender', 'date_of_birth', 'joining_date'],
      employment: ['department_id', 'job_position_id', 'employment_status', 'employee_type', 'wage', 'schedule_id'],
      contact: ['email', 'phone', 'address', 'city', 'state', 'postal_code'],
      bank: ['bank_name', 'account_number', 'ifsc_code', 'pan_number'],
      emergency: ['emergency_name', 'emergency_phone', 'emergency_relation'],
      notes: []
    };
    const keys = tabKeys[tabId] || [];
    return keys.filter(k => !!formErrors[k]).length;
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      let url = `/employees?page=${pagination.page}&limit=${pagination.limit}&search=${encodeURIComponent(search)}`;
      if (deptFilter) url += `&department_id=${deptFilter}`;
      if (statusFilter) url += `&employment_status=${statusFilter}`;

      const res = await api.get(url);
      if (res.success) {
        setEmployees(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error(err);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [pagination.page, deptFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEmployees();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load auxiliary data for creation modal
  useEffect(() => {
    async function loadAux() {
      try {
        const [deptRes, schedRes] = await Promise.all([
          api.get('/employees/departments'),
          api.get('/schedules')
        ]);
        if (deptRes?.success) {
          if (deptRes.data) setDepartments(deptRes.data);
          if (deptRes.job_positions) setJobPositions(deptRes.job_positions);
        }
        if (schedRes?.success && schedRes.data) setSchedules(schedRes.data);
      } catch (err) {
        console.error('Error loading auxiliary data:', err);
      }
    }
    loadAux();
  }, []);

  const handleNextStep = () => {
    const errs = validateTab(activeFormTab);
    if (Object.keys(errs).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errs }));
      showError('Please correct the highlighted fields in this step before proceeding.');
      return;
    }

    const idx = formTabs.findIndex(t => t.id === activeFormTab);
    if (idx < formTabs.length - 1) {
      setActiveFormTab(formTabs[idx + 1].id);
    }
  };

  const handlePrevStep = () => {
    const idx = formTabs.findIndex(t => t.id === activeFormTab);
    if (idx > 0) {
      setActiveFormTab(formTabs[idx - 1].id);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    const allErrors = validateTab('all');
    if (Object.keys(allErrors).length > 0) {
      setFormErrors(allErrors);
      // Switch to the first tab that has an error
      const tabOrder = ['personal', 'employment', 'contact', 'bank', 'emergency'];
      const tabKeys = {
        personal: ['employee_id', 'first_name', 'last_name', 'gender', 'date_of_birth', 'joining_date'],
        employment: ['department_id', 'job_position_id', 'employment_status', 'employee_type', 'wage', 'schedule_id'],
        contact: ['email', 'phone', 'address', 'city', 'state', 'postal_code'],
        bank: ['bank_name', 'account_number', 'ifsc_code', 'pan_number'],
        emergency: ['emergency_name', 'emergency_phone', 'emergency_relation']
      };
      const firstInvalidTab = tabOrder.find(t => tabKeys[t].some(k => !!allErrors[k]));
      if (firstInvalidTab) {
        setActiveFormTab(firstInvalidTab);
      }
      showError('Please fill all required details with valid values before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/employees', formData);
      if (res.success) {
        showSuccess(`Employee ${formData.first_name} ${formData.last_name} created successfully!`);
        setShowCreateModal(false);
        setFormData(getInitialFormData());
        setFormErrors({});
        setCreatedNotification({
          name: `${formData.first_name} ${formData.last_name}`,
          email: formData.email,
          email_sent: res.account_provisioned?.email_sent ?? true
        });
        loadEmployees();
      }
    } catch (err) {
      showError(err.message || 'Failed to create employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success" dot>Active</Badge>;
      case 'Probation':
        return <Badge variant="warning" dot>Probation</Badge>;
      case 'Notice':
        return <Badge variant="purple" dot>Notice Period</Badge>;
      case 'Terminated':
      case 'Resigned':
        return <Badge variant="danger" dot>{status}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Employee',
      accessor: 'first_name',
      cell: (row) => (
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate(`/employees/360/${row.id}`)}
        >
          <img
            src={row.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.first_name}_${row.last_name}`}
            alt={row.first_name}
            className="w-9 h-9 rounded-full bg-slate-100 object-cover border border-slate-200"
          />
          <div>
            <p className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              {row.first_name} {row.last_name}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">{row.employee_id} • {row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Department & Role',
      accessor: 'department_name',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.position_title || 'N/A'}</p>
          <span
            className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5"
            style={{
              backgroundColor: `${row.department_color || '#3b82f6'}15`,
              color: row.department_color || '#3b82f6'
            }}
          >
            {row.department_name || 'General'}
          </span>
        </div>
      )
    },
    {
      header: 'Type & Status',
      accessor: 'employment_status',
      cell: (row) => (
        <div className="space-y-1">
          <div>{getStatusBadge(row.employment_status)}</div>
          <span className="text-[10px] text-slate-500 font-medium block">{row.employee_type}</span>
        </div>
      )
    },
    {
      header: 'Bank & Tax Info',
      accessor: 'bank_name',
      cell: (row) => {
        const isBankMissing = !row.bank_name || !row.account_number;
        return isBankMissing ? (
          <Badge variant="danger" size="sm" icon={AlertCircle}>
            Missing Bank Data
          </Badge>
        ) : (
          <div>
            <p className="font-semibold text-slate-800 text-[11px]">{row.bank_name}</p>
            <p className="text-[10px] text-slate-500 font-mono">••••{row.account_number.slice(-4)} | {row.pan_number || 'No PAN'}</p>
          </div>
        );
      }
    },
    {
      header: 'Joining Date',
      accessor: 'joining_date',
      cell: (row) => <span className="font-medium text-slate-600">{formatDate(row.joining_date)}</span>
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate(`/employees/360/${row.id}`)}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            title="View Employee Details"
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> View
          </Button>
        </div>
      )
    }
  ];

  const formTabs = [
    { id: 'personal', label: '1. Personal Info', badge: getTabErrorCount('personal') ? `${getTabErrorCount('personal')}` : undefined },
    { id: 'employment', label: '2. Employment & Role', badge: getTabErrorCount('employment') ? `${getTabErrorCount('employment')}` : undefined },
    { id: 'contact', label: '3. Contact Details', badge: getTabErrorCount('contact') ? `${getTabErrorCount('contact')}` : undefined },
    { id: 'bank', label: '4. Bank & Statutory', badge: getTabErrorCount('bank') ? `${getTabErrorCount('bank')}` : undefined },
    { id: 'emergency', label: '5. Emergency Contact', badge: getTabErrorCount('emergency') ? `${getTabErrorCount('emergency')}` : undefined },
    { id: 'notes', label: '6. Review & Summary' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Employee Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage complete employee lifecycles, contracts, attendance, and 360 profiles
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {user?.role !== 'employee' && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setFormErrors({});
                setActiveFormTab('personal');
                setShowCreateModal(true);
              }}
            >
              New Employee
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Departments</option>
          <option value="1">Engineering & Technology</option>
          <option value="2">Human Resources</option>
          <option value="3">Finance & Accounting</option>
          <option value="4">Product & Design</option>
          <option value="5">Sales & Marketing</option>
          <option value="6">Operations</option>
          <option value="7">Customer Success</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Probation">Probation</option>
          <option value="Notice">Notice Period</option>
          <option value="Terminated">Terminated</option>
        </select>

        {(search || deptFilter || statusFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setDeptFilter('');
              setStatusFilter('');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium shadow-xs transition-colors hover:bg-slate-50"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* View Mode: Table vs Kanban */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={employees}
          loading={loading}
          searchPlaceholder="Search employees by name, ID, or email..."
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        />
      ) : (
        /* Kanban Board View with Search and Pagination */
        <div className="space-y-5">
          {/* Kanban Top Search and Results Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="Search employees by name, ID, or email in Kanban..."
                className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 justify-between sm:justify-end">
              <span>
                Total: <strong className="text-slate-800 font-semibold">{pagination.total}</strong> employees
              </span>
              {(search || deptFilter || statusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setDeptFilter('');
                    setStatusFilter('');
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline ml-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* Kanban Columns or Empty State */}
          {!loading && employees.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-8">
              <EmptyState
                icon={Users}
                title="No employees found"
                description={
                  search
                    ? `No employees match "${search}". Try adjusting your search query or clearing filters.`
                    : 'No employees found matching the selected filter criteria.'
                }
                action={
                  (search || deptFilter || statusFilter) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearch('');
                        setDeptFilter('');
                        setStatusFilter('');
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                    >
                      Clear Filters
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <div
              className={`grid gap-6 ${
                statusFilter
                  ? 'grid-cols-1 max-w-xl mx-auto'
                  : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
              }`}
            >
              {(statusFilter ? [statusFilter] : ['Active', 'Probation', 'Notice', 'Terminated']).map((statusKey) => {
                const groupEmployees = employees.filter((e) => e.employment_status === statusKey);

                return (
                  <div key={statusKey} className="bg-slate-100/70 p-4 rounded-xl border border-slate-200 flex flex-col min-h-[240px]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {statusKey} ({loading ? '...' : groupEmployees.length})
                      </h3>
                      {getStatusBadge(statusKey)}
                    </div>

                    <div className="space-y-3 flex-1">
                      {loading ? (
                        Array.from({ length: 2 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs animate-pulse space-y-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                              <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                                <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                              </div>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex justify-between">
                              <div className="h-2.5 bg-slate-200 rounded w-1/3" />
                              <div className="h-2.5 bg-slate-200 rounded w-1/4" />
                            </div>
                          </div>
                        ))
                      ) : groupEmployees.length === 0 ? (
                        <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-200/90 rounded-xl bg-white/40 text-center px-2">
                          <p className="text-xs text-slate-400 font-medium">No {statusKey.toLowerCase()} employees</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">on this page</p>
                        </div>
                      ) : (
                        groupEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            onClick={() => navigate(`/employees/360/${emp.id}`)}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md cursor-pointer transition-all duration-150 hover:border-emerald-400 hover:-translate-y-0.5 group"
                          >
                            <div className="flex items-start gap-3">
                              <img
                                src={emp.avatar_url}
                                alt={emp.first_name}
                                className="w-10 h-10 rounded-full bg-slate-100 object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 truncate">
                                  {emp.first_name} {emp.last_name}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium truncate">{emp.position_title || 'Employee'}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.employee_id} • {emp.department_name || 'General'}</p>
                              </div>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                              <span>Joined: {formatDate(emp.joining_date)}</span>
                              <span className="font-semibold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                View <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Kanban Pagination Bar */}
          {pagination && pagination.total > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-800">{Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}</span> to <span className="font-semibold text-slate-800">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-semibold text-slate-800">{pagination.total}</span> employees
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-semibold text-slate-800 shadow-xs">
                  {pagination.page} / {pagination.totalPages || 1}
                </span>

                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.page + 1, pagination.totalPages || 1) }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6-Tab Create Employee Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Onboard New Employee"
        subtitle="Create an employee profile, assign initial contract & generate leave allocations"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Tabs
                tabs={formTabs}
                activeTab={activeFormTab}
                onChange={(tabId) => {
                  setActiveFormTab(tabId);
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleQuickFillSample}
              className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ml-3"
              title="Fill sample demo data for quick testing"
            >
              Demo Auto-Fill
            </button>
          </div>

          <form onSubmit={handleCreateEmployee} className="pt-2">
            {activeFormTab === 'personal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Employee ID"
                  required
                  value={formData.employee_id}
                  onChange={(e) => updateFormField('employee_id', e.target.value.toUpperCase())}
                  error={formErrors.employee_id}
                  placeholder="e.g. EMP-1045"
                  helperText="Unique organizational code"
                />
                <Select
                  label="Gender"
                  required
                  value={formData.gender}
                  onChange={(e) => updateFormField('gender', e.target.value)}
                  error={formErrors.gender}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' }
                  ]}
                />
                <Input
                  label="First Name"
                  required
                  value={formData.first_name}
                  onChange={(e) => updateFormField('first_name', e.target.value)}
                  error={formErrors.first_name}
                  placeholder="e.g. Rahul"
                />
                <Input
                  label="Last Name"
                  required
                  value={formData.last_name}
                  onChange={(e) => updateFormField('last_name', e.target.value)}
                  error={formErrors.last_name}
                  placeholder="e.g. Sharma"
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  required
                  value={formData.date_of_birth}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  onChange={(e) => updateFormField('date_of_birth', e.target.value)}
                  error={formErrors.date_of_birth}
                  helperText="Must be at least 18 years old"
                />
                <Input
                  label="Joining Date"
                  type="date"
                  required
                  value={formData.joining_date}
                  onChange={(e) => updateFormField('joining_date', e.target.value)}
                  error={formErrors.joining_date}
                  helperText="First official employment day"
                />
              </div>
            )}

            {activeFormTab === 'employment' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Department"
                  required
                  value={formData.department_id}
                  onChange={(e) => updateFormField('department_id', e.target.value)}
                  error={formErrors.department_id}
                  options={[
                    { value: '', label: 'Select Department...' },
                    ...(departments.length > 0
                      ? departments.map((d) => ({ value: d.id, label: d.name }))
                      : [
                          { value: 1, label: 'Engineering & Technology' },
                          { value: 2, label: 'Human Resources' },
                          { value: 3, label: 'Finance & Accounting' },
                          { value: 4, label: 'Product & Design' },
                          { value: 5, label: 'Sales & Marketing' },
                          { value: 6, label: 'Operations' },
                          { value: 7, label: 'Customer Success' }
                        ])
                  ]}
                />
                <Select
                  label="Job Designation"
                  required
                  value={formData.job_position_id}
                  onChange={(e) => updateFormField('job_position_id', e.target.value)}
                  error={formErrors.job_position_id}
                  options={[
                    { value: '', label: 'Select Designation...' },
                    ...(jobPositions.length > 0
                      ? jobPositions.map((j) => ({ value: j.id, label: j.title }))
                      : [
                          { value: 3, label: 'Senior Full Stack Engineer' },
                          { value: 4, label: 'Frontend Specialist' },
                          { value: 5, label: 'Backend Engineer' },
                          { value: 8, label: 'HR Operations Manager' },
                          { value: 11, label: 'Payroll Lead' },
                          { value: 13, label: 'Product Manager' }
                        ])
                  ]}
                />
                <Select
                  label="Employment Status"
                  required
                  value={formData.employment_status}
                  onChange={(e) => updateFormField('employment_status', e.target.value)}
                  error={formErrors.employment_status}
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Probation', label: 'Probation' },
                    { value: 'Notice', label: 'Notice Period' }
                  ]}
                />
                <Select
                  label="Employee Type"
                  required
                  value={formData.employee_type}
                  onChange={(e) => updateFormField('employee_type', e.target.value)}
                  error={formErrors.employee_type}
                  options={[
                    { value: 'Full-time', label: 'Full-time' },
                    { value: 'Part-time', label: 'Part-time' },
                    { value: 'Contract', label: 'Contract' },
                    { value: 'Intern', label: 'Intern' }
                  ]}
                />
                <Input
                  label="Monthly Base Wage (₹)"
                  type="number"
                  required
                  value={formData.wage}
                  onChange={(e) => updateFormField('wage', e.target.value)}
                  error={formErrors.wage}
                  placeholder="e.g. 85000"
                  helperText="Initial contract wage for salary rule computation"
                />
                <Select
                  label="Working Schedule"
                  required
                  value={formData.schedule_id}
                  onChange={(e) => updateFormField('schedule_id', e.target.value)}
                  error={formErrors.schedule_id}
                  options={[
                    ...(schedules.length > 0
                      ? schedules.map((s) => ({ value: s.id, label: s.name }))
                      : [
                          { value: 1, label: 'Standard General Shift (40h/week)' },
                          { value: 2, label: 'Flexible Tech Shift (40h/week)' }
                        ])
                  ]}
                />
              </div>
            )}

            {activeFormTab === 'contact' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Corporate Email Address"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateFormField('email', e.target.value)}
                  error={formErrors.email}
                  placeholder="e.g. rahul.sharma@peoplepay360.com"
                  helperText="ESS login credentials will be emailed here"
                />
                <Input
                  label="Contact Phone Number"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => updateFormField('phone', e.target.value)}
                  error={formErrors.phone}
                  placeholder="e.g. 9876543210"
                  helperText="10-digit mobile number"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Residential Street Address"
                    required
                    value={formData.address}
                    onChange={(e) => updateFormField('address', e.target.value)}
                    error={formErrors.address}
                    placeholder="e.g. Flat 402, Green Glen Layout, Bellandur"
                  />
                </div>
                <Input
                  label="City"
                  required
                  value={formData.city}
                  onChange={(e) => updateFormField('city', e.target.value)}
                  error={formErrors.city}
                  placeholder="e.g. Bengaluru"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="State"
                    required
                    value={formData.state}
                    onChange={(e) => updateFormField('state', e.target.value)}
                    error={formErrors.state}
                    placeholder="e.g. Karnataka"
                  />
                  <Input
                    label="Postal PIN Code"
                    required
                    value={formData.postal_code}
                    onChange={(e) => updateFormField('postal_code', e.target.value)}
                    error={formErrors.postal_code}
                    placeholder="e.g. 560103"
                  />
                </div>
              </div>
            )}

            {activeFormTab === 'bank' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  required
                  value={formData.bank_name}
                  onChange={(e) => updateFormField('bank_name', e.target.value)}
                  error={formErrors.bank_name}
                  placeholder="e.g. HDFC Bank"
                />
                <Input
                  label="Bank Account Number"
                  required
                  value={formData.account_number}
                  onChange={(e) => updateFormField('account_number', e.target.value)}
                  error={formErrors.account_number}
                  placeholder="e.g. 5010023456789"
                  helperText="9 to 18 digits"
                />
                <Input
                  label="Bank IFSC Code"
                  required
                  value={formData.ifsc_code}
                  onChange={(e) => updateFormField('ifsc_code', e.target.value.toUpperCase())}
                  error={formErrors.ifsc_code}
                  placeholder="e.g. HDFC0000128"
                  helperText="11 characters (e.g. HDFC0000128)"
                />
                <Input
                  label="PAN Card Number"
                  required
                  value={formData.pan_number}
                  onChange={(e) => updateFormField('pan_number', e.target.value.toUpperCase())}
                  error={formErrors.pan_number}
                  placeholder="e.g. ABCDE1234F"
                  helperText="10-character alphanumeric PAN"
                />
              </div>
            )}

            {activeFormTab === 'emergency' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Emergency Contact Name"
                  required
                  value={formData.emergency_name}
                  onChange={(e) => updateFormField('emergency_name', e.target.value)}
                  error={formErrors.emergency_name}
                  placeholder="e.g. Sunita Sharma"
                />
                <Input
                  label="Emergency Contact Phone"
                  type="tel"
                  required
                  value={formData.emergency_phone}
                  onChange={(e) => updateFormField('emergency_phone', e.target.value)}
                  error={formErrors.emergency_phone}
                  placeholder="e.g. 9876543210"
                />
                <Input
                  label="Relationship"
                  required
                  value={formData.emergency_relation}
                  onChange={(e) => updateFormField('emergency_relation', e.target.value)}
                  error={formErrors.emergency_relation}
                  placeholder="e.g. Spouse / Parent / Sibling"
                />
              </div>
            )}

            {activeFormTab === 'notes' && (
              <div className="space-y-4">
                {/* Comprehensive Pre-submission Summary */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Summary Verification
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Ready to Provision
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">Name:</span>{' '}
                      <strong className="text-slate-800 font-semibold">{formData.first_name || '—'} {formData.last_name || '—'}</strong> ({formData.employee_id})
                    </div>
                    <div>
                      <span className="text-slate-400">Designation:</span>{' '}
                      <strong className="text-slate-800 font-semibold">
                        {jobPositions.find(j => String(j.id) === String(formData.job_position_id))?.title || 'Selected'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Monthly Wage:</span>{' '}
                      <strong className="text-emerald-700 font-bold">₹{Number(formData.wage || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Corporate Email:</span>{' '}
                      <strong className="text-slate-800 font-semibold">{formData.email || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Bank Account:</span>{' '}
                      <strong className="text-slate-800 font-semibold">{formData.bank_name || '—'} ({formData.account_number || '—'})</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Emergency:</span>{' '}
                      <strong className="text-slate-800 font-semibold">{formData.emergency_name || '—'} ({formData.emergency_relation || '—'})</strong>
                    </div>
                  </div>
                </div>

                <Input
                  label="HR Onboarding Notes (Optional)"
                  value={formData.notes}
                  onChange={(e) => updateFormField('notes', e.target.value)}
                  placeholder="e.g. Key technical hire for Q3 expansion"
                />

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
                  <p className="font-bold">Automated Onboarding Sequence:</p>
                  <p>&bull; An Active Contract #{`CNT-${formData.employee_id || 'NEW'}`} with ₹{Number(formData.wage || 0).toLocaleString('en-IN')} monthly wage will be initialized.</p>
                  <p>&bull; 2026 Annual Leave Allocations (Casual, Sick, Privilege) will be provisioned automatically.</p>
                  <p>&bull; An Employee ESS login account will be generated with a secure random temporary password and emailed to {formData.email || 'the employee'}.</p>
                </div>
              </div>
            )}

            {/* Modal Controls */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Step {formTabs.findIndex(t => t.id === activeFormTab) + 1} of 6
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>

                {activeFormTab !== 'personal' && (
                  <Button type="button" variant="outline" onClick={handlePrevStep}>
                    &larr; Previous
                  </Button>
                )}

                {activeFormTab !== 'notes' ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNextStep}
                  >
                    Next Step &rarr;
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" loading={submitting}>
                    Create Employee Profile
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Employee Account Provisioned Modal (Confidential) */}
      <Modal
        isOpen={!!createdNotification}
        onClose={() => setCreatedNotification(null)}
        title="Employee Account Created"
        subtitle="Onboarding credentials sent directly to employee"
        size="md"
      >
        {createdNotification && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  {createdNotification.name} has been enrolled!
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  An Employee Self-Service (ESS) user account was automatically provisioned and linked to this employee.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                <span className="text-xs text-slate-500 font-medium">Corporate Email</span>
                <span className="text-xs font-bold text-slate-800 font-mono">{createdNotification.email}</span>
              </div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                <span className="text-xs text-slate-500 font-medium">Temporary Credentials</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Emailed Privately
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Sign-In Portal Address</span>
                <span className="text-xs font-mono font-medium text-emerald-700">/login</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                Confidential Security Notice:
              </p>
              <p className="leading-relaxed">
                To uphold corporate privacy and strict security compliance, employee passwords are never displayed to managers. A cryptographically random temporary password and access instructions have been emailed directly to <strong>{createdNotification.email}</strong>.
              </p>
              <p className="pt-1 text-[11px] text-amber-800/90">
                The employee can sign in immediately at <strong>/login</strong> and can change their password at any time via <em>"Forgot password?"</em> or from their ESS Portal.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setCreatedNotification(null)}
              >
                Understood
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default EmployeeList;
