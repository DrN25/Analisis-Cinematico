import React, { useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { DiscontinuidadRow } from '../types';
import { handleTableArrowKey } from '../utils/tableNav';

const MAX_ROWS = 50;
const INITIAL_EMPTY_ROWS = 1;

interface ManualRow {
  buz: string;
  dirbuz: string;
}

interface Props {
  initialRows?: DiscontinuidadRow[];
  onClose: () => void;
  onSaveStructures: (rows: DiscontinuidadRow[]) => void;
}

const emptyRow = (): ManualRow => ({ buz: '', dirbuz: '' });

function isRowFilled(r: ManualRow): boolean {
  return r.buz.trim() !== '' || r.dirbuz.trim() !== '';
}

function getRowError(r: ManualRow): string | null {
  if (!isRowFilled(r)) return null;
  if (r.buz.trim() === '' || r.dirbuz.trim() === '') {
    return 'Completa Dip y DipDir';
  }
  const buz = Number(r.buz.replace(',', '.'));
  const dir = Number(r.dirbuz.replace(',', '.'));
  if (!Number.isFinite(buz) || buz < 0 || buz > 90) {
    return 'Dip debe estar entre 0° y 90°';
  }
  if (!Number.isFinite(dir) || dir < 0 || dir > 360) {
    return 'DipDir debe estar entre 0° y 360°';
  }
  return null;
}

export const ManualStructuresModal: React.FC<Props> = ({
  initialRows = [],
  onClose,
  onSaveStructures,
}) => {
  const [draft, setDraft] = useState<ManualRow[]>(() => {
    if (initialRows.length > 0) {
      return initialRows.slice(0, MAX_ROWS).map((r) => ({
        buz: String(r.Buz ?? ''),
        dirbuz: String(r.DirBuz ?? ''),
      }));
    }
    return Array.from({ length: INITIAL_EMPTY_ROWS }, emptyRow);
  });
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);

  const updateCell = (idx: number, field: keyof ManualRow, val: string) => {
    setDraft((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row)),
    );
  };

  const addRow = () => {
    setDraft((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, emptyRow()]));
  };

  const removeRow = (idx: number) => {
    setDraft((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [emptyRow()];
    });
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startIdx: number,
  ) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n') && !text.includes('\t')) return;
    e.preventDefault();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    setDraft((prev) => {
      const next = [...prev];
      lines.forEach((line, offset) => {
        const targetIdx = startIdx + offset;
        if (targetIdx >= MAX_ROWS) return;
        const cols = line.split(/\t|;|,/).map((c) => c.trim());
        while (next.length <= targetIdx) {
          next.push(emptyRow());
        }
        next[targetIdx] = {
          buz: cols[0] ?? '',
          dirbuz: cols[1] ?? '',
        };
      });
      return next.slice(0, MAX_ROWS);
    });
  };

  const filledRows = draft.filter(isRowFilled);
  const hasErrors = filledRows.some((r) => getRowError(r) !== null);
  const validCount = filledRows.filter((r) => getRowError(r) === null).length;

  const handleSave = () => {
    if (validCount === 0 || hasErrors) return;
    const result: DiscontinuidadRow[] = filledRows.map((r, i) => {
      const buz = Number(r.buz.replace(',', '.'));
      const rawDir = Number(r.dirbuz.replace(',', '.'));
      const dirbuz = rawDir === 360 ? 0 : rawDir;
      return {
        ID: `P${i + 1}`,
        Buz: buz,
        DirBuz: dirbuz,
        Tipo: 'Sin tipo',
        Persistencia: '',
      };
    });
    onSaveStructures(result);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-200">
          <div>
            <h2 className="font-display font-semibold text-base text-slate-900">
              {/* Título simplificado a "Agregar" (antes "Agregar estructuras") */}
              Agregar
            </h2>
            <p className="text-[11px] text-slate-500">
              Ingresa manualmente las filas (puedes pegar columnas desde Excel).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
              {draft.length} {draft.length === 1 ? 'fila' : 'filas'}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="border border-slate-200 rounded-xl overflow-auto max-h-[58vh]">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="text-slate-700">
                  <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left w-10">
                    #
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left">
                    Dip (0-90°)
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left">
                    DipDir (0-360°)
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody ref={tbodyRef}>
                {draft.map((row, idx) => {
                  const err = getRowError(row);
                  return (
                    <tr
                      key={idx}
                      className={err ? 'bg-rose-50/50' : 'hover:bg-slate-50/70'}
                    >
                      <td className="px-2.5 py-1 text-slate-400 border-b border-slate-100 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-1.5 py-1 border-b border-slate-100 align-top">
                        <input
                          type="text"
                          inputMode="decimal"
                          data-row={idx}
                          data-col={0}
                          placeholder="0 - 90"
                          value={row.buz}
                          onChange={(e) => updateCell(idx, 'buz', e.target.value)}
                          onKeyDown={(e) => handleTableArrowKey(e, idx, 0, draft.length, 2, tbodyRef.current)}
                          onPaste={(e) => handlePaste(e, idx)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-[#881337] font-mono tabular-nums"
                        />
                      </td>
                      <td className="px-1.5 py-1 border-b border-slate-100 align-top">
                        <input
                          type="text"
                          inputMode="decimal"
                          data-row={idx}
                          data-col={1}
                          placeholder="0 - 360"
                          value={row.dirbuz}
                          onChange={(e) => updateCell(idx, 'dirbuz', e.target.value)}
                          onKeyDown={(e) => handleTableArrowKey(e, idx, 1, draft.length, 2, tbodyRef.current)}
                          onPaste={(e) => handlePaste(e, idx)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-[#881337] font-mono tabular-nums"
                        />
                        {err && (
                          <div className="text-[10px] text-rose-700 mt-0.5 font-medium">
                            {err}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-1 text-center border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-700 rounded cursor-pointer"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={draft.length >= MAX_ROWS}
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir fila
            </button>
            {/*
              OCULTO POR REQUERIMIENTO: ocultar referencia visible a máximo de 50 filas (la validación MAX_ROWS sigue activa).
              {draft.length >= MAX_ROWS && <span>Máximo {MAX_ROWS} filas permitidas</span>}
            */}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={validCount === 0 || hasErrors}
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold bg-[#881337] hover:bg-[#6F0F2C] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer"
            >
              Guardar estructuras ({validCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
