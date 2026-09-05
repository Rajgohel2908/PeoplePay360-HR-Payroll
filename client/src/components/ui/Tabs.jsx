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
    <div className={`border-b border-slate-200 overflow-x-auto ${className}`}>
      <nav className="-mb-px flex space-x-6 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                group inline-flex items-center gap-2 py-3 px-1 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors duration-150
                ${isActive
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-500'}`} />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
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
