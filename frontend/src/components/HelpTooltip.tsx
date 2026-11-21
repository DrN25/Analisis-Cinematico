import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface HelpTooltipProps {
  text: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  text,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const openedByHoverRef = useRef(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    placeAbove: boolean;
  }>({
    top: 0,
    left: 0,
    arrowLeft: 130,
    placeAbove: true,
  });

  const btnRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const tooltipWidth = 260; // Ancho del tooltip

    // Evaluar si cabe arriba o abajo de acuerdo al espacio disponible en el viewport
    const spaceAbove = rect.top;
    const placeAbove = spaceAbove >= 110;

    // Centrado horizontal alineado al centro del botón (?)
    const btnCenter = rect.left + rect.width / 2;
    let left = btnCenter - tooltipWidth / 2;

    // Delimitar dentro de los bordes de la pantalla (viewport)
    const margin = 10;
    if (left < margin) {
      left = margin;
    } else if (left + tooltipWidth > window.innerWidth - margin) {
      left = window.innerWidth - tooltipWidth - margin;
    }

    // Posición de la flecha con respecto al contenedor del tooltip
    const arrowLeft = Math.max(12, Math.min(tooltipWidth - 12, btnCenter - left));
    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

    setCoords({
      top,
      left,
      arrowLeft,
      placeAbove,
    });
  };

  const handleMouseEnter = () => {
    calculatePosition();
    openedByHoverRef.current = true;
    setOpen(true);
  };

  const handleMouseLeave = () => {
    openedByHoverRef.current = false;
    if (!pinned) {
      setOpen(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    calculatePosition();
    if (!pinned && openedByHoverRef.current) {
      openedByHoverRef.current = false;
      setPinned(true);
      setOpen(true);
      return;
    }
    const next = !open;
    setPinned(next);
    setOpen(next);
    openedByHoverRef.current = false;
  };

  useEffect(() => {
    if (!open) return;

    const handleScrollOrResize = () => {
      setOpen(false);
      setPinned(false);
      openedByHoverRef.current = false;
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setPinned(false);
        openedByHoverRef.current = false;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPinned(false);
        openedByHoverRef.current = false;
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Más información"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`w-3.5 h-3.5 rounded-full bg-slate-200/90 hover:bg-slate-300 text-slate-600 hover:text-slate-900 inline-flex items-center justify-center text-[9.5px] font-bold leading-none select-none transition-colors cursor-help shrink-0 focus:outline-none focus:ring-1 focus:ring-slate-400 ${className}`}
      >
        <span className="leading-none select-none pointer-events-none">?</span>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '260px',
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
              zIndex: 99999,
            }}
            className="px-2.5 py-1.5 text-[11px] font-normal leading-relaxed text-slate-100 bg-slate-900/95 backdrop-blur-xs rounded-md shadow-2xl border border-slate-700/80 whitespace-normal select-none pointer-events-none"
          >
            {text}
            {coords.placeAbove ? (
              <div
                className="absolute top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"
                style={{
                  left: `${coords.arrowLeft}px`,
                  transform: 'translateX(-50%)',
                }}
              />
            ) : (
              <div
                className="absolute bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900"
                style={{
                  left: `${coords.arrowLeft}px`,
                  transform: 'translateX(-50%)',
                }}
              />
            )}
          </div>,
          document.body,
        )}
    </>
  );
};
