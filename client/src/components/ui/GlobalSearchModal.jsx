// client/src/components/ui/GlobalSearchModal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, FileText, IndianRupee, Calendar, ArrowRight, X } from 'lucide-react';
import api from '../../api/client';

export function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/admin/search?q=${encodeURIComponent(query)}`);
        if (res.success) {
          setResults(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-start justify-center pt-20 p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
          {/* Search Input Bar */}
          <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
            <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees, contracts, payruns, payslips (e.g. EMP-1014, Rahul, PR-2026)..."
              className="w-full text-sm bg-transparent border-none text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-white border border-slate-200 rounded">
              ESC
            </kbd>
          </div>

          {/* Results Container */}
          <div className="max-h-96 overflow-y-auto p-4 space-y-4 text-xs">
            {loading && (
              <div className="py-8 text-center text-slate-400">Searching platform database...</div>
            )}

            {!loading && !results && (
              <div className="py-8 text-center text-slate-400">
                Type at least 2 characters to search across the entire HR & Payroll system.
              </div>
            )}

            {!loading && results && (
              <>
                {/* Employees */}
                {results.employees?.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                      Employees ({results.employees.length})
                    </h5>
                    <div className="space-y-1">
                      {results.employees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => handleNavigate(`/employees/360/${emp.id}`)}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                              {emp.first_name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 group-hover:text-emerald-900">
                                {emp.first_name} {emp.last_name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {emp.employee_id} • {emp.department_name} • {emp.position_title}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contracts */}
                {results.contracts?.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                      Contracts ({results.contracts.length})
                    </h5>
                    <div className="space-y-1">
                      {results.contracts.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleNavigate(`/contracts`)}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="font-semibold text-slate-900">{c.contract_id} ({c.first_name} {c.last_name})</p>
                              <p className="text-[11px] text-slate-500">Wage: ₹{parseFloat(c.wage).toLocaleString('en-IN')} • Status: {c.status}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payruns */}
                {results.payruns?.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                      Payruns ({results.payruns.length})
                    </h5>
                    <div className="space-y-1">
                      {results.payruns.map((pr) => (
                        <div
                          key={pr.id}
                          onClick={() => handleNavigate(`/payroll/${pr.id}`)}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <div>
                              <p className="font-semibold text-slate-900">{pr.payrun_number} - {pr.title}</p>
                              <p className="text-[11px] text-slate-500">Net: ₹{parseFloat(pr.total_net).toLocaleString('en-IN')} • Status: {pr.status}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payslips */}
                {results.payslips?.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                      Payslips ({results.payslips.length})
                    </h5>
                    <div className="space-y-1">
                      {results.payslips.map((ps) => (
                        <div
                          key={ps.id}
                          onClick={() => handleNavigate(`/payslips/${ps.id}`)}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <IndianRupee className="w-4 h-4 text-sky-600" />
                            <div>
                              <p className="font-semibold text-slate-900">{ps.payslip_number} ({ps.first_name} {ps.last_name})</p>
                              <p className="text-[11px] text-slate-500">Net Pay: ₹{parseFloat(ps.net_salary).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.employees?.length === 0 && results.contracts?.length === 0 && results.payruns?.length === 0 && results.payslips?.length === 0 && (
                  <div className="py-8 text-center text-slate-500">
                    No results found for "{query}".
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GlobalSearchModal;
