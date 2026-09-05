// client/src/pages/salary/SalaryStructures.jsx
import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Plus,
  Copy,
  Play,
  ArrowRight,
  Code,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function SalaryStructures() {
  const [structures, setStructures] = useState([]);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simResults, setSimResults] = useState(null);

  const { showSuccess, showError } = useNotifications();
  const { hasRole } = useAuth();

  // Rule Form State
  const [ruleFormData, setRuleFormData] = useState({
    name: 'Special Allowance',
    code: 'SPECIAL_ALLOWANCE',
    category: 'allowance',
    sequence: 30,
    calculation_type: 'formula',
    fixed_amount: 0,
    percentage_rate: 0,
    percentage_base_code: 'WAGE',
    formula_expression: 'WAGE - (BASIC + HRA)',
    condition_expression: '',
    depends_on_codes: 'BASIC,HRA',
    is_active: true
  });

  // Simulator Form State
  const [simParams, setSimParams] = useState({
    wage: 100000,
    worked_days: 22,
    unpaid_days: 0,
    overtime_hours: 0
  });

  const loadStructures = async () => {
    setLoading(true);
    try {
      const res = await api.get('/salary-structures');
      if (res.success) {
        setStructures(res.data);
        if (res.data.length > 0 && !selectedStructure) {
          setSelectedStructure(res.data[0]);
        } else if (selectedStructure) {
          const updated = res.data.find(s => s.id === selectedStructure.id);
          if (updated) setSelectedStructure(updated);
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to load structures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStructures();
  }, []);

  const handleDuplicateStructure = async (id) => {
    try {
      const res = await api.post(`/salary-structures/${id}/duplicate`);
      if (res.success) {
        showSuccess('Salary structure and rules duplicated successfully!');
        loadStructures();
      }
    } catch (err) {
      showError(err.message || 'Failed to duplicate structure.');
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...ruleFormData,
        structure_id: selectedStructure.id
      };
      const res = await api.post(`/salary-structures/${selectedStructure.id}/rules`, payload);
      if (res.success) {
        showSuccess('Salary rule added and sequenced!');
        setShowRuleModal(false);
        loadStructures();
      }
    } catch (err) {
      showError(err.message || 'Failed to save salary rule.');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      const res = await api.delete(`/salary-structures/rules/${ruleId}`);
      if (res.success) {
        showSuccess('Salary rule removed.');
        loadStructures();
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleRunSimulation = async () => {
    try {
      const res = await api.post('/salary-structures/simulate', {
        structure_id: selectedStructure.id,
        ...simParams
      });
      if (res.success) {
        setSimResults(res.data);
      }
    } catch (err) {
      showError(err.message || 'Simulation failed.');
    }
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'basic': return <Badge variant="success" size="sm">Basic</Badge>;
      case 'allowance': return <Badge variant="info" size="sm">Allowance</Badge>;
      case 'gross': return <Badge variant="purple" size="sm">Gross</Badge>;
      case 'deduction': return <Badge variant="danger" size="sm">Deduction</Badge>;
      case 'net': return <Badge variant="indigo" size="sm">Net</Badge>;
      default: return <Badge variant="neutral" size="sm">{cat}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Salary Structures & Rule Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configurable sequenced salary components driving dynamic payslip calculations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={Play}
            onClick={() => {
              setShowSimModal(true);
              handleRunSimulation();
            }}
          >
            Run Rule Simulator
          </Button>
        </div>
      </div>

      {/* Structure Selector Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {structures.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStructure(s)}
            className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
              selectedStructure?.id === s.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.name} ({s.rulesCount || s.rules?.length || 0} Rules)
          </button>
        ))}
      </div>

      {/* Main Structure & Rules View */}
      {selectedStructure && (
        <Card
          title={selectedStructure.name}
          subtitle={`Code: ${selectedStructure.code} • ${selectedStructure.description}`}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                icon={Copy}
                onClick={() => handleDuplicateStructure(selectedStructure.id)}
              >
                Duplicate Structure
              </Button>
              {hasRole(['admin', 'payroll_manager']) && (
                <Button
                  variant="primary"
                  size="xs"
                  icon={Plus}
                  onClick={() => setShowRuleModal(true)}
                >
                  Add Salary Rule
                </Button>
              )}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-16">Seq</th>
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Formula / Calculation</th>
                  <th className="py-3 px-4">Dependencies</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedStructure.rules?.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-500">{r.sequence}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">{r.code}</td>
                    <td className="py-3 px-4">{getCategoryBadge(r.category)}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-600">{r.calculation_type}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {r.formula_expression || (r.percentage_rate ? `${r.percentage_rate}% of ${r.percentage_base_code}` : `Fixed ₹${r.fixed_amount}`)}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 font-mono">{r.depends_on_codes || '--'}</td>
                    <td className="py-3 px-4 text-right">
                      {hasRole(['admin', 'payroll_manager']) && (
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Rule Modal */}
      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title="Add Salary Rule"
        subtitle={`Configure a new component for ${selectedStructure?.name}`}
        size="lg"
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Rule Name"
              required
              value={ruleFormData.name}
              onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
            />
            <Input
              label="Rule Code (Uppercase Variable)"
              required
              value={ruleFormData.code}
              onChange={(e) => setRuleFormData({ ...ruleFormData, code: e.target.value.toUpperCase() })}
            />
            <Select
              label="Category"
              value={ruleFormData.category}
              onChange={(e) => setRuleFormData({ ...ruleFormData, category: e.target.value })}
              options={[
                { value: 'basic', label: 'Basic Salary' },
                { value: 'allowance', label: 'Allowance / Earning' },
                { value: 'gross', label: 'Gross Total' },
                { value: 'deduction', label: 'Deduction' },
                { value: 'net', label: 'Net Pay' }
              ]}
            />
            <Input
              label="Execution Sequence (1-100)"
              type="number"
              required
              value={ruleFormData.sequence}
              onChange={(e) => setRuleFormData({ ...ruleFormData, sequence: e.target.value })}
            />
            <Select
              label="Calculation Type"
              value={ruleFormData.calculation_type}
              onChange={(e) => setRuleFormData({ ...ruleFormData, calculation_type: e.target.value })}
              options={[
                { value: 'formula', label: 'Mathematical Formula Expression' },
                { value: 'percentage', label: 'Percentage of Base Component' },
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'conditional', label: 'Conditional Logic' }
              ]}
            />
            <Input
              label="Depends On Variables (Comma separated)"
              value={ruleFormData.depends_on_codes}
              onChange={(e) => setRuleFormData({ ...ruleFormData, depends_on_codes: e.target.value })}
              placeholder="e.g. BASIC,HRA,GROSS"
            />
          </div>

          {ruleFormData.calculation_type === 'formula' && (
            <Input
              label="Formula Expression (JS / Math syntax)"
              required
              value={ruleFormData.formula_expression}
              onChange={(e) => setRuleFormData({ ...ruleFormData, formula_expression: e.target.value })}
              helperText="Available variables: WAGE, BASIC, HRA, GROSS, TOTAL_DAYS, WORKED_DAYS, UNPAID_DAYS, OVERTIME_HOURS"
            />
          )}

          {ruleFormData.calculation_type === 'percentage' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Percentage Rate (%)"
                type="number"
                step="0.01"
                required
                value={ruleFormData.percentage_rate}
                onChange={(e) => setRuleFormData({ ...ruleFormData, percentage_rate: e.target.value })}
              />
              <Input
                label="Base Component Code"
                required
                value={ruleFormData.percentage_base_code}
                onChange={(e) => setRuleFormData({ ...ruleFormData, percentage_base_code: e.target.value })}
              />
            </div>
          )}

          {ruleFormData.calculation_type === 'fixed' && (
            <Input
              label="Fixed Amount (₹)"
              type="number"
              required
              value={ruleFormData.fixed_amount}
              onChange={(e) => setRuleFormData({ ...ruleFormData, fixed_amount: e.target.value })}
            />
          )}

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowRuleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Rule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Live Simulator Modal */}
      <Modal
        isOpen={showSimModal}
        onClose={() => setShowSimModal(false)}
        title="Interactive Salary Rule Simulator"
        subtitle={`Test calculation engine rules for ${selectedStructure?.name}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Simulation Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <Input
              label="Test Monthly Wage (₹)"
              type="number"
              value={simParams.wage}
              onChange={(e) => setSimParams({ ...simParams, wage: e.target.value })}
            />
            <Input
              label="Worked Days"
              type="number"
              value={simParams.worked_days}
              onChange={(e) => setSimParams({ ...simParams, worked_days: e.target.value })}
            />
            <Input
              label="Unpaid LOP Days"
              type="number"
              value={simParams.unpaid_days}
              onChange={(e) => setSimParams({ ...simParams, unpaid_days: e.target.value })}
            />
            <Input
              label="Overtime Hours"
              type="number"
              value={simParams.overtime_hours}
              onChange={(e) => setSimParams({ ...simParams, overtime_hours: e.target.value })}
            />
          </div>

          <Button variant="secondary" size="sm" onClick={handleRunSimulation} icon={Play}>
            Re-Calculate Simulation
          </Button>

          {/* Results Summary */}
          {simResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-semibold text-blue-700 uppercase">Gross Salary</p>
                  <p className="text-2xl font-black text-blue-900 mt-1">₹{simResults.summary.gross.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-semibold text-red-700 uppercase">Total Deductions</p>
                  <p className="text-2xl font-black text-red-900 mt-1">₹{simResults.summary.deductions.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-xs font-semibold text-emerald-700 uppercase">Net Salary</p>
                  <p className="text-2xl font-black text-emerald-900 mt-1">₹{simResults.summary.net.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Rule</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 font-mono">Amount (₹)</th>
                      <th className="py-2.5 px-3">Formula / Logic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {simResults.breakdown?.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{line.rule_name}</td>
                        <td className="py-2.5 px-3">{getCategoryBadge(line.category)}</td>
                        <td className="py-2.5 px-3 font-bold font-mono text-emerald-700">₹{parseFloat(line.amount).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">{line.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default SalaryStructures;
