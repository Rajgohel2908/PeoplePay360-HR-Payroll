// client/src/pages/payroll/PayrunList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  Play,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Receipt,
  FileCheck
} from 'lucide-react';
import api from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, StatCard } from '../../components/ui/Card';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function PayrunList() {
  const [payruns, setPayruns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useNotifications();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const loadPayruns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payruns');
      if (res.success) {
        setPayruns(res.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to load payruns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayruns();
  }, []);

  const handleTriggerCompute = async (id) => {
    try {
      const res = await api.post(`/payruns/${id}/compute`);
      if (res.success) {
        showSuccess(res.message);
        loadPayruns();
      }
    } catch (err) {
      showError(err.message || 'Failed to compute payrun.');
    }
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" dot icon={Lock}>PAID & LOCKED</Badge>;
      case 'approved':
        return <Badge variant="emerald" dot icon={CheckCircle2}>APPROVED</Badge>;
      case 'validation_required':
        return <Badge variant="danger" dot icon={AlertTriangle}>VALIDATION REQUIRED</Badge>;
      case 'computed':
        return <Badge variant="info" dot>COMPUTED</Badge>;
      case 'draft':
        return <Badge variant="neutral" dot>DRAFT</Badge>;
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Payrun Ref & Title',
      accessor: 'payrun_number',
      cell: (row) => (
        <div
          className="cursor-pointer group"
          onClick={() => navigate(`/payroll/${row.id}`)}
        >
          <p className="font-bold font-mono text-xs text-slate-900 group-hover:text-emerald-600 transition-colors">
            {row.payrun_number}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-0.5">{row.title}</p>
        </div>
      )
    },
    {
      header: 'Payroll Period',
      accessor: 'period_start',
      cell: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-900">{row.period_start}</span>
          <span className="text-slate-400 mx-1.5">&rarr;</span>
          <span className="font-semibold text-slate-900">{row.period_end}</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{row.total_employees} Employees Included</p>
        </div>
      )
    },
    {
      header: 'Financial Totals',
      accessor: 'total_net',
      cell: (row) => (
        <div className="text-xs">
          <p className="font-black text-emerald-700 text-sm">{formatCurrency(row.total_net)}</p>
          <p className="text-[10px] text-slate-500 font-mono">Gross: {formatCurrency(row.total_gross)} | Ded: {formatCurrency(row.total_deductions)}</p>
        </div>
      )
    },
    {
      header: 'Pre-Flight Health',
      accessor: 'blockersCount',
      cell: (row) => {
        const hasBlockers = row.blockersCount > 0;
        const hasWarnings = row.warningsCount > 0;

        if (row.status === 'paid') {
          return (
            <Badge variant="success" size="sm" icon={CheckCircle2}>
              Audited & Finalized
            </Badge>
          );
        }

        return (
          <div
            className="flex items-center gap-1.5 cursor-pointer"
            onClick={() => navigate(`/payroll/validation/${row.id}`)}
          >
            {hasBlockers ? (
              <Badge variant="danger" size="sm" icon={AlertCircle}>
                {row.blockersCount} Blocker{row.blockersCount > 1 ? 's' : ''}
              </Badge>
            ) : hasWarnings ? (
              <Badge variant="warning" size="sm" icon={AlertTriangle}>
                {row.warningsCount} Warning{row.warningsCount > 1 ? 's' : ''}
              </Badge>
            ) : (
              <Badge variant="success" size="sm" icon={CheckCircle2}>
                All Checks Passed
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'draft' && hasRole(['admin', 'payroll_manager', 'payroll_user']) && (
            <Button
              variant="primary"
              size="xs"
              icon={Play}
              onClick={() => handleTriggerCompute(row.id)}
            >
              Compute
            </Button>
          )}

          {row.status === 'validation_required' && (
            <Button
              variant="danger"
              size="xs"
              icon={ShieldCheck}
              onClick={() => navigate(`/payroll/validation/${row.id}`)}
            >
              Validation Center
            </Button>
          )}

          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate(`/payroll/${row.id}`)}
            className="text-emerald-600 hover:text-emerald-700"
          >
            Details &rarr;
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payrun Management & Cycles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Execute batch payroll computation, pre-flight validation rules, approval gates, and disbursement locking
          </p>
        </div>

        {hasRole(['admin', 'payroll_manager', 'payroll_user']) && (
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/payroll/wizard')}
          >
            Create Payrun Wizard
          </Button>
        )}
      </div>

      {/* Payrun Table */}
      <DataTable
        columns={columns}
        data={payruns}
        loading={loading}
        searchPlaceholder="Search payruns by title or ref number..."
      />
    </div>
  );
}

export default PayrunList;
