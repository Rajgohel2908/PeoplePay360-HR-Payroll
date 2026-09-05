// client/src/components/ui/EmptyState.jsx
import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No data found',
  description = 'There are no items matching your criteria or currently available.',
  action,
  className = ''
}) {
  return (
    <div className={`text-center py-12 px-4 max-w-sm mx-auto flex flex-col items-center justify-center ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
