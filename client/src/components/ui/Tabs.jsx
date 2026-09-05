// client/src/components/ui/Tabs.jsx
import React from 'react';

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'underline',
  className = ''
}) {
  return (
    <div className={`border-b border-stone-200/90 overflow-x-auto ${className}`}>
      <nav className="-mb-px flex space-x-8 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                group inline-flex items-center gap-2.5 py-3.5 px-1 border-b-2 text-[13.5px] whitespace-nowrap transition-all duration-150 select-none
                ${isActive
                  ? 'border-emerald-600 text-emerald-950 font-bold'
                  : 'border-transparent text-slate-700 hover:text-slate-950 hover:border-stone-300 font-semibold'
                }
              `}
            >
              {Icon && (
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-emerald-700' : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                />
              )}
              <span className="tracking-tight">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-stone-100 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default Tabs;
