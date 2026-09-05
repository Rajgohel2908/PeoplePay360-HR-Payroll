// client/src/pages/payslips/PayslipDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Receipt,
  Download,
  Printer,
  ArrowLeft,
  Building,
  CheckCircle2,
  Calendar,
  User,
  CreditCard,
  Lock,
  Mail
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../../components/ui/Logo';

export function PayslipDetail() {
  const { id } = useParams();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);

  const { showSuccess, showError } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadPayslip() {
      setLoading(true);
      try {
        const res = await api.get(`/payslips/${id}`);
        if (res.success) {
          setPayslip(res.data);
        }
      } catch (err) {
        showError(err.message || 'Failed to load payslip.');
      } finally {
        setLoading(false);
      }
    }
    loadPayslip();
  }, [id]);

  const handleDownloadPdf = async () => {
    try {
      const blob = await api.downloadPdf(`/payslips/${id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip-${payslip.payslip_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess(`Downloaded Payslip-${payslip.payslip_number}.pdf`);
    } catch (err) {
      showError(err.message || 'Failed to download PDF.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !payslip) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Rendering confidential payslip...</p>
      </div>
    );
  }

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const earnings = payslip.earnings || [];
  const deductions = payslip.deductions || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action Controls Header (Hidden on Print) */}
      <div className="no-print flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Records
        </button>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={Printer} onClick={handlePrint}>
            Print Payslip
          </Button>
          <Button variant="primary" size="sm" icon={Download} onClick={handleDownloadPdf}>
            Download Official PDF
          </Button>
        </div>
      </div>

      {/* Printable Payslip Card Document */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl p-6 sm:p-10 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="bg-slate-900 text-white p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Logo variant="dark" size="sm" className="h-8 w-auto" />
            </div>
            <p className="text-xs text-slate-300 font-medium">PeoplePay Global Technologies Ltd.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Level 14, Prestige Tech Park, Outer Ring Road, Bengaluru &bull; GST: 29ABCDE1234F1Z5</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-slate-800 text-sky-400 border border-slate-700 block sm:inline-block">
              CONFIDENTIAL PAYSLIP
            </span>
            <p className="text-xs text-slate-300 font-mono mt-1">Ref: <b>{payslip.payslip_number}</b></p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">Payment Status: {payslip.payment_status}</p>
          </div>
        </div>

        {/* Employee & Payroll Period Summary Grid */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Employee Name</p>
              <p className="font-bold text-slate-900 mt-0.5 text-sm">{payslip.first_name} {payslip.last_name}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Employee ID</p>
              <p className="font-bold text-slate-900 font-mono mt-0.5">{payslip.emp_code}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Department</p>
              <p className="font-bold text-slate-900 mt-0.5">{payslip.department_name}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Designation</p>
              <p className="font-bold text-slate-900 mt-0.5">{payslip.position_title}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Payroll Period</p>
              <p className="font-bold text-slate-900 mt-0.5">{payslip.period_start} &rarr; {payslip.period_end}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Bank Account</p>
              <p className="font-bold text-slate-900 font-mono mt-0.5">
                {payslip.bank_name || 'N/A'} {payslip.account_number ? `(••••${payslip.account_number.slice(-4)})` : ''}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">PAN / UAN</p>
              <p className="font-bold text-slate-900 font-mono mt-0.5">{payslip.pan_number || 'N/A'} / {payslip.uan_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Worked / Paid Days</p>
              <p className="font-bold text-slate-900 mt-0.5">{payslip.worked_days} / {payslip.paid_days} Days (LOP: {payslip.unpaid_days})</p>
            </div>
          </div>
        </div>

        {/* 2-Column Earnings & Deductions Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings Column */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-sky-600 text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span>EARNINGS COMPONENT</span>
              <span>AMOUNT (₹)</span>
            </div>
            <div className="p-4 space-y-2 text-xs divide-y divide-slate-100">
              {earnings.map((e, idx) => (
                <div key={idx} className="flex items-center justify-between pt-2 first:pt-0">
                  <span className="text-slate-700 font-medium">{e.rule_name}</span>
                  <span className="font-bold font-mono text-slate-900">{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between font-bold text-xs text-slate-900">
              <span>TOTAL GROSS EARNINGS</span>
              <span className="text-sm font-black text-sky-700 font-mono">{formatCurrency(payslip.gross_salary)}</span>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span>DEDUCTIONS COMPONENT</span>
              <span>AMOUNT (₹)</span>
            </div>
            <div className="p-4 space-y-2 text-xs divide-y divide-slate-100">
              {deductions.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between pt-2 first:pt-0">
                  <span className="text-slate-700 font-medium">{d.rule_name}</span>
                  <span className="font-bold font-mono text-red-600">{formatCurrency(d.amount)}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between font-bold text-xs text-slate-900">
              <span>TOTAL DEDUCTIONS</span>
              <span className="text-sm font-black text-red-700 font-mono">{formatCurrency(payslip.total_deductions)}</span>
            </div>
          </div>
        </div>

        {/* Net Salary Payable Callout Banner */}
        <div className="bg-emerald-50/90 border-2 border-emerald-500 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Net Salary Payable (Direct Bank Deposit)
            </span>
            <p className="text-3xl font-black text-emerald-950 font-mono mt-1">
              {formatCurrency(payslip.net_salary)}
            </p>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              Disbursed via Electronic Fund Transfer to {payslip.bank_name || 'Bank Account'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <Badge variant="success" size="lg" icon={CheckCircle2}>
              {payslip.payment_status}
            </Badge>
            <p className="text-[10px] text-slate-400 mt-1">System Generated Receipt</p>
          </div>
        </div>

        {/* Legal Disclaimer & Footer */}
        <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400">
          <p>This is a computer-generated confidential payslip issued by PeoplePay360 HR & Payroll Engine and requires no physical signature.</p>
          <p className="mt-0.5">Corporate ID: 29ABCDE1234F1Z5 &bull; Bengaluru, India</p>
        </div>
      </div>
    </div>
  );
}

export default PayslipDetail;
