// client/src/pages/contracts/ContractList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSignature,
  Plus,
  Search,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight
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

export function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const { showSuccess, showError } = useNotifications();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    contract_id: `CNT-${Date.now().toString().slice(-6)}`,
    employee_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    wage: 80000,
    salary_structure_id: 1,
    working_schedule_id: 1,
    status: 'active',
    contract_notes: 'Standard annual employment agreement'
  });

  const loadContracts = async () => {
    setLoading(true);
    try {
      let url = '/contracts';
      if (statusFilter) url += `?status=${statusFilter}`;
      const res = await api.get(url);
      if (res.success) {
        setContracts(res.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to load contracts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, [statusFilter]);

  useEffect(() => {
    async function loadAux() {
      try {
        const [empRes, structRes, schedRes] = await Promise.all([
          api.get('/employees?limit=100'),
          api.get('/salary-structures'),
          api.get('/schedules')
        ]);
        if (empRes.success) setEmployees(empRes.data);
        if (structRes.success) setStructures(structRes.data);
        if (schedRes.success) setSchedules(schedRes.data);
      } catch (err) {}
    }
    loadAux();
  }, []);

  const handleCreateContract = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/contracts', formData);
      if (res.success) {
        showSuccess('Contract created successfully!');
        setShowCreateModal(false);
        loadContracts();
      }
    } catch (err) {
      showError(err.message || 'Failed to create contract.');
    }
  };

  const columns = [
    {
      header: 'Contract ID',
      accessor: 'contract_id',
      cell: (row) => (
        <span className="font-mono font-bold text-slate-900">{row.contract_id}</span>
      )
    },
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
      header: 'Validity Period',
      accessor: 'start_date',
      cell: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{row.start_date}</span>
          <span className="text-slate-400 mx-1.5">&rarr;</span>
          <span className="text-slate-600 font-medium">{row.end_date || 'Open-ended'}</span>
        </div>
      )
    },
    {
      header: 'Monthly Base Wage',
      accessor: 'wage',
      cell: (row) => (
        <span className="font-bold text-emerald-700">₹{parseFloat(row.wage).toLocaleString('en-IN')}</span>
      )
    },
    {
      header: 'Salary Structure',
      accessor: 'salary_structure_name',
      cell: (row) => (
        <span className="text-xs text-slate-700 font-medium">{row.salary_structure_name || 'Standard IT'}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <Badge
          variant={row.status === 'active' ? 'success' : row.status === 'expired' ? 'danger' : 'neutral'}
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
        <Button
          variant="ghost"
          size="xs"
          onClick={() => navigate(`/employees/360/${row.employee_id}`)}
          className="text-emerald-600 hover:text-emerald-700"
        >
          View 360 &rarr;
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
            Contract Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic period-based employment contracts driving automated payroll wage calculations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Contracts</option>
            <option value="expired">Expired Contracts</option>
          </select>

          {hasRole(['admin', 'hr_manager']) && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowCreateModal(true)}
            >
              New Contract
            </Button>
          )}
        </div>
      </div>

      {/* Contracts Table */}
      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        searchPlaceholder="Search contracts by code or employee..."
      />

      {/* Create Contract Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Employment Contract"
        subtitle="Configure compensation, salary structure, and validity dates"
        size="lg"
      >
        <form onSubmit={handleCreateContract} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contract Code"
              required
              value={formData.contract_id}
              onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
            />
            <Select
              label="Select Employee"
              required
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            >
              <option value="">Choose Employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_id})
                </option>
              ))}
            </Select>
            <Input
              label="Contract Start Date"
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <Input
              label="Contract End Date (Optional)"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              helperText="Leave blank for open-ended permanent contracts"
            />
            <Input
              label="Monthly Base Wage (₹)"
              type="number"
              required
              value={formData.wage}
              onChange={(e) => setFormData({ ...formData, wage: e.target.value })}
            />
            <Select
              label="Salary Structure"
              required
              value={formData.salary_structure_id}
              onChange={(e) => setFormData({ ...formData, salary_structure_id: e.target.value })}
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Select
              label="Working Schedule"
              value={formData.working_schedule_id}
              onChange={(e) => setFormData({ ...formData, working_schedule_id: e.target.value })}
            >
              {schedules.map((sc) => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </Select>
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'draft', label: 'Draft' }
              ]}
            />
          </div>

          <Input
            label="Contract Notes / Remarks"
            value={formData.contract_notes}
            onChange={(e) => setFormData({ ...formData, contract_notes: e.target.value })}
          />

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Contract
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ContractList;
