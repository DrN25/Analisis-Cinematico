import React, { useEffect, useRef, useState } from 'react';

interface HelpTooltipProps {
  text: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  text,
  className = '',
  align = 'left',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Posicionamiento de la burbuja flotante
  const alignCls =
    align === 'right'
      ? 'right-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'left-0';

  const arrowAlignCls =
    align === 'right'
      ? 'right-2'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'left-2';

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        title={text}
        aria-label="Más información"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-3.5 h-3.5 rounded-full bg-slate-200/90 hover:bg-slate-300 text-slate-600 hover:text-slate-800 inline-flex items-center justify-center text-[9.5px] font-bold leading-none select-none transition-colors cursor-help focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        <span className="leading-none select-none">?</span>
      </button>

      {open && (
        <div
          role="tooltip"
          className={`absolute z-50 bottom-full mb-1.5 px-2.5 py-1.5 text-[11px] font-normal leading-relaxed text-slate-100 bg-slate-900/95 backdrop-blur-xs rounded shadow-lg border border-slate-700/60 w-64 max-w-[260px] whitespace-normal select-none pointer-events-auto transition-opacity ${alignCls}`}
        >
          {text}
          <div
            className={`absolute top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900 ${arrowAlignCls}`}
          />
        </div>
      )}
    </span>
  );
};
