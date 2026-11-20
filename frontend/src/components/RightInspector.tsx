import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
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
}

const MECANISMO_COLOR: Record<VeredictoMecanismo['clave'], string> = {
  planar: '#991B1B',   // Crimson ejecutivo
  cuna: '#881337',     // Granate
  flexural: '#B45309', // Terracota / Ámbar oscuro
  directo: '#334155',  // Pizarra ejecutivo
};

const CompactTable: React.FC<{
  rows: TableRow[];
  emptyText?: string;
  note?: string;
  onCsv?: () => void;
  onExcel?: () => void;
}> = ({ rows, emptyText = 'Ningún elemento crítico.', note, onCsv, onExcel }) => {
  if (!rows || rows.length === 0) {
    return <p className="text-xs text-slate-400 py-4 text-center">{emptyText}</p>;
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
              className="px-2 py-0.5 text-[11px] font-medium border border-slate-200 bg-white hover:bg-slate-50 rounded text-slate-700 inline-flex items-center gap-1"
              title="Descargar intersecciones críticas en Excel"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
              Excel
            </button>
          )}
          {onCsv && (
            <button
              type="button"
              onClick={onCsv}
              className="px-2 py-0.5 text-[11px] font-medium border border-slate-200 bg-white hover:bg-slate-50 rounded text-slate-700 inline-flex items-center gap-1"
              title="Descargar esta tabla en CSV"
            >
              <Download className="w-3 h-3 text-[#881337]" />
              CSV
            </button>
          )}
        </div>
      )}
      <div className="overflow-auto flex-1 min-h-0 border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-[11px] border-separate border-spacing-0">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 text-left font-semibold text-slate-700 px-2 py-1.5 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/80">
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
                    <td key={c} className="px-2 py-1 text-slate-700 whitespace-nowrap border-b border-slate-100">
                      {txt}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="text-[10.5px] text-slate-500 mt-1.5 shrink-0">{note}</p>}
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
}) => {
  const [subTab, setSubTab] = useState<'a' | 'b' | 'c'>('a');

  useEffect(() => {
    setSubTab('a');
  }, [vista]);

  if (!data) {
    return (
      <aside className="w-[380px] shrink-0 bg-slate-50/60 border-l border-slate-200 p-4 flex items-center justify-center text-xs text-slate-400">
        Ejecuta un análisis para ver el resumen y las tablas.
      </aside>
    );
  }

  const veredictos: VeredictoMecanismo[] = data.veredictos.map((v) => ({
    ...v,
    posible: v.criticos > 0 && v.porcentaje >= umbral,
  }));

  const maxPct = Math.max(...veredictos.map((v) => v.porcentaje), 0);
  const escala = 50;
  const marcaPct = Math.min(100, (umbral / escala) * 100);
  const t = data.tablas;

  return (
    <aside className="w-[390px] shrink-0 bg-slate-50/70 border-l border-slate-200 flex flex-col min-h-0 p-3 gap-3">
      {/* 4 Tarjetas SÍ/NO en grid 2x2 compacto */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Resumen por mecanismo
          </h2>
          <span className="text-[11px] text-slate-500">Umbral: {umbral}%</span>
        </div>
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
                className={`text-left rounded-xl p-2.5 border transition-all ${
                  isTop
                    ? 'bg-rose-50/70 border-[#881337]/60 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                } ${active ? 'ring-2 ring-[#881337]/35' : ''}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-800 truncate">{v.nombre}</span>
                  <span
                    style={
                      v.posible
                        ? { backgroundColor: accent, color: '#FFFFFF' }
                        : undefined
                    }
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      v.posible ? '' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {v.posible ? 'SÍ' : 'NO'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-1 mt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-xl font-semibold text-slate-900 leading-none">
                      {v.porcentaje.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-slate-500">% crítico</span>
                  </div>
                  {isTop && (
                    <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-[#881337]/10 text-[#881337]">
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
                <div className="text-[10.5px] text-slate-500 truncate">{v.detalles[0]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tablas contextuales de la vista activa */}
      <div className="flex-1 min-h-0 flex flex-col">
        {vista === 'general' && (
          <>
            <div className="flex gap-1 mb-2 shrink-0">
              {[
                { id: 'a', label: 'Porcentajes Dips' },
                { id: 'b', label: 'Por tipo' },
                { id: 'c', label: 'Por persistencia' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubTab(s.id as 'a' | 'b' | 'c')}
                  className={`px-2 py-1 text-[11px] rounded-md font-medium ${
                    subTab === s.id
                      ? 'bg-white text-[#881337] border border-slate-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {subTab === 'a' && (
              <CompactTable
                rows={t.resumen_porcentajes}
                onCsv={() => onExportTableCsv('resumen_porcentajes')}
              />
            )}
            {subTab === 'b' && (
              <CompactTable
                rows={t.criticos_por_tipo}
                onCsv={() => onExportTableCsv('criticos_por_tipo')}
              />
            )}
            {subTab === 'c' && (
              <CompactTable
                rows={t.criticos_por_persistencia}
                onCsv={() => onExportTableCsv('criticos_por_persistencia')}
              />
            )}
          </>
        )}

        {vista === 'planar' && (
          <>
            <h3 className="text-xs font-semibold text-slate-700 mb-1 shrink-0">
              Planos críticos planar ({t.planar.length})
            </h3>
            <CompactTable
              rows={t.planar}
              onCsv={() => onExportTableCsv('planar')}
            />
          </>
        )}

        {vista === 'cuna' && (
          <>
            <h3 className="text-xs font-semibold text-slate-700 mb-1 shrink-0">
              Intersecciones críticas en cuña ({t.cuna_total.toLocaleString()})
            </h3>
            <CompactTable
              rows={t.cuna}
              onCsv={() => onExportTableCsv('cuna')}
              onExcel={onExportCunaExcel}
              note={
                t.cuna_total > t.cuna.length
                  ? `Mostrando las ${t.cuna.length} de mayor inmersión; Excel y CSV incluyen todas.`
                  : 'P2: desliza en dos planos · P1: desliza en un plano.'
              }
            />
          </>
        )}

        {vista === 'flexural' && (
          <>
            <h3 className="text-xs font-semibold text-slate-700 mb-1 shrink-0">
              Planos críticos toppling flexural ({t.flexural.length})
            </h3>
            <CompactTable
              rows={t.flexural}
              onCsv={() => onExportTableCsv('flexural')}
            />
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
                  className={`px-2 py-1 text-[11px] rounded-md font-medium ${
                    subTab === s.id
                      ? 'bg-white text-[#881337] border border-slate-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/50'
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
                note="En la exportación de Dips las zonas 1–3 aparecen como C1."
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
            <h3 className="text-xs font-semibold text-slate-700 mb-1 shrink-0">
              Discontinuidades por tipo
            </h3>
            <CompactTable
              rows={t.tipos_conteo}
              onCsv={() => onExportTableCsv('tipos_conteo')}
            />
          </>
        )}
      </div>
    </aside>
  );
};
