import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Play,
  Plus,
  Sliders,
  Table2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';
import { NumberInput } from './NumberInput';
import {
  DipsParams,
  OpcionesPlot,
  TaludParams,
} from '../types';

interface Props {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  filename: string;
  totalRows: number;
  descartadasCount: number;
  talud: TaludParams;
  onChangeTalud: (t: TaludParams) => void;
  parametros: DipsParams;
  onChangeParametros: (p: DipsParams) => void;
  umbral: number;
  onChangeUmbral: (u: number) => void;
  opciones: OpcionesPlot;
  onChangeOpciones: (o: OpcionesPlot) => void;
  onUploadFile: (file: File) => void;
  onClearData: () => void;
  onRunAnalysis: () => void;
  onOpenEditor: () => void;
  onOpenManualAdd: () => void;
  running: boolean;
  uploading: boolean;
}

const selectCls =
  'w-full min-w-0 px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#881337] truncate';
const labelCls = 'block text-[11px] font-medium text-slate-700 mb-0.5 select-none truncate';

interface TreeGroupProps {
  title: string;
  stepNumber?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const TreeGroup: React.FC<TreeGroupProps> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded overflow-hidden bg-white mb-2 shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 border-b border-slate-200 text-xs font-bold text-slate-800 select-none text-left transition-colors"
      >
        <span className="truncate tracking-tight">{title}</span>
        <span className="w-4 h-4 flex items-center justify-center border border-slate-300 bg-white text-xs text-slate-700 font-mono leading-none rounded shrink-0 ml-1">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && <div className="p-2.5 space-y-2 text-xs">{children}</div>}
    </div>
  );
};

