// client/src/components/ui/Badge.jsx
import React from 'react';

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
  icon
}) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComponent = icon;
    return <IconComponent className="w-3.5 h-3.5 shrink-0" />;
  };

  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200/80',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/70',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/70',
    info: 'bg-sky-50 text-sky-700 border-sky-200/70',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/70',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
    primary: 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
  };

  const dots = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    primary: 'bg-emerald-500'
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 font-semibold gap-1',
    sm: 'text-[11px] px-2 py-0.5 font-medium gap-1',
    md: 'text-xs px-2.5 py-0.5 font-medium gap-1.5',
    lg: 'text-sm px-3 py-1 font-medium gap-2'
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${variants[variant] || variants.neutral} ${sizes[size] || sizes.md} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[variant] || dots.neutral}`} />}
      {icon && renderIcon()}
      {children}
    </span>
  );
}

export default Badge;
