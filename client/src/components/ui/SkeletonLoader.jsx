// client/src/components/ui/SkeletonLoader.jsx
import React from 'react';

export function SkeletonLoader({ className = 'h-4 w-full', rounded = 'rounded' }) {
  return <div className={`animate-pulse bg-slate-200/80 ${rounded} ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-white border border-slate-200 rounded-xl" />
        <div className="h-80 bg-white border border-slate-200 rounded-xl" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 animate-pulse">
      <div className="h-8 bg-slate-100 rounded w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-50 border border-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}

export const SkeletonTable = TableSkeleton;
export const SkeletonDashboard = DashboardSkeleton;

export default SkeletonLoader;
