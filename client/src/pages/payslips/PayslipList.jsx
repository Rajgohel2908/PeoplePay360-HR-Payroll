// client/src/pages/payslips/PayslipList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Mail,
  Search,
  CheckCircle2,
  FileText,
  Eye,
  Calendar
} from 'lucide-react';
import api from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function PayslipList() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const { showSuccess, showError } = useNotifications();
  const { user, isEmployeeOnly } = useAuth();
  const navigate = useNavigate();

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payslips?page=${pagination.page}&limit=${pagination.limit}&search=${encodeURIComponent(search)}`);
      if (res.success) {
        setPayslips(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      showError(err.message || 'Failed to load payslips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayslips();
  }, [pagination.page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPayslips();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDownloadPdf = (id) => {
    // Navigate to the payslip detail page where the pixel-perfect
    // client-side html2canvas export is available
    navigate(`/payslips/${id}`);
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const columns = [
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
      header: 'Period',
      accessor: 'period_start',
      cell: (row) => (
        <span className="text-xs text-slate-700 font-medium">{formatDate(row.period_start)} &rarr; {formatDate(row.period_end)}</span>
      )
    },
    {
      header: 'Gross Salary',
      accessor: 'gross_salary',
      cell: (row) => <span className="font-semibold text-slate-800">{formatCurrency(row.gross_salary)}</span>
    },
    {
      header: 'Deductions',
      accessor: 'total_deductions',
      cell: (row) => <span className="font-semibold text-red-600">{formatCurrency(row.total_deductions)}</span>
    },
    {
      header: 'Net Disbursed',
      accessor: 'net_salary',
      cell: (row) => <span className="font-black text-emerald-700 text-sm">{formatCurrency(row.net_salary)}</span>
    },
    {
      header: 'Status',
      accessor: 'payment_status',
      cell: (row) => (
        <Badge variant={row.payment_status === 'Paid' ? 'success' : 'warning'} size="sm" dot>
          {row.payment_status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            icon={Download}
            onClick={() => handleDownloadPdf(row.id)}
          >
            PDF
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate(`/payslips/${row.id}`)}
            className="text-emerald-600 hover:text-emerald-700"
          >
            View &rarr;
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
            Payslip Directory & Records
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Archived digital payslip receipts, calculation breakdowns, and printable PDF documents
          </p>
        </div>
      </div>

      {/* Payslips Table */}
      <DataTable
        columns={columns}
        data={payslips}
        loading={loading}
        searchPlaceholder="Search payslips by employee name, ID, or receipt number..."
        searchValue={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
      />
    </div>
  );
}

export default PayslipList;
