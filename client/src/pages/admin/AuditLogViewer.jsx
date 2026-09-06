// client/src/pages/admin/AuditLogViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  RefreshCw, 
  Calendar, 
  User, 
  Layers, 
  FileText,
  Activity,
  ArrowRight,
  Code2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { getAuditLogs } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { exportTableAsCsv, exportElementAsPdf } from '../../utils/exportUtils';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [inspectLog, setInspectLog] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const tableRef = useRef(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        ...(selectedEntity && { entity: selectedEntity }),
        ...(selectedAction && { action: selectedAction })
      };
      const res = await getAuditLogs(params);
      if (res.data?.success) {
        setLogs(res.data.data || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, selectedEntity, selectedAction]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.user_name?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term) ||
      log.entity?.toLowerCase().includes(term) ||
      log.reason?.toLowerCase().includes(term) ||
      log.ip_address?.toLowerCase().includes(term)
    );
  });

  const getActionBadgeVariant = (action) => {
    if (!action) return 'neutral';
    if (action.includes('CREATE') || action.includes('INSERT') || action.includes('SUBMIT')) return 'primary';
    if (action.includes('APPROVE') || action.includes('RESOLVE') || action.includes('CONFIRM')) return 'success';
    if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('OVERRIDE')) return 'warning';
    if (action.includes('DELETE') || action.includes('REJECT') || action.includes('CANCEL')) return 'danger';
    return 'neutral';
  };

  const exportAuditCSV = () => {
    if (!logs.length) return;
    const columns = [
      { key: 'created_at', header: 'Timestamp', format: (v) => new Date(v).toLocaleString() },
      { key: 'user_name', header: 'User', format: (v) => v || 'System' },
      { key: 'user_role', header: 'Role', format: (v) => v || 'automated' },
      { key: 'action', header: 'Action' },
      { key: 'entity', header: 'Target Entity' },
      { key: 'entity_id', header: 'Entity ID' },
      { key: 'reason', header: 'Reason / Notes' },
      { key: 'ip_address', header: 'Origin IP', format: (v) => v || '127.0.0.1' }
    ];
    const filename = `PEOPLEPAY360_Audit_Trail_${new Date().toISOString().split('T')[0]}`;
    exportTableAsCsv(logs, columns, filename);
  };

  const exportAuditPdf = async () => {
    if (!tableRef.current) return;
    setExportingPdf(true);
    try {
      const filename = `PEOPLEPAY360_Audit_Trail_${new Date().toISOString().split('T')[0]}`;
      await exportElementAsPdf(tableRef.current, filename, { orientation: 'landscape' });
    } catch (err) {
      console.error('Failed to export audit PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const formatJSON = (raw) => {
    if (!raw) return null;
    try {
      if (typeof raw === 'object') return JSON.stringify(raw, null, 2);
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(raw);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Audit Trail</h1>
            <Badge variant="success" className="font-mono text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" /> IMMUTABLE
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-proof compliance log capturing every system mutation, state transition, payroll approval, and manual override.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchLogs} icon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAuditPdf} loading={exportingPdf} icon={<FileText className="w-4 h-4" />}>
            {exportingPdf ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportAuditCSV} icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900 text-white flex items-center justify-between border-slate-800 shadow-md">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Recorded Events</p>
            <p className="text-2xl font-bold font-mono text-white mt-1">{pagination.total.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white flex items-center justify-between shadow-sm border-slate-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Page Records</p>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{logs.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white flex items-center justify-between shadow-sm border-slate-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Status</p>
            <p className="text-base font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Synchronized
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white flex items-center justify-between shadow-sm border-slate-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retention Policy</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">7 Years (Statutory)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Calendar className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white shadow-sm border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Input 
              placeholder="Search user, action, entity, reason, IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <div>
            <Select
              value={selectedEntity}
              onChange={(e) => { setSelectedEntity(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Entities' },
                { value: 'Employee', label: 'Employee' },
                { value: 'Contract', label: 'Contract' },
                { value: 'Payrun', label: 'Payrun' },
                { value: 'Payslip', label: 'Payslip' },
                { value: 'TimeOff', label: 'Time Off' },
                { value: 'SalaryStructure', label: 'Salary Structure' },
                { value: 'SalaryRule', label: 'Salary Rule' },
                { value: 'User', label: 'User' },
                { value: 'SystemSetting', label: 'System Setting' }
              ]}
            />
          </div>
          <div>
            <Select
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'CREATE', label: 'CREATE' },
                { value: 'UPDATE', label: 'UPDATE' },
                { value: 'DELETE', label: 'DELETE' },
                { value: 'APPROVE', label: 'APPROVE' },
                { value: 'REJECT', label: 'REJECT' },
                { value: 'CALCULATE', label: 'CALCULATE' },
                { value: 'OVERRIDE', label: 'OVERRIDE' },
                { value: 'LOGIN', label: 'LOGIN' }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Log Table */}
      <Card className="overflow-hidden shadow-sm border-slate-200">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={8} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No audit entries found"
              description="No security or operational events matched your selected filter criteria."
              icon={<ShieldCheck className="w-10 h-10 text-slate-400" />}
            />
          </div>
        ) : (
          <div ref={tableRef} className="overflow-x-auto" data-export-id="audit-table">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Target Entity</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-4">Origin IP</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-normal">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{log.user_name || 'System'}</p>
                          <p className="text-xs text-slate-400 capitalize">{log.user_role || 'automated'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={getActionBadgeVariant(log.action)} className="font-mono text-xs">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800">{log.entity}</span>
                        {log.entity_id && (
                          <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            #{log.entity_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 text-xs">
                      {log.reason || '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-500">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setInspectLog(log)}
                        icon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filteredLogs.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{pagination.total}</span> total audit records
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-medium text-slate-700">
              Page {page} of {pagination.totalPages || 1}
            </span>
            <Button
              size="xs"
              variant="outline"
              disabled={page >= (pagination.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Inspect Log Modal */}
      <Modal
        isOpen={Boolean(inspectLog)}
        onClose={() => setInspectLog(null)}
        title="Audit Event Deep-Dive"
        size="lg"
      >
        {inspectLog && (
          <div className="space-y-5">
            {/* Meta header */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-400 uppercase font-semibold">Event ID</p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">#{inspectLog.id}</p>
              </div>
              <div>
                <p className="text-slate-400 uppercase font-semibold">Action</p>
                <div className="mt-0.5">
                  <Badge variant={getActionBadgeVariant(inspectLog.action)} size="xs">
                    {inspectLog.action}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-slate-400 uppercase font-semibold">Entity</p>
                <p className="font-semibold text-slate-800 mt-0.5">{inspectLog.entity} #{inspectLog.entity_id}</p>
              </div>
              <div>
                <p className="text-slate-400 uppercase font-semibold">Timestamp</p>
                <p className="font-mono text-slate-700 mt-0.5">{new Date(inspectLog.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Actor & Reason */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                <span><strong>Actor:</strong> {inspectLog.user_name} ({inspectLog.user_role})</span>
                <span><strong>IP Address:</strong> {inspectLog.ip_address || '127.0.0.1'}</span>
              </div>
              {inspectLog.reason && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                  <strong className="block text-amber-800 mb-0.5">Recorded Business Reason / Override Justification:</strong>
                  {inspectLog.reason}
                </div>
              )}
            </div>

            {/* Diffs & Payload */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Code2 className="w-4 h-4 text-indigo-600" />
                <span>State Payload & Mutation Diff</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Old State */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-500">Prior State (Old Values)</div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 text-xs font-mono rounded-lg overflow-x-auto max-h-60 border border-slate-800">
                    {formatJSON(inspectLog.old_values) || '// No previous state recorded'}
                  </pre>
                </div>

                {/* New State */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-500">Committed State (New Values)</div>
                  <pre className="p-3 bg-slate-900 text-indigo-300 text-xs font-mono rounded-lg overflow-x-auto max-h-60 border border-slate-800">
                    {formatJSON(inspectLog.new_values) || '// No mutation payload'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setInspectLog(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