export const LeftSidebar: React.FC<Props> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  filename,
  totalRows,
  descartadasCount,
  talud,
  onChangeTalud,
  parametros,
  onChangeParametros,
  umbral,
  onChangeUmbral,
  opciones,
  onChangeOpciones,
  onUploadFile,
  onClearData,
  onRunAnalysis,
  onOpenEditor,
  onOpenManualAdd,
  running,
  uploading,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const setOpt = <K extends keyof OpcionesPlot>(key: K, val: OpcionesPlot[K]) => {
    onChangeOpciones({ ...opciones, [key]: val });
  };


  const sidebarBody = (
    <div className="flex-1 overflow-y-auto p-2.5 min-h-0">
      {/* 1 · Datos de entrada */}
      <TreeGroup title="1 · Datos de entrada" defaultOpen={true}>
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className={labelCls}>Archivo CSV o Excel</span>
            <HelpTooltip text="Columnas obligatorias: Buz (Dip) y DirBuz (Dip Direction). Opcionales: Tipo y Persistencia. La fila de encabezados puede no ser la primera." />
          </div>

          {totalRows > 0 ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded p-2 text-xs">
              <div className="flex items-center justify-between font-mono text-emerald-900 font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate" title={filename}>{filename}</span>
                </div>
                <span className="text-[11px] text-emerald-700 shrink-0 ml-1">
                  {totalRows} filas
                </span>
              </div>
              {descartadasCount > 0 && (
                <p className="text-[10.5px] text-amber-700 font-mono mt-0.5">
                  ({descartadasCount} filas descartadas)
                </p>
              )}
              <button
                type="button"
                onClick={onOpenEditor}
                className="w-full mt-1.5 py-1 px-2 bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-800 rounded font-medium text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Table2 className="w-3 h-3 text-emerald-700" />
                <span>Ver / editar tabla · {totalRows} filas</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 rounded p-2 text-xs text-slate-500 font-mono text-center">
              Sin archivo cargado
            </div>
          )}

          <button
            type="button"
            onClick={onOpenManualAdd}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 border border-[#881337]/30 hover:border-[#881337]/60 bg-rose-50/50 hover:bg-rose-50 text-[#881337] rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {/* Etiqueta simplificada a "Agregar" (antes "Agregar estructuras") */}
            <span>Agregar</span>
          </button>

          {/* Acciones de carga y limpieza */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-1 px-2 border border-slate-300 hover:bg-white bg-slate-50 rounded text-slate-700 text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>{uploading ? 'Leyendo…' : 'Subir archivo'}</span>
            </button>
            <button
              type="button"
              disabled={totalRows === 0 && (!filename || filename === 'Sin archivo')}
              onClick={onClearData}
              className="flex items-center justify-center gap-1.5 py-1 px-2 border border-amber-300 hover:border-rose-400 hover:bg-rose-50 text-slate-700 hover:text-rose-700 bg-amber-50/40 rounded text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Limpiar carga</span>
            </button>
          </div>

          {/*
            OCULTO POR REQUERIMIENTO: sección "Tipos a analizar" ocultada al retirar Tipo de estructura en tablas.
            No mostrar en UI ni reactivar accidentalmente; filtro.tipos permanece en null.
          */}

        </div>
      </TreeGroup>

      {/* 2 · Opciones del estereograma */}
      <TreeGroup title="2 · Opciones del estereograma" defaultOpen={true}>
        {/*
          OCULTO POR REQUERIMIENTO: se retiraron "Más opciones en el menú superior." y
          "Solo cambian el dibujo; no recalculan el análisis." de la UI.
        */}

        {/*
          OCULTO POR REQUERIMIENTO: "Tamaño de los polos" (fijo en 12), "Proyección" (Equiárea),
          "Hemisferio" (Inferior) y "Red" (Ecuatorial) no se muestran en UI pero siguen activos en DEFAULT_OPCIONES_PLOT.
          No reactivar estos controles en UI sin confirmación.

          <div>Tamaño de los polos (fijo en 12)</div>
          <div>Proyección (Equiárea - Schmidt)</div>
          <div>Hemisferio (Inferior)</div>
          <div>Red (Ecuatorial)</div>
        */}

        {/* Color de los contornos: Azules, Verdes, Morados, Grises */}
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <label className={`${labelCls} flex items-center gap-1`}>
              <span>Color de los contornos</span>
              {/* OCULTO POR REQUERIMIENTO: interrogación (?) quitada de Color de los contornos.
              <HelpTooltip text="Paleta de los contornos de densidad de polos en todas las vistas; distinta del rojo y naranja de las zonas críticas." />
              */}
            </label>
          </div>
          <select
            value={opciones.mapa_color_mecanismos ?? 'Blues'}
            onChange={(e) =>
              setOpt(
                'mapa_color_mecanismos',
                e.target.value as 'Blues' | 'Greens' | 'Purples' | 'Greys',
              )
            }
            className={selectCls}
          >
            <option value="Blues">Azules</option>
            <option value="Greens">Verdes</option>
            <option value="Purples">Morados</option>
            <option value="Greys">Grises</option>
          </select>
        </div>

        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={opciones.contornos_en_mecanismos ?? true}
                onChange={(e) =>
                  onChangeOpciones({
                    ...opciones,
                    contornos_general: e.target.checked,
                    contornos_en_mecanismos: e.target.checked,
                  })
                }
                className="accent-[#881337] rounded"
              />
              <span>Contornos de densidad</span>
            </label>
            {/* OCULTO POR REQUERIMIENTO: interrogación (?) quitada de Contornos de densidad.
            <HelpTooltip text="Contornos de densidad de polos en todas las vistas." />
            */}
          </div>

          {/*
            OCULTO POR REQUERIMIENTO: "Tamaño por persistencia" oculto en UI;
            permanece activo en DEFAULT_OPCIONES_PLOT (types.ts). No reactivar en UI sin confirmación.
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={opciones.tamano_por_persistencia ?? true}
                  onChange={(e) => setOpt('tamano_por_persistencia', e.target.checked)}
                  className="accent-[#881337] rounded"
                />
                <span>Tamaño por persistencia</span>
              </label>
            </div>
          */}

          {/*
            OCULTO POR REQUERIMIENTO: opción "Etiquetas de los polos (ID)" oculta en UI;
            su lógica permanece intacta en DEFAULT_OPCIONES_PLOT y backend.
            <div className="flex items-center justify-between">
              <label ...>
                <input type="checkbox" ... />
                <span>Etiquetas de los polos (ID)</span>
              </label>
            </div>
          */}
        </div>
      </TreeGroup>

      {/* Formulario de Análisis: 3 · Geometría del talud y 4 · Parámetros del análisis */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onRunAnalysis();
          onCloseMobile();
        }}
        className="space-y-0"
      >
        {/* 3 · Geometría del talud */}
        <TreeGroup title="3 · Geometría del talud" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <NumberInput
              label="Buzamiento ψs (°)"
              min={1}
              max={90}
              step={1}
              value={talud.buz}
              onChange={(val) =>
                onChangeTalud({
                  ...talud,
                  buz: Math.min(90, Math.max(1, val)),
                })
              }
            />
            <NumberInput
              label="Dir. de buzamiento αs (°)"
              min={0}
              max={359.9}
              step={1}
              value={talud.dirbuz}
              onChange={(val) =>
                onChangeTalud({
                  ...talud,
                  dirbuz: Math.min(359.9, Math.max(0, val)),
                })
              }
            />
          </div>
        </TreeGroup>

        {/* 4 · Parámetros del análisis */}
        <TreeGroup title="4 · Parámetros del análisis" defaultOpen={true}>
          <NumberInput
            label="Ángulo de fricción φ (°)"
            min={0}
            max={89}
            step={1}
            value={parametros.phi}
            onChange={(val) =>
              onChangeParametros({
                ...parametros,
                phi: Math.min(89, Math.max(0, val)),
              })
            }
          />

          <div className="grid grid-cols-2 gap-2 min-w-0">
            <NumberInput
              label="LL planar ±°"
              min={0}
              max={90}
              step={1}
              value={parametros.ll_planar}
              onChange={(val) =>
                onChangeParametros({ ...parametros, ll_planar: val })
              }
            />
            <NumberInput
              label="LL flexural ±°"
              min={0}
              max={90}
              step={1}
              value={parametros.ll_flexural}
              onChange={(val) =>
                onChangeParametros({ ...parametros, ll_flexural: val })
              }
            />
            <NumberInput
              label="LL directo ±°"
              min={0}
              max={90}
              step={1}
              value={parametros.ll_directo}
              onChange={(val) =>
                onChangeParametros({ ...parametros, ll_directo: val })
              }
            />
          </div>

          <p className="text-[10.5px] text-slate-500 italic">
            LL: límite lateral.
          </p>

          <button
            type="submit"
            disabled={running || totalRows === 0}
            className="w-full mt-1.5 py-1.5 px-3 rounded font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer bg-[#881337] hover:bg-[#6F0F2C] text-white"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{running ? 'Calculando…' : 'Ejecutar análisis'}</span>
          </button>
        </TreeGroup>
      </form>

      {/* 5 · Criterio del resumen */}
      <TreeGroup title="5 · Criterio del resumen" defaultOpen={true}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <label className="text-[10.5px] font-semibold text-slate-700 uppercase tracking-tight leading-snug">
              <span>Porcentaje crítico de discontinuidades</span>{' '}
              <HelpTooltip
                text="Un mecanismo se reporta como «SÍ» cuando su porcentaje crítico es mayor que este valor. El valor lo define el ingeniero según el nivel de confianza requerido y el riesgo asumido."
                align="left"
                className="align-middle ml-0.5"
              />
            </label>
            <span className="font-mono font-bold text-xs text-[#881337] whitespace-nowrap shrink-0 px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded">
              {umbral}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={umbral}
            onChange={(e) => onChangeUmbral(Number(e.target.value))}
            className="w-full accent-[#881337] h-1.5 cursor-pointer"
          />
        </div>
      </TreeGroup>
    </div>
  );

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xlsm,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadFile(f);
          e.target.value = '';
        }}
      />

      {/* Panel Desktop (lg+) */}
      {collapsed ? (
        <aside className="hidden lg:flex w-10 min-w-[40px] max-w-[40px] shrink-0 bg-slate-50 border-r border-slate-200 flex-col items-center py-2.5 select-none">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expandir panel de opciones"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </aside>
      ) : (
        <aside className="hidden lg:flex lg:w-[265px] xl:w-[275px] shrink-0 bg-slate-50 border-r border-slate-200 flex-col min-h-0 select-none overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white shrink-0">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs tracking-tight">
              <Sliders className="w-3.5 h-3.5 text-[#881337]" />
              <span>Opciones de Análisis</span>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Plegar panel"
              className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          {sidebarBody}
        </aside>
      )}

      {/* Drawer Móvil y Tablet (< lg) */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[1px] lg:hidden"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[min(320px,88vw)] bg-slate-50 border-r border-slate-200 shadow-2xl flex flex-col min-h-0 select-none overflow-hidden lg:hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs tracking-tight">
                <Sliders className="w-3.5 h-3.5 text-[#881337]" />
                <span>Opciones de Análisis</span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                title="Cerrar panel"
                aria-label="Cerrar panel"
                className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {sidebarBody}
          </aside>
        </>
      )}
    </>
  );
};
