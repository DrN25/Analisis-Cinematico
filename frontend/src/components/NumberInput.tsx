import React from 'react';
import { HelpTooltip } from './HelpTooltip';

interface Props {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  className?: string;
}

export const NumberInput: React.FC<Props> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  help,
  className = '',
}) => {
  const handleDecrement = () => {
    const next = Math.round((value - step) * 1000) / 1000;
    if (min !== undefined && next < min) {
      onChange(min);
    } else {
      onChange(next);
    }
  };

  const handleIncrement = () => {
    const next = Math.round((value + step) * 1000) / 1000;
    if (max !== undefined && next > max) {
      onChange(max);
    } else {
      onChange(next);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(val);
    }
  };

  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-center gap-1 mb-1 select-none">
        <label title={label} className="text-[10.5px] font-medium text-slate-700 truncate">
          {label}
        </label>
        {help && <HelpTooltip text={help} />}
      </div>
      <div className="flex items-center border border-slate-300 rounded bg-white overflow-hidden shadow-2xs focus-within:border-[#881337] focus-within:ring-1 focus-within:ring-[#881337]/20">
        <button
          type="button"
          disabled={atMin}
          onClick={handleDecrement}
          className="w-6 h-6 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed select-none border-r border-slate-200 text-xs font-bold shrink-0 transition-colors cursor-pointer"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="flex-1 min-w-0 w-full px-1 py-0.5 text-xs text-center font-mono tabular-nums text-slate-800 focus:outline-none bg-transparent"
        />
        <button
          type="button"
          disabled={atMax}
          onClick={handleIncrement}
          className="w-6 h-6 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed select-none border-l border-slate-200 text-xs font-bold shrink-0 transition-colors cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
};
