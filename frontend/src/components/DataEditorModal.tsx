import React, { useState } from 'react';
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import { DescartadaRow, DiscontinuidadRow } from '../types';

interface Props {
  rows: DiscontinuidadRow[];
  descartadas: DescartadaRow[];
  onClose: () => void;
  onApplyAndRun: (rows: DiscontinuidadRow[]) => void;
}

export const DataEditorModal: React.FC<Props> = ({
  rows,
  descartadas,
  onClose,
  onApplyAndRun,
}) => {
  const [draft, setDraft] = useState<DiscontinuidadRow[]>(() =>
    rows.map((r) => ({ ...r })),
  );
  const [tab, setTab] = useState<'validas' | 'descartadas'>('validas');

  const updateCell = (idx: number, field: keyof DiscontinuidadRow, val: string) => {
    setDraft((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row)),
    );
  };

  const addRow = () => {
    setDraft((prev) => [
      ...prev,
      {
        ID: `D${String(prev.length + 1).padStart(3, '0')}`,
        Buz: 45,
        DirBuz: 180,
        Tipo: 'Diaclasa',
        Persistencia: '',
      },
    ]);
  };

  const removeRow = (idx: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-5xl max-h-[86vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-semibold text-base text-slate-900">
              Editor de discontinuidades
            </h2>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setTab('validas')}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  tab === 'validas' ? 'bg-white text-[#881337] shadow-sm' : 'text-slate-600'
                }`}
              >
                Tabla editable ({draft.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('descartadas')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 ${
                  tab === 'descartadas' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                {descartadas.length > 0 && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                Descartadas ({descartadas.length})
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tab === 'validas' ? (
            <div className="border border-slate-200 rounded-xl overflow-auto max-h-[60vh]">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="text-slate-700">
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left w-10">#</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left">Celda</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left">Dip (0–90°)</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left">DipDir (0–360°)</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left">Tipo de estructura</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left">Persistencia / Continuidad (m)</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draft.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-2.5 py-1 text-slate-400 border-b border-slate-100">{idx + 1}</td>
                      <td className="px-1.5 py-1 border-b border-slate-100">
                        <input
                          value={row.ID ?? ''}
                          onChange={(e) => updateCell(idx, 'ID', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-[#881337]"
                        />
                      </td>
                      <td className="px-1.5 py-1 border-b border-slate-100">
                        <input
                          type="number"
                          step="0.1"
                          value={row.Buz ?? ''}
                          onChange={(e) => updateCell(idx, 'Buz', e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-[#881337]"
                        />
                      </td>
                      <td className="px-1.5 py-1 border-b border-slate-100">
                        <input
                          type="number"
                          step="0.1"
                          value={row.DirBuz ?? ''}
                          onChange={(e) => updateCell(idx, 'DirBuz', e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-[#881337]"
                        />
                      </td>
                      <td className="px-1.5 py-1 border-b border-slate-100">
                        <input
                          value={row.Tipo ?? ''}
                          onChange={(e) => updateCell(idx, 'Tipo', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-[#881337]"
                        />
                      </td>
                      <td className="px-1.5 py-1 border-b border-slate-100">
                        <input
                          type="number"
                          step="0.1"
                          value={row.Persistencia ?? ''}
                          onChange={(e) => updateCell(idx, 'Persistencia', e.target.value)}
                          className="w-28 px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-[#881337]"
                        />
                      </td>
                      <td className="px-1.5 py-1 text-center border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-700 rounded"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : descartadas.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              Todas las filas pasaron el control de calidad sin observaciones.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-auto max-h-[60vh]">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="text-amber-900">
                    <th className="sticky top-0 z-20 bg-amber-50 border-b border-amber-200 px-3 py-2 text-left">Celda</th>
                    <th className="sticky top-0 z-20 bg-amber-50 border-b border-amber-200 px-3 py-2 text-left">Dip</th>
                    <th className="sticky top-0 z-20 bg-amber-50 border-b border-amber-200 px-3 py-2 text-left">DipDir</th>
                    <th className="sticky top-0 z-20 bg-amber-50 border-b border-amber-200 px-3 py-2 text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {descartadas.map((d, i) => (
                    <tr key={i} className="hover:bg-amber-50/40">
                      <td className="px-3 py-1.5 border-b border-slate-100">{d.ID ?? '—'}</td>
                      <td className="px-3 py-1.5 border-b border-slate-100">{d.Buz ?? '—'}</td>
                      <td className="px-3 py-1.5 border-b border-slate-100">{d.DirBuz ?? '—'}</td>
                      <td className="px-3 py-1.5 border-b border-slate-100 text-amber-800">{d.Motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
          {tab === 'validas' ? (
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 rounded-lg text-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir fila
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={draft.length === 0}
              onClick={() => onApplyAndRun(draft)}
              className="px-4 py-1.5 text-xs font-semibold bg-[#881337] hover:bg-[#6F0F2C] disabled:opacity-50 text-white rounded-lg"
            >
              Aplicar y ejecutar análisis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
