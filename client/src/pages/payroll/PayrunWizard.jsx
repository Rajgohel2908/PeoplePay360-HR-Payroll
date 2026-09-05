// client/src/pages/payroll/PayrunWizard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  Building2,
  Info,
  Loader2,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Stepper } from '../../components/ui/Stepper';
import { useNotifications } from '../../contexts/NotificationContext';

function getDefaultDates() {
  const now = new Date();
  const year = now.getFullYear();
  const monthNum = now.getMonth(); // 0-indexed
  const monthStr = String(monthNum + 1).padStart(2, '0');
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const lastDay = new Date(year, monthNum + 1, 0).getDate();
  const lastDayStr = String(lastDay).padStart(2, '0');

  return {
    title: `${monthName} ${year} Regular Monthly Payrun`,
    period_start: `${year}-${monthStr}-01`,
    period_end: `${year}-${monthStr}-${lastDayStr}`,
    payment_date: `${year}-${monthStr}-${lastDayStr}`,
    salary_structure_id: 1,
    department_id: '',
    employee_type: 'All',
    notes: `Standard end-of-month compensation cycle for ${monthName} ${year}`
  };
}

export function PayrunWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [structures, setStructures] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);

  // Step 2 Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'ready' | 'issues'

  const { showSuccess, showError } = useNotifications();
  const navigate = useNavigate();

  // Wizard Parameters with dynamic default dates
  const [wizardParams, setWizardParams] = useState(getDefaultDates());

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [structRes, deptRes] = await Promise.allSettled([
          api.get('/salary-structures'),
          api.get('/employees/departments')
        ]);

        if (structRes.status === 'fulfilled' && structRes.value?.success && structRes.value.data?.length > 0) {
          setStructures(structRes.value.data);
          setWizardParams(prev => ({
            ...prev,
            salary_structure_id: prev.salary_structure_id || structRes.value.data[0].id
          }));
        }

        if (deptRes.status === 'fulfilled' && deptRes.value?.success && deptRes.value.data?.length > 0) {
          setDepartments(deptRes.value.data);
        } else {
          // Reliable fallback
          setDepartments([
            { id: 1, name: 'Engineering & Technology' },
            { id: 2, name: 'Human Resources' },
            { id: 3, name: 'Finance & Accounting' },
            { id: 4, name: 'Product & Design' },
            { id: 5, name: 'Sales & Marketing' }
          ]);
        }
      } catch (err) {
        setDepartments([
          { id: 1, name: 'Engineering & Technology' },
          { id: 2, name: 'Human Resources' },
          { id: 3, name: 'Finance & Accounting' },
          { id: 4, name: 'Product & Design' },
          { id: 5, name: 'Sales & Marketing' }
        ]);
      }
    }
    loadInitialData();
  }, []);

  const steps = [
    { title: 'Period & Structure', subtitle: 'Define pay dates and structure' },
    { title: 'Eligible Employees', subtitle: 'Review & select employees' },
    { title: 'Pre-Flight Review', subtitle: 'Inspect potential issues' },
    { title: 'Create & Compute', subtitle: 'Initialize payrun cycle' }
  ];

  // Step 1: Validation and Fetching
  const handleFetchEligible = async () => {
    if (!wizardParams.title?.trim()) {
      showError('Please enter a payrun title.');
      return;
    }
    if (!wizardParams.period_start || !wizardParams.period_end) {
      showError('Please enter both period start and end dates.');
      return;
    }
    if (new Date(wizardParams.period_start) > new Date(wizardParams.period_end)) {
      showError('Period start date must not be later than the period end date.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/payruns/eligible-employees', {
        period_start: wizardParams.period_start,
        period_end: wizardParams.period_end,
        department_id: wizardParams.department_id ? parseInt(wizardParams.department_id, 10) : null,
        employee_type: wizardParams.employee_type
      });

      if (res.success) {
        const emps = res.data || [];
        setEligibleEmployees(emps);
        // Default select all eligible employees
        setSelectedEmpIds(emps.map(e => e.employee_id));
        setSearchQuery('');
        setFilterStatus('all');
        setCurrentStep(2);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch eligible employees.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Selection Helpers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEmpIds(eligibleEmployees.map(e => e.employee_id));
    } else {
      setSelectedEmpIds([]);
    }
  };

  const handleSelectOnlyReady = () => {
    const readyIds = eligibleEmployees.filter(e => e.issues.length === 0).map(e => e.employee_id);
    setSelectedEmpIds(readyIds);
  };

  const toggleEmp = (id) => {
    setSelectedEmpIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filtered employees for Step 2
  const filteredEmployees = useMemo(() => {
    return eligibleEmployees.filter(emp => {
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const code = (emp.emp_code || '').toLowerCase();
      const dept = (emp.department_name || '').toLowerCase();
      const pos = (emp.position_title || '').toLowerCase();

      const matchesSearch = !q || fullName.includes(q) || code.includes(q) || dept.includes(q) || pos.includes(q);
      if (!matchesSearch) return false;

      if (filterStatus === 'ready') return emp.issues.length === 0;
      if (filterStatus === 'issues') return emp.issues.length > 0;
      return true;
    });
  }, [eligibleEmployees, searchQuery, filterStatus]);

  const selectedCount = selectedEmpIds.length;
  const readyEmployeesCount = eligibleEmployees.filter(e => e.issues.length === 0).length;
  const flaggedEmployeesCount = eligibleEmployees.filter(e => e.issues.length > 0).length;
  const selectedFlaggedCount = eligibleEmployees.filter(e => selectedEmpIds.includes(e.employee_id) && e.issues.length > 0).length;

  const handleCreatePayrun = async (autoCompute = false) => {
    if (autoCompute) {
      setComputing(true);
    } else {
      setLoading(true);
    }

    try {
      const payload = {
        ...wizardParams,
        salary_structure_id: parseInt(wizardParams.salary_structure_id, 10) || 1,
        department_id: wizardParams.department_id ? parseInt(wizardParams.department_id, 10) : null,
        selected_employee_ids: selectedEmpIds
      };

      const res = await api.post('/payruns', payload);
      if (res.success) {
        const newPayrunId = res.data.id;

        if (autoCompute) {
          const compRes = await api.post(`/payruns/${newPayrunId}/compute`);
          if (compRes.success) {
            showSuccess('Batch payroll computed successfully! Navigating to Pre-Flight Validation Center...');
            navigate(`/payroll/validation/${newPayrunId}`);
            return;
          }
        }

        showSuccess('Payrun cycle initialized successfully in Draft state.');
        navigate(`/payroll/${newPayrunId}`);
      }
    } catch (err) {
      showError(err.message || 'Failed to create payrun.');
    } finally {
      setLoading(false);
      setComputing(false);
    }
  };

  const selectedStructure = structures.find(s => String(s.id) === String(wizardParams.salary_structure_id));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payrun Creation Wizard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Follow the 4-step guided workflow to configure, select employees, and compute payroll
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/payroll')}>
          Cancel Wizard
        </Button>
      </div>

      {/* Stepper Indicator */}
      <Card noPadding className="p-4 shadow-sm border-slate-200">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={(s) => s < currentStep && setCurrentStep(s)}
        />
      </Card>

      {/* STEP 1: PERIOD & STRUCTURE */}
      {currentStep === 1 && (
        <Card title="Step 1: Payroll Period & Structure Parameters">
          <div className="space-y-5">
            <Input
              label="Payrun Title"
              required
              placeholder="e.g. September 2026 Regular Monthly Payrun"
              value={wizardParams.title}
              onChange={(e) => setWizardParams({ ...wizardParams, title: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Period Start Date"
                type="date"
                required
                value={wizardParams.period_start}
                onChange={(e) => setWizardParams({ ...wizardParams, period_start: e.target.value })}
              />
              <Input
                label="Period End Date"
                type="date"
                required
                value={wizardParams.period_end}
                onChange={(e) => setWizardParams({ ...wizardParams, period_end: e.target.value })}
              />
              <Input
                label="Target Payment Date"
                type="date"
                required
                value={wizardParams.payment_date}
                onChange={(e) => setWizardParams({ ...wizardParams, payment_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Default Salary Structure"
                required
                value={wizardParams.salary_structure_id}
                onChange={(e) => setWizardParams({ ...wizardParams, salary_structure_id: e.target.value })}
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </Select>

              <Select
                label="Department Scope"
                value={wizardParams.department_id}
                onChange={(e) => setWizardParams({ ...wizardParams, department_id: e.target.value })}
              >
                <option value="">All Departments (Company-wide)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>

              <Select
                label="Employee Type"
                value={wizardParams.employee_type}
                onChange={(e) => setWizardParams({ ...wizardParams, employee_type: e.target.value })}
                options={[
                  { value: 'All', label: 'All Employee Types' },
                  { value: 'Full-time', label: 'Full-time Only' },
                  { value: 'Contract', label: 'Contract Only' },
                  { value: 'Part-time', label: 'Part-time Only' }
                ]}
              />
            </div>

            <div>
              <Input
                label="Payrun Description / Operational Notes"
                placeholder="Optional notes for payroll audit log..."
                value={wizardParams.notes}
                onChange={(e) => setWizardParams({ ...wizardParams, notes: e.target.value })}
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <Button
                variant="primary"
                onClick={handleFetchEligible}
                loading={loading}
                icon={ArrowRight}
              >
                Next: Find Eligible Employees
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2: ELIGIBLE EMPLOYEES SELECTION */}
      {currentStep === 2 && (
        <Card
          title={`Step 2: Eligible Employees Selection (${selectedCount} of ${eligibleEmployees.length} selected)`}
          subtitle="Review employees matching your date and department scope before batch computation"
        >
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                    filterStatus === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({eligibleEmployees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('ready')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                    filterStatus === 'ready'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Ready ({readyEmployeesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('issues')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                    filterStatus === 'issues'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Flagged ({flaggedEmployeesCount})
                </button>
              </div>

              {/* Bulk Select Actions */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleSelectAll(true)}
                >
                  Select All
                </Button>
                {flaggedEmployeesCount > 0 && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleSelectOnlyReady}
                  >
                    Only Ready
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleSelectAll(false)}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Employee List */}
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-500">No employees match your search or filter criteria.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-inner">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmpIds.includes(emp.employee_id);
                  const hasIssues = emp.issues.length > 0;

                  return (
                    <div
                      key={emp.employee_id}
                      onClick={() => toggleEmp(emp.employee_id)}
                      className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleEmp(emp.employee_id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({emp.emp_code})
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {emp.employee_type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {emp.department_name || 'General'} • {emp.position_title || 'Staff'}
                            {emp.wage ? ` • Wage: ₹${Number(emp.wage).toLocaleString()}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {hasIssues ? (
                          <div className="flex flex-wrap gap-1 justify-end">
                            {emp.issues.map((issue, idx) => (
                              <Badge key={idx} variant="warning" size="sm" icon={AlertTriangle}>
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="success" size="sm" icon={CheckCircle2}>
                            Ready
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCurrentStep(1)} icon={ArrowLeft}>
                Back to Period
              </Button>
              <Button
                variant="primary"
                disabled={selectedCount === 0}
                onClick={() => setCurrentStep(3)}
                icon={ArrowRight}
              >
                Next: Pre-Flight Review ({selectedCount} Selected)
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 3: PRE-COMPUTATION HEALTH REVIEW */}
      {currentStep === 3 && (
        <Card title="Step 3: Pre-Computation Health Review">
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Included Employees</p>
                <p className="text-3xl font-black text-emerald-950 mt-1">{selectedCount}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Staff queued for calculation</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Excluded Employees</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{eligibleEmployees.length - selectedCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Omitted from this batch</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Potential Pre-Flight Flags</p>
                <p className="text-3xl font-black text-amber-950 mt-1">{selectedFlaggedCount}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Missing bank details / expired contracts</p>
              </div>
            </div>

            {/* Flagged Employees Breakdown */}
            {selectedFlaggedCount > 0 ? (
              <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      {selectedFlaggedCount} Selected Employee(s) Have Pre-Flight Flags
                    </h4>
                    <p className="text-[11px] text-amber-700">
                      These employees can still be computed in Draft, but payments cannot be disbursed until their profiles are completed.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-amber-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {eligibleEmployees
                    .filter(e => selectedEmpIds.includes(e.employee_id) && e.issues.length > 0)
                    .map(emp => (
                      <div key={emp.employee_id} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{emp.first_name} {emp.last_name}</span>
                          <span className="text-slate-400 text-[10px] ml-1.5">({emp.emp_code})</span>
                          <span className="text-slate-500 text-[10px] ml-1.5">• {emp.department_name || 'General'}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {emp.issues.map((issue, idx) => (
                            <Badge key={idx} variant="warning" size="sm">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-900">All Selected Employees Are Verified</h4>
                  <p className="text-emerald-700 mt-0.5">
                    All {selectedCount} selected employees have active contracts and verified payment disbursement bank accounts.
                  </p>
                </div>
              </div>
            )}

            {/* Checklist */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Pre-Computation Engine Checklist
              </h4>
              <p className="text-slate-600">&bull; Applicable contract and wage will be dynamically resolved for period <b>{wizardParams.period_start} to {wizardParams.period_end}</b>.</p>
              <p className="text-slate-600">&bull; Actual attendance logs and approved leave records will be aggregated to calculate payable vs unpaid days.</p>
              <p className="text-slate-600">&bull; Pre-flight validation rules will scan for bank blockers, overtime anomalies, and variance deviations post-computation.</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCurrentStep(2)} icon={ArrowLeft}>
                Back to Selection
              </Button>
              <Button variant="primary" onClick={() => setCurrentStep(4)} icon={ArrowRight}>
                Next: Final Confirmation
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 4: FINAL CONFIRMATION & INITIALIZATION */}
      {currentStep === 4 && (
        <Card title="Step 4: Final Confirmation & Payrun Generation">
          <div className="space-y-6">
            {/* Payrun Specification Card with explicit bright contrast */}
            <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-xl space-y-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Payrun Specification
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-100 border border-slate-600">
                  {wizardParams.employee_type} Staff Scope
                </span>
              </div>

              {/* Title with explicit text-white to override any global dark font */}
              <h3 className="text-xl font-bold text-white tracking-tight">
                {wizardParams.title}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-700 text-xs">
                <div>
                  <p className="text-slate-400 text-[11px]">Period Start</p>
                  <p className="font-semibold text-slate-100 mt-0.5">{wizardParams.period_start}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Period End</p>
                  <p className="font-semibold text-slate-100 mt-0.5">{wizardParams.period_end}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Payment Target</p>
                  <p className="font-semibold text-slate-100 mt-0.5">{wizardParams.payment_date}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Total Staff</p>
                  <p className="font-bold text-emerald-300 mt-0.5">{selectedCount} Employees</p>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-300 flex items-center gap-4 flex-wrap">
                <span>Structure: <strong className="text-white">{selectedStructure?.name || 'Default Structure'}</strong></span>
                {wizardParams.department_id && (
                  <span>Dept: <strong className="text-white">{departments.find(d => String(d.id) === String(wizardParams.department_id))?.name || 'Selected Department'}</strong></span>
                )}
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Info className="w-4 h-4 text-indigo-600" />
                Execution Mode Breakdown
              </div>
              <ul className="text-slate-600 space-y-1.5 pl-4 list-disc">
                <li>
                  <strong>Create as Draft:</strong> Saves the payrun container and assigns the {selectedCount} employees. You can calculate pay later from the Payrun Details view.
                </li>
                <li>
                  <strong>Create & Compute Batch Payroll:</strong> Immediately runs the Gross-to-Net calculator for all {selectedCount} staff, generates individual payslips, and redirects directly to the Pre-Flight Validation Center.
                </li>
              </ul>
            </div>

            {/* Loading Indicator */}
            {(loading || computing) && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-3 text-emerald-800 text-xs font-semibold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                {computing
                  ? `Computing batch payroll and generating payslips for ${selectedCount} employees...`
                  : 'Initializing payrun cycle...'}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(3)}
                disabled={loading || computing}
                icon={ArrowLeft}
              >
                Back
              </Button>
              <Button
                variant="secondary"
                loading={loading && !computing}
                disabled={computing}
                onClick={() => handleCreatePayrun(false)}
              >
                Create as Draft
              </Button>
              <Button
                variant="primary"
                icon={Sparkles}
                loading={computing}
                disabled={loading && !computing}
                onClick={() => handleCreatePayrun(true)}
                className="font-bold shadow-md shadow-emerald-600/30"
              >
                Create & Compute Batch Payroll
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default PayrunWizard;
