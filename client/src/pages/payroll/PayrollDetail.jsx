// client/src/pages/payroll/PayrollDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Play,
  Download,
  Mail,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import api from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function PayrollDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payslips'); // 'payslips' | 'variances'
  const [variancePage, setVariancePage] = useState(1);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailProgress, setEmailProgress] = useState(null);
  const [emailing, setEmailing] = useState(false);

  const { showSuccess, showError } = useNotifications();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const loadPayrunDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payruns/${id}`);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to load payrun details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrunDetail();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading payrun financial records...</p>
      </div>
    );
  }

  const { payrun, validation, variances, payslips } = data;
  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const handleCompute = async () => {
    try {
      const res = await api.post(`/payruns/${id}/compute`);
      if (res.success) {
        showSuccess(res.message);
        loadPayrunDetail();
      }
    } catch (err) {
      showError(err.message || 'Failed to compute payrun.');
    }
  };

  const handleApprove = async () => {
    try {
      const res = await api.post(`/payruns/${id}/approve`);
      if (res.success) {
        showSuccess('Payrun approved successfully!');
        setShowApproveConfirm(false);
        loadPayrunDetail();
      }
    } catch (err) {
      showError(err.message || 'Approval failed.');
    }
  };

  const handleMarkPaid = async () => {
    try {
      const res = await api.post(`/payruns/${id}/pay`, {});
      if (res.success) {
        showSuccess('Payrun marked as PAID and locked successfully!');
        setShowPayConfirm(false);
        loadPayrunDetail();
      }
    } catch (err) {
      showError(err.message || 'Payment mark failed.');
    }
  };

  const handleSendBulkEmails = async () => {
    setEmailing(true);
    try {
      const res = await api.post('/payslips/send-emails', { payrun_id: id });
      if (res.success) {
        setEmailProgress(res.data);
        showSuccess(`Bulk payslip emails dispatched: ${res.data.sent} sent successfully!`);
        loadPayrunDetail();
      }
    } catch (err) {
      showError(err.message || 'Failed to send bulk emails.');
    } finally {
      setEmailing(false);
    }
  };

  const isPaid = payrun.status === 'paid';
  const isApproved = payrun.status === 'approved';
  const hasBlockers = validation.blockersCount > 0;

  const payslipColumns = [
    {
      header: 'Payslip Ref',
      accessor: 'payslip_number',
      cell: (row) => (
        <span
          className="font-mono font-bold text-xs text-slate-900 cursor-pointer hover:text-emerald-600"
          onClick={() => navigate(`/payslips/${row.id}`)}
        >
          {row.payslip_number}
        </span>
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
            <p className="text-[10px] text-slate-400 font-mono">{row.emp_code} • {row.department_name}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Gross Salary',
      accessor: 'gross_salary',
      cell: (row) => <span className="font-semibold text-slate-800">{formatCurrency(row.gross_salary)}</span>
    },
    {
      header: 'Total Deductions',
      accessor: 'total_deductions',
      cell: (row) => <span className="font-semibold text-red-600">{formatCurrency(row.total_deductions)}</span>
    },
    {
      header: 'Net Disbursed',
      accessor: 'net_salary',
      cell: (row) => <span className="font-black text-emerald-700 text-sm">{formatCurrency(row.net_salary)}</span>
    },
    {
      header: 'Payment / Email',
      accessor: 'payment_status',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={row.payment_status === 'Paid' ? 'success' : 'warning'} size="sm" dot>
            {row.payment_status}
          </Badge>
          <Badge variant={row.email_status === 'Sent' ? 'info' : 'neutral'} size="sm">
            {row.email_status}
          </Badge>
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate(`/payslips/${row.id}`)}
            className="text-emerald-600 hover:text-emerald-700"
          >
            Payslip &rarr;
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/payroll')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payruns List
        </button>

        {/* Dynamic Action Buttons based on Payrun State Machine */}
        <div className="flex items-center gap-2">
          {!isPaid && (
            <Button
              variant="outline"
              size="sm"
              icon={Play}
              onClick={handleCompute}
            >
              Recompute Batch
            </Button>
          )}

          {!isPaid && (
            <Button
              variant={hasBlockers ? 'danger' : 'outline'}
              size="sm"
              icon={ShieldCheck}
              onClick={() => navigate(`/payroll/validation/${id}`)}
            >
              Validation Center ({validation.blockersCount} Blockers)
            </Button>
          )}

          {!isApproved && !isPaid && hasRole(['admin', 'payroll_manager']) && (
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              disabled={hasBlockers}
              onClick={() => setShowApproveConfirm(true)}
            >
              Approve Payrun
            </Button>
          )}

          {isApproved && !isPaid && hasRole(['admin', 'payroll_manager']) && (
            <Button
              variant="secondary"
              size="sm"
              icon={Lock}
              onClick={() => setShowPayConfirm(true)}
              className="bg-emerald-700 text-white hover:bg-emerald-800 font-bold"
            >
              Mark Paid & Lock
            </Button>
          )}

          {isPaid && (
            <Button
              variant="primary"
              size="sm"
              icon={Mail}
              onClick={() => {
                setShowEmailModal(true);
                setEmailProgress(null);
              }}
            >
              Send Payslips by Email
            </Button>
          )}
        </div>
      </div>

      {/* Payrun Summary Card */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-card">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">{payrun.payrun_number}</span>
              <h1 className="text-2xl font-black text-slate-900">{payrun.title}</h1>
              <Badge variant={isPaid ? 'success' : isApproved ? 'emerald' : hasBlockers ? 'danger' : 'warning'} dot>
                {payrun.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Period: <b>{formatDate(payrun.period_start)}</b> to <b>{formatDate(payrun.period_end)}</b> &bull; Payment Target: <b>{payrun.payment_date ? formatDate(payrun.payment_date) : 'Pending'}</b> &bull; Scope: <b>{payrun.total_employees} Employees</b>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Net Payout</span>
              <p className="text-xl font-black text-emerald-700">{formatCurrency(payrun.total_net)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Breakdown KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Gross Earnings" value={formatCurrency(payrun.total_gross)} variant="blue" />
        <StatCard title="Total Deductions" value={formatCurrency(payrun.total_deductions)} variant="red" />
        <StatCard title="Net Disbursed" value={formatCurrency(payrun.total_net)} variant="emerald" />
        <StatCard title="Overtime & LOP" value={`${formatCurrency(payrun.total_overtime)} / -${formatCurrency(payrun.total_lop)}`} variant="purple" />
      </div>

      {/* Toggle View: Payslips vs Variances */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('payslips')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'payslips' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Generated Payslips ({payslips.length})
        </button>
        <button
          onClick={() => setActiveTab('variances')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'variances' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Period-over-Period Variances ({variances?.length || 0})
        </button>
      </div>

      {/* Tab 1: Payslips Table */}
      {activeTab === 'payslips' && (
        <DataTable
          columns={payslipColumns}
          data={payslips}
          loading={loading}
          searchPlaceholder="Search payslips by employee or code..."
        />
      )}

      {/* Tab 2: Variances Table */}
      {activeTab === 'variances' && (
        <Card title="Anomaly & Period-over-Period Variance Analysis">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Previous Net</th>
                  <th className="py-3 px-4">Current Net</th>
                  <th className="py-3 px-4">Delta Variance</th>
                  <th className="py-3 px-4">Flag / Category</th>
                  <th className="py-3 px-4">Reason & Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variances.slice((variancePage - 1) * 10, variancePage * 10).map((v) => (
                  <tr key={v.id} className={`hover:bg-slate-50 ${v.is_flagged ? 'bg-amber-50/40' : ''}`}>
                    <td className="py-3 px-4 font-bold text-slate-900">{v.first_name} {v.last_name}</td>
                    <td className="py-3 px-4 text-slate-600">{formatCurrency(v.prev_net)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(v.curr_net)}</td>
                    <td className="py-3 px-4 font-black">
                      <span className={v.delta_percentage >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {v.delta_percentage >= 0 ? `+${v.delta_percentage}%` : `${v.delta_percentage}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={v.is_flagged ? 'warning' : 'neutral'} size="sm">
                        {v.variance_category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs italic">{v.variance_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={variancePage}
            pageSize={10}
            totalItems={variances.length}
            onPageChange={setVariancePage}
            itemLabel="variances"
          />
        </Card>
      )}

      {/* Approve Payrun Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={handleApprove}
        title="Approve Payroll Cycle"
        message={`Are you sure you want to approve ${payrun.payrun_number} for ₹${parseFloat(payrun.total_net).toLocaleString('en-IN')}? This confirms all ${payrun.total_employees} payslips are verified and ready for disbursement.`}
        confirmText="Approve Payroll"
        confirmVariant="primary"
      />

      {/* Mark Paid Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showPayConfirm}
        onClose={() => setShowPayConfirm(false)}
        onConfirm={handleMarkPaid}
        title="Disburse & Lock Payroll as PAID"
        message={`WARNING: Marking ${payrun.payrun_number} as PAID will finalize financial disbursements and permanently lock this payroll cycle from normal modifications to maintain immutable audit integrity. Proceed?`}
        confirmText="Confirm & Mark Paid"
        confirmVariant="danger"
      />

      {/* Bulk Payslip Email Dispatch Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Send Bulk Payslips by Email"
        subtitle={`Dispatch official PDF payslips to all ${payslips.length} employees`}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <p className="font-bold">Email Dispatch Summary:</p>
            <p>&bull; Total Recipients: <b>{payslips.length} Staff</b></p>
            <p>&bull; Subject: "Your Payslip for {payrun.payrun_number} is Ready"</p>
            <p>&bull; Printable PDF will be securely generated and tracked in email delivery logs.</p>
          </div>

          {emailProgress && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <p className="font-bold text-emerald-700">✓ {emailProgress.sent} Emails Sent Successfully</p>
              {emailProgress.failed > 0 && (
                <p className="font-bold text-red-600">⚠ {emailProgress.failed} Failed (Missing or Invalid Email)</p>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowEmailModal(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              icon={Mail}
              loading={emailing}
              onClick={handleSendBulkEmails}
            >
              Send All Payslips Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default PayrollDetail;
