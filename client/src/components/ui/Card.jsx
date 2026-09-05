// client/src/components/ui/Card.jsx
import React from 'react';

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerBorder = true,
  noPadding = false,
  ...props
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-card transition-shadow duration-200 ${className}`} {...props}>
      {(title || action) && (
        <div className={`px-5 py-4 flex items-center justify-between gap-4 ${headerBorder ? 'border-b border-slate-100' : ''}`}>
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive,
  variant = 'default',
  onClick,
  badgeText,
  badgeVariant = 'neutral',
  className = ''
}) {
  const iconVariants = {
    default: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    blue: 'bg-sky-50 text-sky-600 border border-sky-100',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border border-amber-100',
    red: 'bg-red-50 text-red-600 border border-red-100'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-card hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-emerald-300' : ''} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
            {badgeText && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                badgeVariant === 'danger' ? 'bg-red-100 text-red-700' :
                badgeVariant === 'warning' ? 'bg-amber-100 text-amber-700' :
                badgeVariant === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {badgeText}
              </span>
            )}
          </div>
          {(subtitle || trend) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {trend && (
                <span className={`font-medium ${trendPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {trend}
                </span>
              )}
              {subtitle && <span className="text-slate-500">{subtitle}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl shrink-0 ${iconVariants[variant] || iconVariants.default}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export default Card;
