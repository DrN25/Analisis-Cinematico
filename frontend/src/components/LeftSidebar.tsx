import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  Upload,
} from 'lucide-react';
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
  onLoadEjemplo: () => void;
  uploading: boolean;
}

const inputCls =
  'w-full min-w-0 px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/20 font-mono';
const selectCls =
  'w-full min-w-0 px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#881337] truncate';
const labelCls = 'block text-[11px] font-medium text-slate-700 mb-0.5 select-none truncate';

interface TreeGroupProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const TreeGroup: React.FC<TreeGroupProps> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded overflow-hidden bg-white mb-2 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 border-b border-slate-200 text-xs font-semibold text-slate-800 select-none text-left transition-colors"
      >
        <span className="truncate">{title}</span>
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
  onLoadEjemplo,
  uploading,
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

  const toggleElemento = (elem: 'polos' | 'planos' | 'intersecciones') => {
    const base = opciones.mostrar ?? ['polos'];
    const set = new Set(base);
    if (set.has(elem)) {
      if (set.size > 1) set.delete(elem);
    } else {
      set.add(elem);
    }
    setOpt('mostrar', Array.from(set));
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
    <aside className="w-80 min-w-[320px] max-w-[320px] shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col min-h-0 select-none overflow-hidden">
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
          className="p-1 rounded hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Árbol de opciones */}
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

        {/* 1. Datos y Filtros */}
        <TreeGroup title="Datos y Filtros" defaultOpen={true}>
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono min-w-0">
            <span className="truncate font-medium text-slate-800" title={filename}>
              {filename}
            </span>
            <span className="shrink-0 text-slate-500 ml-1">
              ({totalRows} {descartadasCount > 0 ? `· ${descartadasCount} desc.` : ''})
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 border border-slate-300 hover:bg-slate-50 bg-white rounded text-slate-700 text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#881337]" />
              <span>{uploading ? 'Leyendo…' : 'Subir archivo'}</span>
            </button>
            <button
              type="button"
              onClick={onLoadEjemplo}
              className="text-xs text-[#881337] hover:underline font-medium shrink-0 px-1"
            >
              Usar ejemplo
            </button>
          </div>

          {tiposDisponibles.length > 0 && (
            <div className="pt-1">
              <span className={labelCls}>Tipos de estructuras incluidas</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {tiposDisponibles.map((t) => {
                  const active = tiposActivos.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTipo(t)}
                      className={`px-2 py-0.5 text-[11px] border rounded transition-colors ${
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
            <label className="text-xs text-slate-700 font-medium truncate">
              Persistencia mínima (m)
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
        </TreeGroup>

        {/* 2. Geometría del Talud */}
        <TreeGroup title="Geometría del Talud" defaultOpen={true}>
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              type="text"
              value={talud.nombre}
              onChange={(e) => onChangeTalud({ ...talud, nombre: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <div className="min-w-0">
              <label className={labelCls}>Buzamiento ψs (°)</label>
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
              <label className={labelCls}>Dir. Buzamiento αs (°)</label>
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

        {/* 3. Parámetros Cinemáticos (Dips) */}
        <TreeGroup title="Parámetros Cinemáticos" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <div className="min-w-0">
              <label className={labelCls}>Fricción φ (°)</label>
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
              <label className={labelCls}>LL Planar ±°</label>
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
              <label className={labelCls}>LL Flex. ±°</label>
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
              <label className={labelCls}>LL Dir. ±°</label>
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

          <div className="pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Umbral crítico SÍ/NO</label>
              <span className="font-mono font-bold text-xs text-[#881337]">{umbral} %</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={umbral}
              onChange={(e) => onChangeUmbral(Number(e.target.value))}
              className="w-full accent-[#881337] h-1.5"
            />
          </div>
        </TreeGroup>

        {/* 4. Opciones de Estereograma */}
        <TreeGroup title="Opciones de Estereograma" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <div className="min-w-0">
              <label className={labelCls}>Proyección</label>
              <select
                value={opciones.proyeccion}
                onChange={(e) =>
                  setOpt('proyeccion', e.target.value as 'equiarea' | 'equiangulo')
                }
                className={selectCls}
              >
                <option value="equiarea">Schmidt (Equiárea)</option>
                <option value="equiangulo">Wulff (Equiángulo)</option>
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
          </div>

          <div className="grid grid-cols-2 gap-2 min-w-0">
            <div className="min-w-0">
              <label className={labelCls}>Tipo de red</label>
              <select
                value={opciones.red}
                onChange={(e) =>
                  setOpt('red', e.target.value as 'polar' | 'ecuatorial' | 'ninguna')
                }
                className={selectCls}
              >
                <option value="polar">Polar</option>
                <option value="ecuatorial">Ecuatorial</option>
                <option value="ninguna">Ninguna</option>
              </select>
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Espaciado marcas</label>
              <select
                value={opciones.espaciado_marcas}
                onChange={(e) => setOpt('espaciado_marcas', Number(e.target.value))}
                className={selectCls}
              >
                <option value={5}>5°</option>
                <option value={10}>10°</option>
                <option value={15}>15°</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-100">
            <span className={labelCls}>Elementos proyectados</span>
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={opciones.mostrar === null}
                onChange={(e) => setOpt('mostrar', e.target.checked ? null : ['polos'])}
                className="accent-[#881337]"
              />
              <span>Automático según mecanismo</span>
            </label>
            {opciones.mostrar !== null && (
              <div className="pl-4 flex gap-3 pt-0.5">
                {(['polos', 'planos', 'intersecciones'] as const).map((elem) => (
                  <label
                    key={elem}
                    className="flex items-center gap-1 text-xs capitalize text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={opciones.mostrar?.includes(elem) ?? false}
                      onChange={() => toggleElemento(elem)}
                      className="accent-[#881337]"
                    />
                    <span>{elem}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-100">
            <span className={labelCls}>Densidad y Contornos</span>
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={opciones.contornos_general}
                onChange={(e) => setOpt('contornos_general', e.target.checked)}
                className="accent-[#881337]"
              />
              <span>Contornos en Estereograma General</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={opciones.contornos_en_mecanismos}
                onChange={(e) => setOpt('contornos_en_mecanismos', e.target.checked)}
                className="accent-[#881337]"
              />
              <span>Contornos en mecanismos</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100 text-xs min-w-0">
            <label className="flex items-center gap-1 text-slate-700 cursor-pointer truncate">
              <input
                type="checkbox"
                checked={opciones.marcas_exteriores}
                onChange={(e) => setOpt('marcas_exteriores', e.target.checked)}
                className="accent-[#881337]"
              />
              <span className="truncate">Marcas exteriores</span>
            </label>
            <label className="flex items-center gap-1 text-slate-700 cursor-pointer truncate">
              <input
                type="checkbox"
                checked={opciones.cruz_central}
                onChange={(e) => setOpt('cruz_central', e.target.checked)}
                className="accent-[#881337]"
              />
              <span className="truncate">Cruz central</span>
            </label>
            <label className="flex items-center gap-1 text-slate-700 cursor-pointer truncate">
              <input
                type="checkbox"
                checked={opciones.ejes_cruzados}
                onChange={(e) => setOpt('ejes_cruzados', e.target.checked)}
                className="accent-[#881337]"
              />
              <span className="truncate">Ejes N-S / E-W</span>
            </label>
            <label className="flex items-center gap-1 text-slate-700 cursor-pointer truncate">
              <input
                type="checkbox"
                checked={opciones.circulo_perimetral}
                onChange={(e) => setOpt('circulo_perimetral', e.target.checked)}
                className="accent-[#881337]"
              />
              <span className="truncate">Círculo borde</span>
            </label>
          </div>
        </TreeGroup>
      </div>
    </aside>
  );
};
