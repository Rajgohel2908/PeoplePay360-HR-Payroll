// client/src/components/ui/PaginationControls.jsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PaginationControls({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  className = '',
  itemLabel = 'records'
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const fromIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className={`px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/40 ${className}`}>
      <div>
        Showing <span className="font-semibold text-slate-700">{fromIndex}</span> to{' '}
        <span className="font-semibold text-slate-700">{toIndex}</span> of{' '}
        <span className="font-semibold text-slate-700">{totalItems}</span> {itemLabel}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-semibold text-slate-800">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default PaginationControls;
