// client/src/pages/reports/ReportsDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
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
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useNotifications } from '../../contexts/NotificationContext';
import { exportTableAsCsv, exportElementAsPdf, formatINR, formatExportDate } from '../../utils/exportUtils';

export function ReportsDashboard() {
  const [activeReport, setActiveReport] = useState('payroll-summary');
  const [reportData, setReportData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef(null);

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
    setCurrentPage(1);
    loadReport(activeReport);
  }, [activeReport]);

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  // Column definitions for each report type (used for CSV export)
  const reportColumnDefs = {
    'payroll-summary': [
      { key: 'payrun_number', header: 'Payrun Reference' },
      { key: 'period_start', header: 'Period Start', format: formatExportDate },
      { key: 'period_end', header: 'Period End', format: formatExportDate },
      { key: 'total_employees', header: 'Total Employees' },
      { key: 'total_gross', header: 'Total Gross (₹)', format: (v) => formatINR(v) },
      { key: 'total_deductions', header: 'Total Deductions (₹)', format: (v) => formatINR(v) },
      { key: 'total_net', header: 'Net Payout (₹)', format: (v) => formatINR(v) },
      { key: 'status', header: 'Status', format: (v) => (v || '').toUpperCase() }
    ],
    'department-cost': [
      { key: 'department_name', header: 'Department' },
      { key: 'department_code', header: 'Cost Center' },
      { key: 'employee_count', header: 'Headcount' },
      { key: 'total_monthly_wage', header: 'Total Monthly Wage (₹)', format: (v) => formatINR(v) },
      { key: 'average_wage', header: 'Average Wage (₹)', format: (v) => formatINR(v) },
      { key: 'min_wage', header: 'Min Wage (₹)', format: (v) => formatINR(v) },
      { key: 'max_wage', header: 'Max Wage (₹)', format: (v) => formatINR(v) }
    ],
    'attendance': [
      { key: 'employee_name', header: 'Employee' },
      { key: 'emp_code', header: 'Employee ID' },
      { key: 'department_name', header: 'Department' },
      { key: 'total_days_logged', header: 'Days Logged' },
      { key: 'present_days', header: 'Present Days' },
      { key: 'late_days', header: 'Late Arrivals' },
      { key: 'missing_checkouts', header: 'Missing Checkouts' },
      { key: 'total_worked_hours', header: 'Total Hours Worked' }
    ],
    'leave': [
      { key: 'employee_name', header: 'Employee' },
      { key: 'emp_code', header: 'Employee ID' },
      { key: 'department_name', header: 'Department' },
      { key: 'leave_type', header: 'Leave Type' },
      { key: 'allocated_days', header: 'Allocated Days' },
      { key: 'used_days', header: 'Used Days' },
      { key: 'pending_days', header: 'Pending Days' },
      { key: 'remaining_days', header: 'Remaining Balance' }
    ],
    'contracts-expiry': [
      { key: 'contract_id', header: 'Contract Code' },
      { key: 'employee_name', header: 'Employee' },
      { key: 'emp_code', header: 'Employee ID' },
      { key: 'department_name', header: 'Department' },
      { key: 'position_title', header: 'Role' },
      { key: 'start_date', header: 'Start Date', format: formatExportDate },
      { key: 'end_date', header: 'Expiry Date', format: formatExportDate },
      { key: 'wage', header: 'Wage (₹)', format: (v) => formatINR(v) },
      { key: 'status', header: 'Status', format: (v) => (v || '').toUpperCase() }
    ]
  };

  const handleExportCsv = () => {
    try {
      const columns = reportColumnDefs[activeReport];
      if (!columns) {
        showError('No column definition for this report.');
        return;
      }
      const filename = `PeoplePay360_${activeReport}_${new Date().toISOString().slice(0, 10)}`;
      exportTableAsCsv(reportData, columns, filename);
      showSuccess('Report exported successfully to CSV.');
    } catch (err) {
      showError(err.message || 'Failed to export CSV.');
    }
  };

  const handleExportPdf = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const filename = `PeoplePay360_${activeReport}_${new Date().toISOString().slice(0, 10)}`;
      await exportElementAsPdf(tableRef.current, filename, { orientation: 'landscape' });
      showSuccess('Report exported as PDF successfully.');
    } catch (err) {
      showError(err.message || 'Failed to export PDF.');
    } finally {
      setExporting(false);
    }
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={FileText}
            loading={exporting}
            onClick={handleExportPdf}
            disabled={loading || reportData.length === 0}
          >
            {exporting ? 'Exporting...' : 'Export as PDF'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={handleExportCsv}
            disabled={loading || reportData.length === 0}
          >
            Export CSV
          </Button>
        </div>
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
      {(() => {
        const paginatedData = reportData.slice((currentPage - 1) * 10, currentPage * 10);
        return (
          <Card noPadding>
            <div ref={tableRef} className="overflow-x-auto" data-export-id="report-table">
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
                {paginatedData.map((row, idx) => (
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
                {paginatedData.map((row, idx) => (
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
                {paginatedData.map((row, idx) => (
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
                {paginatedData.map((row, idx) => (
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
                {paginatedData.map((row, idx) => (
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
            <PaginationControls
              currentPage={currentPage}
              pageSize={10}
              totalItems={reportData.length}
              onPageChange={setCurrentPage}
              itemLabel="records"
            />
          </Card>
        );
      })()}
    </div>
  );
}

export default ReportsDashboard;
