// client/src/components/ui/Badge.jsx
import React from 'react';

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
  icon: Icon
}) {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  };

  const dots = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500'
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 font-semibold gap-1',
    md: 'text-xs px-2.5 py-1 font-medium gap-1.5',
    lg: 'text-sm px-3 py-1.5 font-medium gap-2'
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${variants[variant] || variants.neutral} ${sizes[size] || sizes.md} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[variant] || dots.neutral}`} />}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}

export default Badge;
