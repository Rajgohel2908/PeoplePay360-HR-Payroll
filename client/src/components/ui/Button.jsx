// client/src/components/ui/Button.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon,
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';

  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs shadow-emerald-600/15',
    secondary: 'bg-slate-100/90 text-slate-800 hover:bg-slate-200/80 border border-slate-200/70',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50/80 hover:text-slate-900 hover:border-slate-300 shadow-xs',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500/20 shadow-xs',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500/20 shadow-xs',
    ghost: 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900',
    link: 'text-emerald-600 hover:underline p-0 h-auto font-normal focus:ring-0'
  };

  const sizes = {
    xs: 'text-xs px-2.5 py-1.5 gap-1.5 font-medium',
    sm: 'text-xs px-3.5 py-2 gap-2 font-medium',
    md: 'text-sm px-4 py-2.5 gap-2.5 font-medium',
    lg: 'text-base px-5 py-3 gap-2.5 font-semibold',
    icon: 'p-2 rounded-xl'
  };

  const renderIcon = () => {
    if (loading) return <Loader2 className="w-4 h-4 animate-spin shrink-0" />;
    if (!icon) return null;
    if (React.isValidElement(icon)) return <span className="shrink-0">{icon}</span>;
    const IconComponent = icon;
    return <IconComponent className="w-4 h-4 shrink-0" />;
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      onClick={onClick}
      {...props}
    >
      {renderIcon()}
      {children}
    </button>
  );
}

export default Button;
