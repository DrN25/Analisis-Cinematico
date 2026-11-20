import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Play,
  Sliders,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';
import {
  DipsParams,
  FiltroParams,
  OpcionesPlot,
  TaludParams,
} from '../types';

interface Props {
  collapsed: boolean;
  onToggleCollapse: () => void;
  filename: string;
  totalRows: number;
  descartadasCount: number;
  tiposConteo: Record<string, number>;
  filtro: FiltroParams;
  onChangeFiltro: (f: FiltroParams) => void;
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
  running: boolean;
  uploading: boolean;
  hasPendingChanges?: boolean;
}

const inputCls =
  'w-full min-w-0 px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/20 font-mono';
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
  filename,
  totalRows,
  descartadasCount,
  tiposConteo,
  filtro,
  onChangeFiltro,
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
  running,
  uploading,
  hasPendingChanges = false,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const tiposDisponibles = Object.keys(tiposConteo);
  const tiposActivos = filtro.tipos ?? tiposDisponibles;

  const toggleTipo = (t: string) => {
    const set = new Set(tiposActivos);
    if (set.has(t)) {
      if (set.size > 1) set.delete(t);
    } else {
      set.add(t);
    }
    const next = Array.from(set);
    onChangeFiltro({
      ...filtro,
      tipos: next.length === tiposDisponibles.length ? null : next,
    });
  };

  const setOpt = <K extends keyof OpcionesPlot>(key: K, val: OpcionesPlot[K]) => {
    onChangeOpciones({ ...opciones, [key]: val });
  };


  if (collapsed) {
    return (
      <aside className="w-10 min-w-[40px] max-w-[40px] shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-2.5 select-none">
        <button
          onClick={onToggleCollapse}
          title="Expandir panel de opciones"
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[280px] min-w-[270px] max-w-[290px] shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col min-h-0 select-none overflow-hidden">
      {/* Cabecera del panel */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
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

      {/* Árbol de opciones con los 5 pasos numerados */}
      <div className="flex-1 overflow-y-auto p-2.5 min-h-0">
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

        {/* 1 · Datos de entrada */}
        <TreeGroup title="1 · Datos de entrada" defaultOpen={true}>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className={labelCls}>Archivo CSV o Excel</span>
              <HelpTooltip text="Columnas: Buz, DirBuz, Tipo, Persistencia (también Dip, Dip Direction, Type…). Solo Buz y DirBuz son obligatorias. La fila de encabezados puede no ser la primera." />
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
                title="Limpiar la carga del archivo anterior y reiniciar el área de trabajo"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Limpiar carga</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-0.5">
              <span>Límite: máx. 80 KB</span>
              <span>CSV, TXT, XLSX</span>
            </div>

            {tiposDisponibles.length > 0 && (
              <div className="pt-1 border-t border-slate-100">
                <span className={labelCls}>Tipos a analizar</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {tiposDisponibles.map((t) => {
                    const active = tiposActivos.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTipo(t)}
                        className={`px-2 py-0.5 text-[11px] border rounded transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#881337] border-[#881337] text-white font-medium'
                            : 'bg-white border-slate-200 text-slate-400 line-through'
                        }`}
                      >
                        {t} ({tiposConteo[t]})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <label className="text-xs text-slate-700 font-medium truncate flex items-center gap-1">
                <span>Persistencia mínima (m)</span>
                <HelpTooltip text="Se excluyen las estructuras más cortas. 0 = sin filtro." />
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={filtro.persistencia_min}
                onChange={(e) =>
                  onChangeFiltro({
                    ...filtro,
                    persistencia_min: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-20 px-2 py-0.5 text-xs text-right border border-slate-300 rounded font-mono focus:outline-none focus:border-[#881337]"
              />
            </div>
          </div>
        </TreeGroup>

        {/* 2 · Opciones del estereograma */}
        <TreeGroup title="2 · Opciones del estereograma" defaultOpen={true}>
          <p className="text-[10.5px] text-slate-500 italic pb-0.5">
            Solo cambian el dibujo; no recalculan el análisis. Más opciones en el menú superior.
          </p>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className={`${labelCls} flex items-center gap-1`}>
                <span>Tamaño de los polos</span>
                <HelpTooltip text="Tamaño base del símbolo de los polos. Con «Tamaño por persistencia» se multiplica por la clase de persistencia (ISRM)." />
              </label>
              <span className="font-mono text-xs text-[#881337] font-semibold">
                {opciones.tamano_polo ?? 10}
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={60}
              step={1}
              value={opciones.tamano_polo ?? 10}
              onChange={(e) => setOpt('tamano_polo', Number(e.target.value))}
              className="w-full accent-[#881337] h-1.5 cursor-pointer"
            />
          </div>

          <div className="min-w-0">
            <label className={labelCls}>Proyección</label>
            <select
              value={opciones.proyeccion}
              onChange={(e) =>
                setOpt('proyeccion', e.target.value as 'equiarea' | 'equiangulo')
              }
              className={selectCls}
            >
              <option value="equiarea">Equiárea (Schmidt)</option>
              <option value="equiangulo">Equiángulo (Wulff)</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className={labelCls}>Hemisferio</label>
            <select
              value={opciones.hemisferio}
              onChange={(e) =>
                setOpt('hemisferio', e.target.value as 'inferior' | 'superior')
              }
              className={selectCls}
            >
              <option value="inferior">Inferior</option>
              <option value="superior">Superior</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className={labelCls}>Red</label>
            <select
              value={opciones.red}
              onChange={(e) =>
                setOpt('red', e.target.value as 'polar' | 'ecuatorial' | 'ninguna')
              }
              className={selectCls}
            >
              <option value="ecuatorial">Ecuatorial</option>
              <option value="polar">Polar</option>
              <option value="ninguna">Ninguna</option>
            </select>
          </div>

          {/* Color de los contornos: Azules, Verdes, Morados, Grises */}
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <label className={`${labelCls} flex items-center gap-1`}>
                <span>Color de los contornos</span>
                <HelpTooltip text="Paleta de los contornos de densidad de polos en todas las vistas; distinta del rojo y naranja de las zonas críticas." />
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
              <HelpTooltip text="Contornos de densidad de polos en todas las vistas." />
            </div>

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
              <HelpTooltip text="Multiplica el tamaño base del símbolo por la clase de persistencia (ISRM)." />
            </div>

            <div className="flex items-center justify-between">
              <label
                className={`flex items-center gap-1.5 text-xs ${
                  totalRows > 0 && totalRows < 50
                    ? 'text-slate-700 cursor-pointer'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={totalRows <= 0 || totalRows >= 50}
                  checked={opciones.etiquetas_polos === 'todos' && totalRows > 0 && totalRows < 50}
                  onChange={(e) =>
                    setOpt('etiquetas_polos', e.target.checked ? 'todos' : 'ninguno')
                  }
                  className="accent-[#881337] rounded"
                />
                <span>Etiquetas de los polos (ID)</span>
              </label>
              <HelpTooltip
                text={
                  totalRows > 0 && totalRows < 50
                    ? 'Muestra el ID junto a cada polo.'
                    : `Muestra el ID junto a cada polo. Disponible con menos de 50 polos${
                        totalRows > 0 ? ` (hay ${totalRows})` : ''
                      }.`
                }
              />
            </div>
          </div>
        </TreeGroup>

        {/* Formulario de Análisis: 3 · Geometría del talud y 4 · Parámetros del análisis */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRunAnalysis();
          }}
          className="space-y-0"
        >
          {/* 3 · Geometría del talud */}
          <TreeGroup title="3 · Geometría del talud" defaultOpen={true}>
            <div>
              <label className={labelCls}>Nombre del talud</label>
              <input
                type="text"
                value={talud.nombre}
                onChange={(e) => onChangeTalud({ ...talud, nombre: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 min-w-0">
              <div className="min-w-0">
                <label className={`${labelCls} flex items-center gap-1`}>
                  <span>Buzamiento ψs (°)</span>
                  <HelpTooltip text="Inclinación del plano del talud respecto a la horizontal (1° a 90°)." />
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  step={1}
                  value={talud.buz}
                  onChange={(e) =>
                    onChangeTalud({
                      ...talud,
                      buz: Math.min(90, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div className="min-w-0">
                <label className={`${labelCls} flex items-center gap-1`}>
                  <span>Dir. buzamiento αs (°)</span>
                  <HelpTooltip text="Dirección azimutal de buzamiento del talud respecto al Norte (0° a 359.9°)." />
                </label>
                <input
                  type="number"
                  min={0}
                  max={359.9}
                  step={1}
                  value={talud.dirbuz}
                  onChange={(e) =>
                    onChangeTalud({
                      ...talud,
                      dirbuz: Math.min(359.9, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>
          </TreeGroup>

          {/* 4 · Parámetros del análisis */}
          <TreeGroup title="4 · Parámetros del análisis" defaultOpen={true}>
            <div className="grid grid-cols-2 gap-2 min-w-0">
              <div className="min-w-0">
                <label className={`${labelCls} flex items-center gap-1`}>
                  <span>Ángulo de fricción φ (°)</span>
                  <HelpTooltip text="Ángulo de fricción interna del macizo rocoso para el cono de fricción (0° a 89°)." />
                </label>
                <input
                  type="number"
                  min={0}
                  max={89}
                  step={1}
                  value={parametros.phi}
                  onChange={(e) =>
                    onChangeParametros({
                      ...parametros,
                      phi: Math.min(89, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div className="min-w-0">
                <label className={labelCls}>Ponderación</label>
                <select
                  value={parametros.ponderacion}
                  onChange={(e) =>
                    onChangeParametros({
                      ...parametros,
                      ponderacion: e.target.value as 'ninguna' | 'terzaghi',
                    })
                  }
                  className={selectCls}
                >
                  <option value="ninguna">Ninguna</option>
                  <option value="terzaghi">Terzaghi</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 min-w-0">
              <div className="min-w-0">
                <label className={`${labelCls} flex items-center gap-1`}>
                  <span>LL planar ±°</span>
                  <HelpTooltip text="Límite lateral angular para rotura planar (±° respecto a la dirección del talud)." />
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={parametros.ll_planar}
                  onChange={(e) =>
                    onChangeParametros({ ...parametros, ll_planar: Number(e.target.value) || 0 })
                  }
                  className={inputCls}
                />
              </div>
              <div className="min-w-0">
                <label className={`${labelCls} flex items-center gap-1`}>
                  <span>LL flexural ±°</span>
                  <HelpTooltip text="Límite lateral angular para toppling flexural (±°)." />
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={parametros.ll_flexural}
                  onChange={(e) =>
                    onChangeParametros({ ...parametros, ll_flexural: Number(e.target.value) || 0 })
                  }
                  className={inputCls}
                />
              </div>
              <div className="min-w-0">
                <label className={`${labelCls} flex items-center gap-1`}>
                  <span>LL directo ±°</span>
                  <HelpTooltip text="Límite lateral angular para toppling directo (±°)." />
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={parametros.ll_directo}
                  onChange={(e) =>
                    onChangeParametros({ ...parametros, ll_directo: Number(e.target.value) || 0 })
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <p className="text-[10.5px] text-slate-500 italic">
              LL: límite lateral.
            </p>

            {parametros.ponderacion === 'terzaghi' && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 min-w-0">
                <div className="min-w-0">
                  <label className={labelCls}>Azimut línea (°)</label>
                  <input
                    type="number"
                    min={0}
                    max={359.9}
                    value={parametros.azimut_muestreo}
                    onChange={(e) =>
                      onChangeParametros({
                        ...parametros,
                        azimut_muestreo: Number(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Inclinación (°)</label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={parametros.inclinacion_muestreo}
                    onChange={(e) =>
                      onChangeParametros({
                        ...parametros,
                        inclinacion_muestreo: Number(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {/* Botón Ejecutar Análisis en el paso 4 en gama de color vino/rojo */}
            <button
              type="submit"
              disabled={running || totalRows === 0}
              className={`w-full mt-1.5 py-1.5 px-3 rounded font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
                hasPendingChanges
                  ? 'bg-[#881337] hover:bg-[#6F0F2C] text-white ring-2 ring-[#881337]/30'
                  : 'bg-[#881337] hover:bg-[#6F0F2C] text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>
                {running
                  ? 'Calculando…'
                  : hasPendingChanges
                  ? 'Ejecutar análisis · Cambios pendientes'
                  : 'Ejecutar análisis'}
              </span>
            </button>
          </TreeGroup>
        </form>

        {/* 5 · Criterio del resumen */}
        <TreeGroup title="5 · Criterio del resumen" defaultOpen={true}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <label className="text-[10.5px] font-semibold text-slate-700 uppercase tracking-tight leading-tight flex items-center gap-1">
                <span>Porcentaje crítico de discontinuidades</span>
                <HelpTooltip
                  text="Un mecanismo es «SÍ» cuando su % crítico es mayor a este valor, que fija el ingeniero. Con 0 % basta un elemento crítico."
                  align="left"
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
            <p className="text-[10.5px] text-slate-500 italic">
              Umbral mínimo para considerar un mecanismo como cinemáticamente posible en el informe y resumen.
            </p>
          </div>
        </TreeGroup>
      </div>
    </aside>
  );
};
