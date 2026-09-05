// client/src/components/ui/ToastContainer.jsx
import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useNotifications();

  if (!toasts || toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-500 shrink-0" />
  };

  const borders = {
    success: 'border-emerald-200 bg-white shadow-lg text-slate-800',
    error: 'border-red-200 bg-white shadow-lg text-slate-800',
    warning: 'border-amber-200 bg-white shadow-lg text-slate-800',
    info: 'border-sky-200 bg-white shadow-lg text-slate-800'
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border ${borders[toast.type] || borders.info} shadow-dropdown animate-slide-up transition-all duration-200`}
        >
          {icons[toast.type] || icons.info}
          <div className="flex-1 text-xs font-medium leading-tight">
            {toast.message}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
