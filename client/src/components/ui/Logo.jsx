// client/src/components/ui/Logo.jsx
import React from 'react';

/**
 * PEOPLEPAY360 Modern Vector Logo Mark & Brand Graphic
 */
export function Logo({ size = 'md', showText = true, className = '' }) {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-xs', badge: 'text-[9px] px-1 py-0.5' },
    md: { icon: 'w-9 h-9', text: 'text-sm', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { icon: 'w-12 h-12', text: 'text-lg', badge: 'text-xs px-2 py-0.5' },
    xl: { icon: 'w-16 h-16', text: 'text-2xl', badge: 'text-sm px-2.5 py-1' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* High-end Geometric 360 Ring / Payroll Emblem */}
      <div className={`relative ${currentSize.icon} shrink-0`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Outer continuous circular gradient ring */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="url(#outer-ring-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="95 30"
          />
          {/* Inner dynamic shield/checkmark geometry */}
          <path
            d="M16 24.5L21.5 30L32 18"
            stroke="url(#check-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Subtle node accent */}
          <circle cx="34" cy="14" r="3" fill="#10B981" />
          <defs>
            <linearGradient id="outer-ring-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#059669" />
              <stop offset="0.5" stopColor="#10B981" />
              <stop offset="1" stopColor="#0D9488" />
            </linearGradient>
            <linearGradient id="check-grad" x1="16" y1="18" x2="32" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#059669" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-slate-900 ${currentSize.text}`}>
              PEOPLEPAY
            </span>
            <span className={`font-black text-emerald-600 ${currentSize.text}`}>
              360
            </span>
          </div>
          <span className="text-[10px] font-medium tracking-normal text-slate-400 mt-0.5">
            Enterprise HR & Payroll
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;
