// client/src/components/ui/Select.jsx
import React, { forwardRef } from 'react';

export const Select = forwardRef(({
  label,
  options = [],
  error,
  helperText,
  className = '',
  containerClassName = '',
  id,
  required,
  children,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
          {label} {required && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`
            block w-full rounded-lg border text-sm transition-colors duration-150 py-2.5 px-3.5 bg-white text-slate-900 appearance-none
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
            }
            disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        >
          {children ? children : (
            options.map((opt, i) => (
              <option key={opt.value ?? i} value={opt.value}>
                {opt.label}
              </option>
            ))
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
