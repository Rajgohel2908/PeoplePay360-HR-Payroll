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
  Trash2
} from 'lucide-react';
import api from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const { showSuccess, showError } = useNotifications();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  // New Employee Form State (6 Sections)
  const [activeFormTab, setActiveFormTab] = useState('personal');
  const [formData, setFormData] = useState({
    employee_id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '1995-05-15',
    gender: 'Male',
    address: '100 Outer Ring Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560103',
    department_id: '',
    job_position_id: '',
    employee_type: 'Full-time',
    employment_status: 'Active',
    joining_date: new Date().toISOString().split('T')[0],
    schedule_id: 1,
    wage: 85000,
    bank_name: 'HDFC Bank',
    account_number: '50100' + Math.floor(100000000 + Math.random() * 900000000),
    ifsc_code: 'HDFC0000128',
    pan_number: 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F',
    emergency_name: 'Suresh Kumar',
    emergency_phone: '+91 98765 43210',
    emergency_relation: 'Spouse',
    notes: 'Key hire for Q3 expansion'
  });

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
        const [dashRes, schedRes] = await Promise.all([
          api.get('/reports/department-cost'),
          api.get('/schedules')
        ]);
        if (schedRes.success) setSchedules(schedRes.data);
      } catch (err) {}
    }
    loadAux();
  }, []);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/employees', formData);
      if (res.success) {
        showSuccess(`Employee ${formData.first_name} ${formData.last_name} created successfully!`);
        setShowCreateModal(false);
        loadEmployees();
      }
    } catch (err) {
      showError(err.message || 'Failed to create employee.');
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
      cell: (row) => <span className="font-medium text-slate-600">{row.joining_date}</span>
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
            title="Open Employee 360 View"
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> 360 View
          </Button>
        </div>
      )
    }
  ];

  const formTabs = [
    { id: 'personal', label: '1. Personal Info' },
    { id: 'employment', label: '2. Employment & Role' },
    { id: 'contact', label: '3. Contact Details' },
    { id: 'bank', label: '4. Bank & Statutory' },
    { id: 'emergency', label: '5. Emergency Contact' },
    { id: 'notes', label: '6. Notes & Summary' }
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

          {hasRole(['admin', 'hr_manager']) && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowCreateModal(true)}
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
          onChange={(e) => setDeptFilter(e.target.value)}
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
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Probation">Probation</option>
          <option value="Notice">Notice Period</option>
          <option value="Terminated">Terminated</option>
        </select>
      </div>

      {/* View Mode: Table vs Kanban */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={employees}
          loading={loading}
          searchPlaceholder="Search employees by name, ID, or email..."
          searchValue={search}
          onSearchChange={setSearch}
          pagination={pagination}
          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
        />
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Active', 'Probation', 'Notice'].map((statusKey) => {
            const groupEmployees = employees.filter(e => e.employment_status === statusKey);
            return (
              <div key={statusKey} className="bg-slate-100/70 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {statusKey} ({groupEmployees.length})
                  </h3>
                  {getStatusBadge(statusKey)}
                </div>

                <div className="space-y-3">
                  {groupEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => navigate(`/employees/360/${emp.id}`)}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all duration-150 hover:border-emerald-300 group"
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
                          <p className="text-[11px] text-slate-500 font-medium truncate">{emp.position_title}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.employee_id} • {emp.department_name}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Joined: {emp.joining_date}</span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          360 View <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
          <Tabs
            tabs={formTabs}
            activeTab={activeFormTab}
            onChange={setActiveFormTab}
          />

          <form onSubmit={handleCreateEmployee} className="pt-2">
            {activeFormTab === 'personal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Employee ID"
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                />
                <Select
                  label="Gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
                <Input
                  label="Last Name"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
                <Input
                  label="Joining Date"
                  type="date"
                  required
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                />
              </div>
            )}

            {activeFormTab === 'employment' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Department"
                  required
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  options={[
                    { value: '', label: 'Select Department...' },
                    { value: 1, label: 'Engineering & Technology' },
                    { value: 2, label: 'Human Resources' },
                    { value: 3, label: 'Finance & Accounting' },
                    { value: 4, label: 'Product & Design' },
                    { value: 5, label: 'Sales & Marketing' },
                    { value: 6, label: 'Operations' },
                    { value: 7, label: 'Customer Success' }
                  ]}
                />
                <Select
                  label="Job Position"
                  required
                  value={formData.job_position_id}
                  onChange={(e) => setFormData({ ...formData, job_position_id: e.target.value })}
                  options={[
                    { value: '', label: 'Select Designation...' },
                    { value: 3, label: 'Senior Full Stack Engineer' },
                    { value: 4, label: 'Frontend Specialist' },
                    { value: 5, label: 'Backend Engineer' },
                    { value: 8, label: 'HR Operations Manager' },
                    { value: 11, label: 'Payroll Lead' },
                    { value: 13, label: 'Product Manager' }
                  ]}
                />
                <Select
                  label="Employment Status"
                  value={formData.employment_status}
                  onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Probation', label: 'Probation' },
                    { value: 'Notice', label: 'Notice Period' }
                  ]}
                />
                <Select
                  label="Employee Type"
                  value={formData.employee_type}
                  onChange={(e) => setFormData({ ...formData, employee_type: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, wage: e.target.value })}
                  helperText="Initial contract wage for salary rule computation"
                />
                <Select
                  label="Working Schedule"
                  value={formData.schedule_id}
                  onChange={(e) => setFormData({ ...formData, schedule_id: e.target.value })}
                  options={[
                    { value: 1, label: 'Standard General Shift (40h/week)' },
                    { value: 2, label: 'Flexible Tech Shift (40h/week)' }
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Contact Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Residential Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <Input
                  label="State & PIN Code"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            )}

            {activeFormTab === 'bank' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  required
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                />
                <Input
                  label="Bank Account Number"
                  required
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                />
                <Input
                  label="IFSC Code"
                  required
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                />
                <Input
                  label="PAN Card Number"
                  value={formData.pan_number}
                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                />
              </div>
            )}

            {activeFormTab === 'emergency' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Emergency Contact Name"
                  value={formData.emergency_name}
                  onChange={(e) => setFormData({ ...formData, emergency_name: e.target.value })}
                />
                <Input
                  label="Emergency Phone"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                />
                <Input
                  label="Relationship"
                  value={formData.emergency_relation}
                  onChange={(e) => setFormData({ ...formData, emergency_relation: e.target.value })}
                />
              </div>
            )}

            {activeFormTab === 'notes' && (
              <div className="space-y-4">
                <Input
                  label="HR Onboarding Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
                  <p className="font-bold">Automated Onboarding Sequence:</p>
                  <p>&bull; An Active Contract #{`CNT-${formData.employee_id}`} with ₹{formData.wage} monthly wage will be initialized.</p>
                  <p>&bull; 2026 Annual Leave Allocations (Casual, Sick, Privilege) will be provisioned automatically.</p>
                </div>
              </div>
            )}

            {/* Modal Controls */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Step {formTabs.findIndex(t => t.id === activeFormTab) + 1} of 6</span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                {activeFormTab !== 'notes' ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const idx = formTabs.findIndex(t => t.id === activeFormTab);
                      setActiveFormTab(formTabs[idx + 1].id);
                    }}
                  >
                    Next Step &rarr;
                  </Button>
                ) : (
                  <Button type="submit" variant="primary">
                    Create Employee Profile
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default EmployeeList;
