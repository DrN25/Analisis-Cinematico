import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet } from 'lucide-react';
import { AnalisisResponse, TableRow, VeredictoMecanismo, VistaKey } from '../types';

export type TablaExportKey =
  | 'resumen_porcentajes'
  | 'criticos_por_tipo'
  | 'criticos_por_persistencia'
  | 'planar'
  | 'cuna'
  | 'flexural'
  | 'directo_z12'
  | 'directo_z3'
  | 'directo_base'
  | 'tipos_conteo';

interface Props {
  data: AnalisisResponse | null;
  vista: VistaKey;
  umbral: number;
  onSelectVista: (v: VistaKey) => void;
  onExportTableCsv: (tabla: TablaExportKey) => void;
  onExportCunaExcel: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const MECANISMO_COLOR: Record<VeredictoMecanismo['clave'], string> = {
  planar: '#991B1B',
  cuna: '#881337',
  flexural: '#B45309',
  directo: '#334155',
};

const CompactTable: React.FC<{
  rows: TableRow[];
  emptyText?: string;
  note?: string;
  onCsv?: () => void;
  onExcel?: () => void;
}> = ({ rows, emptyText = 'Ningún elemento crítico.', note, onCsv, onExcel }) => {
  if (!rows || rows.length === 0) {
    return <p className="text-xs text-slate-400 py-3 text-center italic">{emptyText}</p>;
  }
  const cols = Object.keys(rows[0]);
  return (
    <div className="flex flex-col min-h-0 flex-1">
      {(onCsv || onExcel) && (
        <div className="flex items-center justify-end gap-1.5 mb-1.5 shrink-0">
          {onExcel && (
            <button
              type="button"
              onClick={onExcel}
              className="px-2 py-0.5 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 rounded text-slate-700 inline-flex items-center gap-1 shadow-sm"
              title="Descargar en Excel"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
              Excel
            </button>
          )}
          {onCsv && (
            <button
              type="button"
              onClick={onCsv}
              className="px-2 py-0.5 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 rounded text-slate-700 inline-flex items-center gap-1 shadow-sm"
              title="Descargar en CSV"
            >
              <Download className="w-3 h-3 text-[#881337]" />
              CSV
            </button>
          )}
        </div>
      )}
      <div className="overflow-auto flex-1 min-h-0 border border-slate-200 rounded bg-white">
        <table className="w-full text-xs border-separate border-spacing-0 font-mono">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 text-left font-semibold text-slate-700 px-2 py-1 whitespace-nowrap font-sans text-[11px]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                {cols.map((c) => {
                  const val = r[c];
                  const txt =
                    val === null || val === undefined
                      ? '—'
                      : typeof val === 'boolean'
                      ? val
                        ? 'Sí'
                        : 'No'
                      : String(val);
                  return (
                    <td
                      key={c}
                      className="px-2 py-1 text-slate-700 whitespace-nowrap border-b border-slate-100"
                    >
                      {txt}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="text-[11px] text-slate-500 mt-1 italic">{note}</p>}
    </div>
  );
};

export const RightInspector: React.FC<Props> = ({
  data,
  vista,
  umbral,
  onSelectVista,
  onExportTableCsv,
  onExportCunaExcel,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [subTab, setSubTab] = useState<'a' | 'b' | 'c'>('a');
  const [tabResumen, setTabResumen] = useState<'porcentajes' | 'tipos' | 'persistencia'>(
    'porcentajes',
  );

  useEffect(() => {
    setSubTab('a');
  }, [vista]);

  if (collapsed) {
    return (
      <aside className="w-10 min-w-[40px] max-w-[40px] shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col items-center py-2.5 gap-2 select-none">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="Expandir inspector"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </aside>
    );
  }

  if (!data) {
    return (
      <aside className="w-[480px] min-w-[480px] max-w-[480px] shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col min-h-0 p-3 select-none">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="text-xs font-semibold uppercase tracking-tight text-slate-600">
            Inspector de Mecanismos
          </span>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded hover:bg-slate-200 text-slate-600"
              title="Plegar panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-4 italic">Cargando resultados…</p>
      </aside>
    );
  }

  const veredictos: VeredictoMecanismo[] = (data.veredictos || []).map((v) => ({
    ...v,
    posible: v.criticos > 0 && v.porcentaje >= umbral,
  }));

  const maxPct = Math.max(...veredictos.map((v) => v.porcentaje), 0);
  const escala = 50;
  const marcaPct = Math.min(100, (umbral / escala) * 100);
  const t = data.tablas;

  return (
    <aside className="w-[480px] min-w-[480px] max-w-[480px] shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col min-h-0 p-3 gap-2.5 select-none overflow-hidden">
      {/* Cabecera del Inspector */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800">
            Inspector de Mecanismos
          </span>
          <span className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
            Umbral {umbral}%
          </span>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-slate-200 text-slate-600"
            title="Plegar panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4 Tarjetas de mecanismo 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {veredictos.map((v) => {
          const active = vista === v.clave;
          const isTop = maxPct > 0 && v.porcentaje === maxPct;
          const accent = MECANISMO_COLOR[v.clave];
          const fillPct = Math.min(100, (v.porcentaje / escala) * 100);
          return (
            <button
              key={v.clave}
              type="button"
              onClick={() => onSelectVista(v.clave)}
              style={{ borderTopWidth: '3px', borderTopColor: accent }}
              className={`text-left rounded-lg p-2.5 border transition-all ${
                isTop
                  ? 'bg-rose-50/70 border-[#881337]/50 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              } ${active ? 'ring-2 ring-[#881337]/40 border-[#881337]' : ''}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {v.nombre}
                </span>
                <span
                  style={
                    v.posible
                      ? { backgroundColor: accent, color: '#FFFFFF' }
                      : undefined
                  }
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                    v.posible ? '' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {v.posible ? 'SÍ' : 'NO'}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1 mt-1">
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-lg font-bold text-slate-900 leading-none">
                    {v.porcentaje.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">%</span>
                </div>
                {isTop && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#881337]/15 text-[#881337]">
                    Mayor %
                  </span>
                )}
              </div>
              <div className="relative h-1.5 bg-slate-200 rounded-full my-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${fillPct}%`,
                    backgroundColor: v.posible ? accent : '#94A3B8',
                  }}
                />
                <div
                  className="absolute -top-0.5 w-0.5 h-2.5 bg-slate-900"
                  style={{ left: `${marcaPct}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 truncate font-mono">{v.detalles[0]}</div>
            </button>
          );
        })}
      </div>

      {/* Tablas Detalladas por Vista */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-slate-200 pt-2.5">
        {vista === 'general' && (
          <>
            <div className="flex bg-slate-200/80 p-0.5 rounded mb-2 shrink-0">
              {[
                { id: 'porcentajes', label: 'Porcentajes Dips' },
                { id: 'tipos', label: 'Por tipo' },
                { id: 'persistencia', label: 'Por persistencia' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTabResumen(s.id as any)}
                  className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                    tabResumen === s.id
                      ? 'bg-white text-[#881337] shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {tabResumen === 'porcentajes' && (
              <CompactTable
                rows={t.resumen_porcentajes}
                onCsv={() => onExportTableCsv('resumen_porcentajes')}
              />
            )}
            {tabResumen === 'tipos' && (
              <CompactTable
                rows={t.criticos_por_tipo}
                onCsv={() => onExportTableCsv('criticos_por_tipo')}
              />
            )}
            {tabResumen === 'persistencia' && (
              <CompactTable
                rows={t.criticos_por_persistencia}
                onCsv={() => onExportTableCsv('criticos_por_persistencia')}
              />
            )}
          </>
        )}

        {vista === 'planar' && (
          <>
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-800">
                Planos críticos planar ({t.planar.length})
              </span>
            </div>
            <CompactTable rows={t.planar} onCsv={() => onExportTableCsv('planar')} />
          </>
        )}

        {vista === 'cuna' && (
          <>
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-800">
                Intersecciones críticas cuña ({t.cuna.length})
              </span>
            </div>
            <CompactTable
              rows={t.cuna}
              onCsv={() => onExportTableCsv('cuna')}
              onExcel={onExportCunaExcel}
            />
          </>
        )}

        {vista === 'flexural' && (
          <>
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-800">
                Planos críticos toppling flexural ({t.flexural.length})
              </span>
            </div>
            <CompactTable rows={t.flexural} onCsv={() => onExportTableCsv('flexural')} />
          </>
        )}

        {vista === 'directo' && (
          <>
            <div className="flex gap-1 mb-2 shrink-0">
              {[
                { id: 'a', label: `Zonas 1+2 (${t.directo_z12_total})` },
                { id: 'b', label: `Zona 3 (${t.directo_z3_total})` },
                { id: 'c', label: `Planos base (${t.directo_base.length})` },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubTab(s.id as 'a' | 'b' | 'c')}
                  className={`px-2 py-0.5 text-xs rounded font-medium ${
                    subTab === s.id
                      ? 'bg-white text-[#881337] border border-slate-200 shadow-sm font-semibold'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {subTab === 'a' && (
              <CompactTable
                rows={t.directo_z12}
                onCsv={() => onExportTableCsv('directo_z12')}
                note="En Dips las zonas 1–3 se agrupan como C1."
              />
            )}
            {subTab === 'b' && (
              <CompactTable
                rows={t.directo_z3}
                onCsv={() => onExportTableCsv('directo_z3')}
              />
            )}
            {subTab === 'c' && (
              <CompactTable
                rows={t.directo_base}
                onCsv={() => onExportTableCsv('directo_base')}
              />
            )}
          </>
        )}

        {vista === 'roseta' && (
          <>
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-800">
                Discontinuidades por tipo ({t.tipos_conteo.length})
              </span>
            </div>
            <CompactTable rows={t.tipos_conteo} onCsv={() => onExportTableCsv('tipos_conteo')} />
          </>
        )}
      </div>
    </aside>
  );
};
