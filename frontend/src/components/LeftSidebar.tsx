import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Play,
  Sliders,
  Table2,
  Upload,
} from 'lucide-react';
import {
  DipsParams,
  FiltroParams,
  OpcionesPlot,
  TaludParams,
} from '../types';

type SidebarTab = 'analisis' | 'plot' | 'red';

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
  onOpenEditor: () => void;
  onRunAnalysis: () => void;
  running: boolean;
  uploading: boolean;
}

const inputCls =
  'w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#881337]';
const labelCls = 'block text-[11px] font-medium text-slate-600 mb-0.5';

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
  onOpenEditor,
  onRunAnalysis,
  running,
  uploading,
}) => {
  const [tab, setTab] = useState<SidebarTab>('analisis');
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
      <aside className="w-10 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-2 gap-2">
        <button
          onClick={onToggleCollapse}
          title="Expandir panel de controles"
          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onRunAnalysis}
          disabled={running}
          title="Ejecutar análisis"
          className="p-1.5 rounded bg-[#881337] text-white hover:bg-[#6F0F2C] disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[310px] shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-2 pt-2 pb-1.5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex bg-slate-200/70 p-0.5 rounded-lg flex-1 mr-1.5">
          {[
            { id: 'analisis', label: 'Análisis', icon: Compass },
            { id: 'plot', label: 'Plot', icon: Sliders },
            { id: 'red', label: 'Red', icon: Table2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as SidebarTab)}
              className={`flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded-md transition-colors ${
                tab === id
                  ? 'bg-white text-[#881337] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Ocultar panel"
          className="p-1 rounded hover:bg-slate-200/70 text-slate-500"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3 text-xs">
        {tab === 'analisis' && (
          <>
            <section className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  1 · Datos de entrada
                </span>
                <button
                  type="button"
                  onClick={onLoadEjemplo}
                  className="text-[11px] text-[#881337] hover:underline font-medium"
                >
                  Usar ejemplo
                </button>
              </div>

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

              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 border border-dashed border-slate-300 hover:border-[#881337] hover:bg-rose-50/40 rounded-lg text-slate-700 font-medium transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#881337]" />
                  {uploading ? 'Leyendo…' : 'Subir CSV / Excel'}
                </button>
                <button
                  type="button"
                  onClick={onOpenEditor}
                  className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center gap-1"
                >
                  <Table2 className="w-3.5 h-3.5" />
                  Tabla ({totalRows})
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200/80">
                <span className="truncate font-medium text-slate-700" title={filename}>
                  {filename}
                </span>
                {descartadasCount > 0 && (
                  <span className="text-amber-700 font-medium shrink-0 ml-2">
                    {descartadasCount} desc.
                  </span>
                )}
              </div>

              {tiposDisponibles.length > 0 && (
                <div>
                  <span className={labelCls}>Tipos de estructuras incluidas</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {tiposDisponibles.map((t) => {
                      const active = tiposActivos.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTipo(t)}
                          className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                            active
                              ? 'bg-[#881337]/10 border-[#881337]/40 text-[#881337] font-medium'
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

              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] text-slate-600">Persistencia mínima (m)</label>
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
                  className="w-20 px-2 py-1 text-xs text-right border border-slate-300 rounded focus:outline-none focus:border-[#881337]"
                />
              </div>
            </section>

            <hr className="border-slate-200" />

            <section className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                2 · Geometría del talud
              </span>
              <div>
                <label className={labelCls}>Nombre</label>
                <input
                  type="text"
                  value={talud.nombre}
                  onChange={(e) => onChangeTalud({ ...talud, nombre: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Buzamiento ψs (°)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    step={1}
                    value={talud.buz}
                    onChange={(e) =>
                      onChangeTalud({ ...talud, buz: Math.min(90, Math.max(1, Number(e.target.value) || 1)) })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Dir. Buzamiento αs (°)</label>
                  <input
                    type="number"
                    min={0}
                    max={359.9}
                    step={1}
                    value={talud.dirbuz}
                    onChange={(e) =>
                      onChangeTalud({ ...talud, dirbuz: Math.min(359.9, Math.max(0, Number(e.target.value) || 0)) })
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            <hr className="border-slate-200" />

            <section className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                3 · Parámetros (Dips)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
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
                <div>
                  <label className={labelCls}>Ponderación</label>
                  <select
                    value={parametros.ponderacion}
                    onChange={(e) =>
                      onChangeParametros({
                        ...parametros,
                        ponderacion: e.target.value as 'ninguna' | 'terzaghi',
                      })
                    }
                    className={inputCls}
                  >
                    <option value="ninguna">Ninguna</option>
                    <option value="terzaghi">Terzaghi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
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
                <div>
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
                <div>
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
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
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
                  <div>
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
            </section>

            <hr className="border-slate-200" />

            <section className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  4 · Porcentaje crítico SÍ/NO
                </span>
                <span className="font-display font-semibold text-xs text-[#881337]">{umbral} %</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={umbral}
                onChange={(e) => onChangeUmbral(Number(e.target.value))}
                className="w-full accent-[#881337]"
              />
              <p className="text-[10.5px] text-slate-500 leading-snug">
                No corresponde a un factor de seguridad ni probabilidad de falla; solo clasifica el resumen.
              </p>
            </section>
          </>
        )}

        {tab === 'plot' && (
          <div className="space-y-2.5">
            <p className="text-[11px] text-slate-500">
              Opciones de dibujo (solo redibujan el estereograma sin recalcular).
            </p>
            <label className="flex items-center gap-2 font-medium text-slate-700">
              <input
                type="checkbox"
                checked={opciones.mostrar === null}
                onChange={(e) => setOpt('mostrar', e.target.checked ? null : ['polos'])}
                className="accent-[#881337]"
              />
              Automático por mecanismo (Dips)
            </label>

            {opciones.mostrar !== null && (
              <div className="pl-5 flex flex-wrap gap-2">
                {(['polos', 'planos', 'intersecciones'] as const).map((el) => (
                  <label key={el} className="flex items-center gap-1 capitalize text-slate-700">
                    <input
                      type="checkbox"
                      checked={opciones.mostrar?.includes(el) ?? false}
                      onChange={() => toggleElemento(el)}
                      className="accent-[#881337]"
                    />
                    {el}
                  </label>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Planos dibujados</label>
                <select
                  value={opciones.filtro_planos}
                  onChange={(e) => setOpt('filtro_planos', e.target.value as 'criticos' | 'todos')}
                  className={inputCls}
                >
                  <option value="criticos">Solo críticos</option>
                  <option value="todos">Todos</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Intersecciones</label>
                <select
                  value={opciones.filtro_intersecciones}
                  onChange={(e) =>
                    setOpt('filtro_intersecciones', e.target.value as 'criticos' | 'todos')
                  }
                  className={inputCls}
                >
                  <option value="criticos">Solo críticas</option>
                  <option value="todos">Todas</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>ID en polos</label>
                <select
                  value={opciones.etiquetas_polos}
                  onChange={(e) =>
                    setOpt('etiquetas_polos', e.target.value as 'criticos' | 'todos' | 'ninguno')
                  }
                  className={inputCls}
                >
                  <option value="criticos">Solo críticos</option>
                  <option value="todos">Todos</option>
                  <option value="ninguno">Ninguno</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>ID en intersecc.</label>
                <select
                  value={opciones.etiquetas_intersecciones}
                  onChange={(e) =>
                    setOpt(
                      'etiquetas_intersecciones',
                      e.target.value as 'criticos' | 'todos' | 'ninguno',
                    )
                  }
                  className={inputCls}
                >
                  <option value="ninguno">Ninguno</option>
                  <option value="criticos">Solo críticas</option>
                  <option value="todos">Todas</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-2 grid grid-cols-1 gap-1.5">
              {(
                [
                  ['simbolo_por_tipo', 'Símbolo por tipo'],
                  ['tamano_por_persistencia', 'Tamaño por persistencia (ISRM)'],
                  ['contornos_general', 'Contornos de densidad (General)'],
                  ['contornos_en_mecanismos', 'Contornos tenues en mecanismos'],
                  ['caja_info', 'Cuadro de datos cinemáticos'],
                  ['titulo', 'Título en la figura'],
                  ['etiqueta_filtro', 'Etiqueta de filtro'],
                ] as const
              ).map(([k, txt]) => (
                <label key={k} className="flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(opciones[k])}
                    onChange={(e) => setOpt(k, e.target.checked)}
                    className="accent-[#881337]"
                  />
                  {txt}
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'red' && (
          <div className="space-y-2.5">
            <p className="text-[11px] text-slate-500">Stereonet Options (Dips)</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Proyección</label>
                <select
                  value={opciones.proyeccion}
                  onChange={(e) => setOpt('proyeccion', e.target.value as 'equiarea' | 'equiangulo')}
                  className={inputCls}
                >
                  <option value="equiarea">Equiárea (Schmidt)</option>
                  <option value="equiangulo">Equiángulo (Wulff)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Hemisferio</label>
                <select
                  value={opciones.hemisferio}
                  onChange={(e) => setOpt('hemisferio', e.target.value as 'inferior' | 'superior')}
                  className={inputCls}
                >
                  <option value="inferior">Inferior</option>
                  <option value="superior">Superior</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Etiquetas borde</label>
                <select
                  value={opciones.etiquetas}
                  onChange={(e) =>
                    setOpt('etiquetas', e.target.value as 'grados' | 'cardinales' | 'ambos' | 'ninguna')
                  }
                  className={inputCls}
                >
                  <option value="grados">Grados</option>
                  <option value="cardinales">Cardinales</option>
                  <option value="ambos">Ambos</option>
                  <option value="ninguna">Ninguna</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Ubicación leyenda</label>
                <select
                  value={opciones.ubicacion_leyenda}
                  onChange={(e) =>
                    setOpt(
                      'ubicacion_leyenda',
                      e.target.value as 'derecha' | 'izquierda' | 'abajo' | 'ninguna',
                    )
                  }
                  className={inputCls}
                >
                  <option value="derecha">Derecha</option>
                  <option value="izquierda">Izquierda</option>
                  <option value="abajo">Abajo</option>
                  <option value="ninguna">Ninguna</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Red (Overlay)</label>
                <select
                  value={opciones.red}
                  onChange={(e) => setOpt('red', e.target.value as 'ecuatorial' | 'polar' | 'ninguna')}
                  className={inputCls}
                >
                  <option value="ecuatorial">Ecuatorial</option>
                  <option value="polar">Polar</option>
                  <option value="ninguna">Ninguna</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Intervalo red (°)</label>
                <input
                  type="number"
                  min={2}
                  max={30}
                  step={1}
                  value={opciones.intervalo_red}
                  onChange={(e) => setOpt('intervalo_red', Number(e.target.value) || 10)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-2">
              {(
                [
                  ['marcas_exteriores', 'Marcas exteriores'],
                  ['circulo_perimetral', 'Círculo perimetral'],
                  ['cruz_central', 'Cruz central'],
                  ['ejes_cruzados', 'Ejes cruzados'],
                ] as const
              ).map(([k, txt]) => (
                <label key={k} className="flex items-center gap-1.5 text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(opciones[k])}
                    onChange={(e) => setOpt(k, e.target.checked)}
                    className="accent-[#881337]"
                  />
                  {txt}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className={labelCls}>Borde</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={opciones.ancho_borde}
                  onChange={(e) => setOpt('ancho_borde', Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Interno</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={opciones.ancho_interno}
                  onChange={(e) => setOpt('ancho_interno', Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Red</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={opciones.ancho_superposicion}
                  onChange={(e) => setOpt('ancho_superposicion', Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Escala leyenda ({opciones.escala_leyenda}%)</label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  step={5}
                  value={opciones.escala_leyenda}
                  onChange={(e) => setOpt('escala_leyenda', Number(e.target.value))}
                  className="w-full accent-[#881337]"
                />
              </div>
              <div>
                <label className={labelCls}>DPI exportar PNG</label>
                <select
                  value={opciones.dpi_exportar}
                  onChange={(e) => setOpt('dpi_exportar', Number(e.target.value))}
                  className={inputCls}
                >
                  <option value={150}>150 dpi</option>
                  <option value={200}>200 dpi</option>
                  <option value={300}>300 dpi</option>
                  <option value={600}>600 dpi</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-2.5 border-t border-slate-200 bg-slate-50/70">
        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={running || totalRows === 0}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#881337] hover:bg-[#6F0F2C] disabled:opacity-60 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          {running ? 'Calculando…' : 'Ejecutar análisis'}
        </button>
      </div>
    </aside>
  );
};
