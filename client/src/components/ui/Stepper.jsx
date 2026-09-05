// client/src/components/ui/Stepper.jsx
import React from 'react';
import { Check } from 'lucide-react';

export function Stepper({ steps = [], currentStep = 1, onStepClick }) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <React.Fragment key={stepNum}>
              {/* Step Circle & Label */}
              <div
                className={`flex flex-col items-center cursor-pointer group ${
                  onStepClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onStepClick && stepNum <= currentStep && onStepClick(stepNum)}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 border-2 ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-white border-emerald-600 text-emerald-600 ring-4 ring-emerald-50'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : stepNum}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? 'text-emerald-700'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </p>
                  {step.subtitle && (
                    <p className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
                      {step.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting Line between steps */}
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 mb-6 transition-colors duration-200 ${
                    stepNum < currentStep ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default Stepper;
