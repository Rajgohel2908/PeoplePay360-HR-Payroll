// client/src/pages/payroll/PayrunWizard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
  Calendar,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Stepper } from '../../components/ui/Stepper';
import { useNotifications } from '../../contexts/NotificationContext';

export function PayrunWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);

  const { showSuccess, showError } = useNotifications();
  const navigate = useNavigate();

  // Wizard Parameters
  const [wizardParams, setWizardParams] = useState({
    title: 'September 2026 Regular Monthly Payrun',
    period_start: '2026-09-01',
    period_end: '2026-09-30',
    payment_date: '2026-10-01',
    salary_structure_id: 1,
    department_id: '',
    employee_type: 'All',
    notes: 'Standard end-of-month compensation cycle'
  });

  useEffect(() => {
    async function loadStructures() {
      try {
        const res = await api.get('/salary-structures');
        if (res.success) setStructures(res.data);
      } catch (err) {}
    }
    loadStructures();
  }, []);

  const steps = [
    { title: 'Period & Structure', subtitle: 'Define pay dates and structure' },
    { title: 'Eligible Employees', subtitle: 'Review & select employees' },
    { title: 'Pre-Flight Review', subtitle: 'Inspect potential issues' },
    { title: 'Create & Compute', subtitle: 'Initialize payrun cycle' }
  ];

  const handleFetchEligible = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payruns/eligible-employees', {
        period_start: wizardParams.period_start,
        period_end: wizardParams.period_end,
        department_id: wizardParams.department_id || null,
        employee_type: wizardParams.employee_type
      });

      if (res.success) {
        setEligibleEmployees(res.data);
        // Default select all eligible
        const allIds = res.data.map(e => e.employee_id);
        setSelectedEmpIds(allIds);
        setCurrentStep(2);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch eligible employees.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEmpIds(eligibleEmployees.map(e => e.employee_id));
    } else {
      setSelectedEmpIds([]);
    }
  };

  const toggleEmp = (id) => {
    setSelectedEmpIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreatePayrun = async (autoCompute = false) => {
    setLoading(true);
    try {
      const payload = {
        ...wizardParams,
        selected_employee_ids: selectedEmpIds
      };

      const res = await api.post('/payruns', payload);
      if (res.success) {
        const newPayrunId = res.data.id;
        showSuccess('Payrun cycle initialized successfully!');

        if (autoCompute) {
          const compRes = await api.post(`/payruns/${newPayrunId}/compute`);
          if (compRes.success) {
            showSuccess('Payroll computed! Directing to Pre-Flight Validation Center...');
            navigate(`/payroll/validation/${newPayrunId}`);
            return;
          }
        }

        navigate(`/payroll/${newPayrunId}`);
      }
    } catch (err) {
      showError(err.message || 'Failed to create payrun.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selectedEmpIds.length;
  const issuesCount = eligibleEmployees.filter(e => selectedEmpIds.includes(e.employee_id) && e.issues.length > 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payrun Creation Wizard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Follow the 4-step guided workflow to configure and prepare payroll computation
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/payroll')}>
          Cancel Wizard
        </Button>
      </div>

      {/* Stepper Indicator */}
      <Card noPadding className="p-4">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={(s) => s < currentStep && setCurrentStep(s)}
        />
      </Card>

      {/* STEP 1: PERIOD & STRUCTURE */}
      {currentStep === 1 && (
        <Card title="Step 1: Payroll Period & Structure Parameters">
          <div className="space-y-4">
            <Input
              label="Payrun Title"
              required
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
                options={[
                  { value: '', label: 'All Departments (Company-wide)' },
                  { value: 1, label: 'Engineering & Technology' },
                  { value: 2, label: 'Human Resources' },
                  { value: 3, label: 'Finance & Accounting' },
                  { value: 4, label: 'Product & Design' },
                  { value: 5, label: 'Sales & Marketing' }
                ]}
              />

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

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <Button
                variant="primary"
                onClick={handleFetchEligible}
                loading={loading}
              >
                Next: Find Eligible Employees &rarr;
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2: ELIGIBLE EMPLOYEES SELECTION */}
      {currentStep === 2 && (
        <Card
          title={`Step 2: Eligible Employees Selection (${selectedCount} of ${eligibleEmployees.length} selected)`}
          subtitle="Select employees to include in this payroll cycle"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleSelectAll(true)}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleSelectAll(false)}
              >
                Deselect All
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {eligibleEmployees.map((emp) => {
                const isSelected = selectedEmpIds.includes(emp.employee_id);
                const hasIssues = emp.issues.length > 0;

                return (
                  <div
                    key={emp.employee_id}
                    onClick={() => toggleEmp(emp.employee_id)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{emp.first_name} {emp.last_name}</p>
                          <span className="text-[10px] font-mono text-slate-400">({emp.emp_code})</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{emp.department_name} • {emp.position_title}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasIssues ? (
                        <Badge variant="warning" size="sm" icon={AlertTriangle}>
                          {emp.issues[0]}
                        </Badge>
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

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                &larr; Back to Period
              </Button>
              <Button
                variant="primary"
                disabled={selectedCount === 0}
                onClick={() => setCurrentStep(3)}
              >
                Next: Pre-Flight Review ({selectedCount} Staff) &rarr;
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 3: PRE-COMPUTATION REVIEW */}
      {currentStep === 3 && (
        <Card title="Step 3: Pre-Computation Health Review">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Included Employees</p>
                <p className="text-3xl font-black text-emerald-950 mt-1">{selectedCount}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Staff ready for payroll run</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Excluded Employees</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{eligibleEmployees.length - selectedCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Omitted from this batch</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Potential Pre-Flight Flags</p>
                <p className="text-3xl font-black text-amber-950 mt-1">{issuesCount}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Missing bank details / expired contracts</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Pre-Computation Checklist
              </h4>
              <p className="text-slate-600">&bull; Applicable contract and wage will be dynamically resolved for period <b>{wizardParams.period_start} to {wizardParams.period_end}</b>.</p>
              <p className="text-slate-600">&bull; Actual worked attendance hours and approved leave allocations will be factored into payable days.</p>
              <p className="text-slate-600">&bull; Pre-flight validation rules will scan for bank blockers, overtime anomalies, and variance deviations.</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                &larr; Back to Employee Selection
              </Button>
              <Button variant="primary" onClick={() => setCurrentStep(4)}>
                Next: Final Confirmation &rarr;
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 4: FINAL CONFIRMATION & INITIALIZATION */}
      {currentStep === 4 && (
        <Card title="Step 4: Final Confirmation & Payrun Generation">
          <div className="space-y-6">
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Payrun Specification</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-700">{wizardParams.employee_type}</span>
              </div>
              <h3 className="text-xl font-bold">{wizardParams.title}</h3>
              <p className="text-xs text-slate-300">
                Period: <b>{wizardParams.period_start}</b> to <b>{wizardParams.period_end}</b> &bull; Payment Target: <b>{wizardParams.payment_date}</b>
              </p>
              <p className="text-xs text-emerald-300 font-semibold">
                &bull; Total Staff In Scope: {selectedCount} Employees
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                &larr; Back
              </Button>
              <Button
                variant="secondary"
                loading={loading}
                onClick={() => handleCreatePayrun(false)}
              >
                Create as Draft
              </Button>
              <Button
                variant="primary"
                icon={Sparkles}
                loading={loading}
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
