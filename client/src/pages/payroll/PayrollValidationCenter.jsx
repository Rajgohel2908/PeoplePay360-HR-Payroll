// client/src/pages/payroll/PayrollValidationCenter.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Check,
  RefreshCw,
  Lock,
  FileCheck
} from 'lucide-react';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function PayrollValidationCenter() {
  const { id } = useParams();
  const [payrunData, setPayrunData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'blockers' | 'warnings' | 'resolved'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { showSuccess, showError } = useNotifications();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const loadValidationData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payruns/${id}`);
      if (res.success) {
        setPayrunData(res.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to load validation issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidationData();
  }, [id]);

  const handleRefreshValidations = async () => {
    try {
      const res = await api.post(`/payruns/${id}/validate`);
      if (res.success) {
        showSuccess('Pre-flight validation rules re-evaluated.');
        loadValidationData();
      }
    } catch (err) {
      showError(err.message || 'Validation refresh failed.');
    }
  };

  const handleResolveIssue = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/payruns/issues/${selectedIssue.id}/resolve`, {
        resolution_notes: resolutionNotes
      });
      if (res.success) {
        showSuccess('Validation issue resolved and logged in audit trail.');
        setShowResolveModal(false);
        loadValidationData();
      }
    } catch (err) {
      showError(err.message || 'Failed to resolve issue.');
    }
  };

  if (loading || !payrunData) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Scanning 9 validation categories across all employee records...</p>
      </div>
    );
  }

  const { payrun, validation } = payrunData;
  const issues = validation.issues || [];

  const blockers = issues.filter(i => i.severity === 'blocker' && !i.is_resolved);
  const warnings = issues.filter(i => i.severity === 'warning' && !i.is_resolved);
  const resolvedList = issues.filter(i => i.is_resolved);

  let filteredIssues = issues;
  if (activeFilter === 'blockers') filteredIssues = blockers;
  else if (activeFilter === 'warnings') filteredIssues = warnings;
  else if (activeFilter === 'resolved') filteredIssues = resolvedList;

  const hasUnresolvedBlockers = blockers.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/payroll/${id}`)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payrun Details
        </button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefreshValidations}
          >
            Re-run Pre-Flight Check
          </Button>
          <Button
            variant={hasUnresolvedBlockers ? 'outline' : 'primary'}
            size="sm"
            disabled={hasUnresolvedBlockers}
            onClick={() => navigate(`/payroll/${id}`)}
          >
            Proceed to Approval Gate &rarr;
          </Button>
        </div>
      </div>

      {/* Main Validation Status Banner */}
      <div className={`p-6 rounded-2xl border shadow-card transition-all ${
        hasUnresolvedBlockers ? 'bg-red-50/80 border-red-200' : 'bg-emerald-50/80 border-emerald-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${
              hasUnresolvedBlockers ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              {hasUnresolvedBlockers ? <ShieldAlert className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">{payrun.payrun_number}</span>
                <h2 className="text-xl font-black text-slate-900">
                  Payroll Pre-Flight Validation Center
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                {hasUnresolvedBlockers
                  ? `Security lock engaged: ${blockers.length} BLOCKER(S) must be resolved before payroll approval or disbursement can proceed.`
                  : 'All pre-flight checks passed! No blockers detected. Payroll is safe to approve and disburse.'}
              </p>
            </div>
          </div>

          {/* Issue Tally Badges */}
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-white border border-red-200 shadow-sm text-center">
              <span className="text-lg font-black text-red-600 block">{blockers.length}</span>
              <span className="text-[10px] font-bold text-red-700 uppercase">Blockers</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-white border border-amber-200 shadow-sm text-center">
              <span className="text-lg font-black text-amber-600 block">{warnings.length}</span>
              <span className="text-[10px] font-bold text-amber-700 uppercase">Warnings</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-white border border-emerald-200 shadow-sm text-center">
              <span className="text-lg font-black text-emerald-600 block">{resolvedList.length}</span>
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Issues ({issues.length})
        </button>
        <button
          onClick={() => { setActiveFilter('blockers'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeFilter === 'blockers' ? 'bg-red-600 text-white' : 'text-red-700 hover:bg-red-50'
          }`}
        >
          🔴 Blockers ({blockers.length})
        </button>
        <button
          onClick={() => { setActiveFilter('warnings'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeFilter === 'warnings' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
          }`}
        >
          🟠 Warnings ({warnings.length})
        </button>
        <button
          onClick={() => { setActiveFilter('resolved'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeFilter === 'resolved' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          ✓ Resolved ({resolvedList.length})
        </button>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <Card className="text-center py-12 text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-900">No issues matching this filter</p>
            <p className="text-xs text-slate-400 mt-0.5">Everything looks clean in this category.</p>
          </Card>
        ) : (
          filteredIssues.slice((currentPage - 1) * 10, currentPage * 10).map((issue) => (
            <div
              key={issue.id}
              className={`p-5 rounded-2xl border shadow-card transition-all ${
                issue.is_resolved
                  ? 'bg-slate-50/60 border-slate-200 opacity-75'
                  : issue.severity === 'blocker'
                  ? 'bg-white border-red-300 ring-1 ring-red-100'
                  : 'bg-white border-amber-300'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        issue.is_resolved ? 'neutral' :
                        issue.severity === 'blocker' ? 'danger' :
                        issue.severity === 'warning' ? 'warning' : 'info'
                      }
                      size="sm"
                      dot
                    >
                      {issue.is_resolved ? 'RESOLVED' : issue.severity.toUpperCase()}
                    </Badge>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      {issue.category}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{issue.title}</span>
                  </div>

                  {issue.first_name && (
                    <p className="text-xs font-semibold text-slate-800">
                      Employee: <span className="text-emerald-700">{issue.first_name} {issue.last_name}</span> ({issue.emp_code})
                    </p>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed">{issue.description}</p>

                  <div className="pt-2 flex flex-col sm:flex-row gap-4 text-xs text-slate-500 border-t border-slate-100 mt-2">
                    {issue.impact && (
                      <p><b className="text-slate-700">Financial Impact:</b> {issue.impact}</p>
                    )}
                    {issue.recommended_action && (
                      <p><b className="text-emerald-700">Recommended Action:</b> {issue.recommended_action}</p>
                    )}
                  </div>

                  {issue.is_resolved && issue.resolution_notes && (
                    <p className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 mt-2">
                      Resolution Note: "{issue.resolution_notes}"
                    </p>
                  )}
                </div>

                {/* Issue Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {issue.employee_id && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => navigate(`/employees/360/${issue.employee_id}`)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      View Employee <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}

                  {!issue.is_resolved && hasRole(['admin', 'payroll_manager']) && (
                    <Button
                      variant={issue.severity === 'blocker' ? 'danger' : 'warning'}
                      size="xs"
                      onClick={() => {
                        setSelectedIssue(issue);
                        setResolutionNotes(`Reviewed and resolved for ${issue.title}`);
                        setShowResolveModal(true);
                      }}
                    >
                      Resolve / Override
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <PaginationControls
        currentPage={currentPage}
        pageSize={10}
        totalItems={filteredIssues.length}
        onPageChange={setCurrentPage}
        itemLabel="validation issues"
        className="bg-white rounded-xl border border-slate-200"
      />

      {/* Resolve Issue Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Resolve Pre-Flight Validation Issue"
        subtitle={`Audit resolution for: ${selectedIssue?.title}`}
        size="md"
      >
        <form onSubmit={handleResolveIssue} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <p className="font-bold text-slate-900">{selectedIssue?.title}</p>
            <p className="text-slate-600">{selectedIssue?.description}</p>
          </div>

          <Input
            label="Resolution Justification / Audit Notes"
            required
            placeholder="e.g. Bank details verified with employee and updated in HR profile"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            helperText="Stored in system audit logs to justify payroll pre-flight resolution."
          />

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowResolveModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Resolution
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default PayrollValidationCenter;
