// client/src/pages/reports/ReportsDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Download,
  Calendar,
  Building,
  Users,
  Clock,
  Palmtree,
  FileSignature,
  FileText
} from 'lucide-react';
import api from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { useNotifications } from '../../contexts/NotificationContext';

export function ReportsDashboard() {
  const [activeReport, setActiveReport] = useState('payroll-summary');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  const { showSuccess, showError } = useNotifications();

  const loadReport = async (reportType) => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${reportType}`);
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const handleExportCsv = () => {
    if (!reportData || reportData.length === 0) {
      showError('No data available to export.');
      return;
    }

    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map(row =>
      Object.values(row).map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PeoplePay360_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Report exported successfully to CSV.');
  };

  const reportTabs = [
    { id: 'payroll-summary', label: 'Payroll Summary', icon: FileBarChart2 },
    { id: 'department-cost', label: 'Department Payroll Cost', icon: Building },
    { id: 'attendance', label: 'Attendance Health', icon: Clock },
    { id: 'leave', label: 'Leave Ledger & Balances', icon: Palmtree },
    { id: 'contracts-expiry', label: 'Contract Expiry Report', icon: FileSignature }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Analytics & Regulatory Reporting
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate compliant financial summaries, department compensation breakdowns, and export datasets
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Download}
          onClick={handleExportCsv}
          disabled={loading || reportData.length === 0}
        >
          Export Current View (CSV)
        </Button>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Data Table Container */}
      <Card noPadding>
        <div className="overflow-x-auto">
          {activeReport === 'payroll-summary' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Payrun Ref</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Employees</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Payout</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.payrun_number}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(row.period_start)} &rarr; {formatDate(row.period_end)}</td>
                    <td className="py-3 px-4 font-bold">{row.total_employees}</td>
                    <td className="py-3 px-4 font-semibold">{formatCurrency(row.total_gross)}</td>
                    <td className="py-3 px-4 font-semibold text-red-600">{formatCurrency(row.total_deductions)}</td>
                    <td className="py-3 px-4 font-black text-emerald-700">{formatCurrency(row.total_net)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={row.status === 'paid' ? 'success' : 'warning'} size="sm">
                        {row.status?.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'department-cost' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Cost Center</th>
                  <th className="py-3 px-4">Headcount</th>
                  <th className="py-3 px-4">Total Monthly Wage</th>
                  <th className="py-3 px-4">Average Wage</th>
                  <th className="py-3 px-4">Wage Range (Min - Max)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{row.department_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{row.department_code}</td>
                    <td className="py-3 px-4 font-bold">{row.employee_count} Staff</td>
                    <td className="py-3 px-4 font-black text-emerald-700">{formatCurrency(row.total_monthly_wage)}</td>
                    <td className="py-3 px-4 font-semibold">{formatCurrency(row.average_wage)}</td>
                    <td className="py-3 px-4 text-slate-600">{formatCurrency(row.min_wage)} &ndash; {formatCurrency(row.max_wage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'attendance' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Days Logged</th>
                  <th className="py-3 px-4">Present</th>
                  <th className="py-3 px-4">Late Arrivals</th>
                  <th className="py-3 px-4">Missing Checkouts</th>
                  <th className="py-3 px-4">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{row.employee_name} ({row.emp_code})</td>
                    <td className="py-3 px-4 text-slate-600">{row.department_name}</td>
                    <td className="py-3 px-4">{row.total_days_logged}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{row.present_days}</td>
                    <td className="py-3 px-4 font-semibold text-amber-600">{row.late_days}</td>
                    <td className="py-3 px-4 font-bold text-red-600">{row.missing_checkouts}</td>
                    <td className="py-3 px-4 font-black">{row.total_worked_hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'leave' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Allocated</th>
                  <th className="py-3 px-4">Used</th>
                  <th className="py-3 px-4">Pending</th>
                  <th className="py-3 px-4 font-bold text-emerald-700">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{row.employee_name} ({row.emp_code})</td>
                    <td className="py-3 px-4 text-slate-600">{row.department_name}</td>
                    <td className="py-3 px-4 font-semibold">{row.leave_type}</td>
                    <td className="py-3 px-4">{row.allocated_days}d</td>
                    <td className="py-3 px-4">{row.used_days}d</td>
                    <td className="py-3 px-4">{row.pending_days}d</td>
                    <td className="py-3 px-4 font-black text-emerald-700">{row.remaining_days} Days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'contracts-expiry' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Contract Code</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Wage</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.contract_id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.employee_name} ({row.emp_code})</td>
                    <td className="py-3 px-4 text-slate-600">{row.department_name} • {row.position_title}</td>
                    <td className="py-3 px-4">{formatDate(row.start_date)}</td>
                    <td className="py-3 px-4 font-bold text-red-600">{formatDate(row.end_date)}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">{formatCurrency(row.wage)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={row.status === 'active' ? 'success' : 'danger'} size="sm" dot>
                        {row.status?.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ReportsDashboard;
