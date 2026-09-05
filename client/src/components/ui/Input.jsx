// client/src/components/ui/Input.jsx
import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  containerClassName = '',
  id,
  required,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
          {label} {required && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={`
            block w-full rounded-lg border text-sm transition-colors duration-150
            py-2.5 ${Icon ? 'pl-9 pr-3' : 'px-3.5'}
            ${error
              ? 'border-red-400 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
            }
            disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
      )}
      {!error && helperText && (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
