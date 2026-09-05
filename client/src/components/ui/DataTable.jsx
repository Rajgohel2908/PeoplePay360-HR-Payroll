// client/src/components/ui/DataTable.jsx
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import EmptyState from './EmptyState';

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  pagination,
  onPageChange,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display matching your criteria.',
  emptyAction,
  filters,
  bulkActions,
  className = ''
}) {
  const [localSearch, setLocalSearch] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (colKey) => {
    if (sortColumn === colKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  const effectiveSearch = searchValue !== undefined ? searchValue : localSearch;

  let filteredData = [...data];
  if (!onSearchChange && effectiveSearch) {
    const term = effectiveSearch.toLowerCase();
    filteredData = filteredData.filter(row => {
      return columns.some(col => {
        const val = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : '';
        return String(val || '').toLowerCase().includes(term);
      });
    });
  }

  if (sortColumn) {
    filteredData.sort((a, b) => {
      const col = columns.find(c => c.key === sortColumn || c.accessor === sortColumn);
      const valA = col?.accessor ? (typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor]) : a[sortColumn];
      const valB = col?.accessor ? (typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor]) : b[sortColumn];

      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      const res = valA < valB ? -1 : 1;
      return sortDirection === 'asc' ? res : -res;
    });
  }

  const allSelected = data.length > 0 && selectedRows.length === data.length;

  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden ${className}`}>
      {/* Top Controls Bar */}
      {(searchable || filters || bulkActions) && (
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={effectiveSearch}
                onChange={(e) => {
                  if (onSearchChange) onSearchChange(e.target.value);
                  else setLocalSearch(e.target.value);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Bulk actions banner if items selected */}
          {selectedRows.length > 0 && bulkActions && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200">
              <span>{selectedRows.length} selected</span>
              {bulkActions}
            </div>
          )}

          {filters && <div className="flex items-center gap-2 overflow-x-auto">{filters}</div>}
        </div>
      )}

      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider font-semibold text-slate-600">
              {selectable && (
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col, idx) => {
                const isSortable = col.sortable !== false;
                const colKey = col.key || col.accessor;
                const isSorted = sortColumn === colKey;

                return (
                  <th
                    key={colKey || idx}
                    className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${isSortable ? 'cursor-pointer select-none hover:bg-slate-100/80 transition-colors' : ''} ${col.headerClassName || ''}`}
                    onClick={() => isSortable && handleSort(colKey)}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end w-full' : ''}`}>
                      <span>{col.header}</span>
                      {isSortable && (
                        <div className="flex flex-col text-slate-400">
                          {isSorted ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 opacity-40" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 6 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {selectable && <td className="px-4 py-4 text-center"><div className="w-4 h-4 bg-slate-200 rounded mx-auto" /></td>}
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 px-4 text-center">
                  <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              filteredData.map((row, rIdx) => {
                const isSelected = selectedRows.includes(row.id);
                return (
                  <tr
                    key={row.id || rIdx}
                    className={`hover:bg-slate-50/80 transition-colors duration-100 ${isSelected ? 'bg-emerald-50/40' : ''}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectRow && onSelectRow(row.id, e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col, cIdx) => {
                      const colKey = col.key || col.accessor;
                      const cellValue = col.cell ? col.cell(row) : (col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : null);

                      return (
                        <td
                          key={colKey || cIdx}
                          className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40">
          <div>
            Showing <span className="font-semibold text-slate-700">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-semibold text-slate-700">{pagination.total}</span> records
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-semibold text-slate-800">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
