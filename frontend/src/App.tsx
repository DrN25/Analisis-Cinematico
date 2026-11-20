import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Columns,
  FileSpreadsheet,
  Image as ImageIcon,
  KeyRound,
  LogOut,
  Maximize2,
  Play,
  Shield,
  Sliders,
  Table2,
  Upload,
  ZoomIn,
} from 'lucide-react';
import {
  ApiError,
  apiBlob,
  apiJson,
  getToken,
  setToken,
  setUnauthorizedHandler,
  triggerDownload,
} from './api';
import { AdminModal } from './components/AdminModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DataEditorModal } from './components/DataEditorModal';
import { HelpModal } from './components/HelpModal';
import { LeftSidebar } from './components/LeftSidebar';
import { LoginView } from './components/LoginView';
import { RightInspector, TablaExportKey } from './components/RightInspector';
import {
  AnalisisResponse,
  DEFAULT_OPCIONES_PLOT,
  DescartadaRow,
  DipsParams,
  DiscontinuidadRow,
  FiltroParams,
  OpcionesPlot,
  ParseArchivoResponse,
  TaludParams,
  User,
  VistaKey,
} from './types';

type MenuKey = 'archivo' | 'editar' | 'analisis' | 'ver' | 'herramientas' | 'ayuda';

const VISTAS: { id: VistaKey; label: string }[] = [
  { id: 'general', label: 'Estereograma General' },
  { id: 'planar', label: 'Rotura Planar' },
  { id: 'cuna', label: 'Rotura en Cuña' },
  { id: 'flexural', label: 'Toppling Flexural' },
  { id: 'directo', label: 'Toppling Directo' },
  { id: 'roseta', label: 'Roseta de Rumbos' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);

  const [filename, setFilename] = useState('discontinuidades_ejemplo.csv');
  const [rows, setRows] = useState<DiscontinuidadRow[]>([]);
  const [descartadas, setDescartadas] = useState<DescartadaRow[]>([]);
  const [tiposConteo, setTiposConteo] = useState<Record<string, number>>({});

  const [filtro, setFiltro] = useState<FiltroParams>({ tipos: null, persistencia_min: 0 });
  const [talud, setTalud] = useState<TaludParams>({ nombre: 'Talud 1', buz: 70, dirbuz: 180 });
  const [parametros, setParametros] = useState<DipsParams>({
    phi: 30,
    ll_planar: 20,
    ll_flexural: 20,
    ll_directo: 20,
    ponderacion: 'ninguna',
    azimut_muestreo: 0,
    inclinacion_muestreo: 0,
  });
  const [umbral, setUmbral] = useState(10);
  const [vista, setVista] = useState<VistaKey>('general');
  const [opciones, setOpciones] = useState<OpcionesPlot>(DEFAULT_OPCIONES_PLOT);

  const [analisis, setAnalisis] = useState<AnalisisResponse | null>(null);
  const [figuraSrc, setFiguraSrc] = useState<string | null>(null);
  const [zoomFull, setZoomFull] = useState(false);

  const [running, setRunning] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [showEditor, setShowEditor] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuBarRef = useRef<HTMLDivElement | null>(null);
  const skipNextRedrawRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 4000);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setAnalisis(null);
      setFiguraSrc(null);
    });
  }, []);

  // Cierre de menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // F1 para ayuda
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const runAnalysis = useCallback(
    async (
      customRows?: DiscontinuidadRow[],
      customFiltro?: FiltroParams,
      customVista?: VistaKey,
    ): Promise<AnalisisResponse | null> => {
      const targetRows = customRows ?? rows;
      const targetFiltro = customFiltro ?? filtro;
      const targetVista = customVista ?? vista;
      if (targetRows.length === 0) return null;

      setRunning(true);
      setErrorMsg(null);
      try {
        const res = await apiJson<AnalisisResponse>('/api/analisis/ejecutar', {
          method: 'POST',
          body: JSON.stringify({
            filas: targetRows,
            talud,
            parametros,
            filtro: targetFiltro,
            umbral,
            vista: targetVista,
            opciones,
          }),
        });
        skipNextRedrawRef.current = true;
        setAnalisis(res);
        setDescartadas(res.tablas.descartadas);
        setFiguraSrc(`data:image/png;base64,${res.figura_base64}`);
        return res;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Error al ejecutar análisis.');
        return null;
      } finally {
        setRunning(false);
      }
    },
    [rows, filtro, vista, talud, parametros, umbral, opciones],
  );

  const initWorkspace = useCallback(async () => {
    setErrorMsg(null);
    try {
      const ej = await apiJson<ParseArchivoResponse>('/api/analisis/ejemplo');
      setFilename(ej.filename);
      setRows(ej.rows);
      setDescartadas(ej.descartadas);
      setTiposConteo(ej.tipos_conteo);
      const initFiltro: FiltroParams = { tipos: null, persistencia_min: 0 };
      setFiltro(initFiltro);

      const res = await apiJson<AnalisisResponse>('/api/analisis/ejecutar', {
        method: 'POST',
        body: JSON.stringify({
          filas: ej.rows,
          talud,
          parametros,
          filtro: initFiltro,
          umbral,
          vista: 'general',
          opciones,
        }),
      });
      skipNextRedrawRef.current = true;
      setAnalisis(res);
      setFiguraSrc(`data:image/png;base64,${res.figura_base64}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo cargar el ejemplo inicial.');
    }
  }, [talud, parametros, umbral, opciones]);

  useEffect(() => {
    const tok = getToken();
    if (!tok) {
      setAuthChecking(false);
      return;
    }
    apiJson<User>('/api/auth/me')
      .then((u) => {
        setUser(u);
        return initWorkspace();
      })
      .catch(() => setToken(null))
      .finally(() => setAuthChecking(false));
  }, [initWorkspace]);

  useEffect(() => {
    if (!analisis?.analysis_id) return;
    if (skipNextRedrawRef.current) {
      skipNextRedrawRef.current = false;
      return;
    }

    const timer = window.setTimeout(async () => {
      setRedrawing(true);
      setErrorMsg(null);
      try {
        const { blob } = await apiBlob('/api/analisis/figura', {
          method: 'POST',
          body: JSON.stringify({
            analysis_id: analisis.analysis_id,
            vista,
            opciones,
          }),
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') setFiguraSrc(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'CACHE_MISS') {
          await runAnalysis(undefined, undefined, vista);
        } else {
          setErrorMsg(err instanceof Error ? err.message : 'No se pudo redibujar el estereograma.');
        }
      } finally {
        setRedrawing(false);
      }
    }, 140);

    return () => window.clearTimeout(timer);
  }, [vista, opciones, analisis?.analysis_id, runAnalysis]);

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const parsed = await apiJson<ParseArchivoResponse>('/api/analisis/parse-archivo', {
        method: 'POST',
        body: fd,
      });
      setFilename(parsed.filename);
      setRows(parsed.rows);
      setDescartadas(parsed.descartadas);
      setTiposConteo(parsed.tipos_conteo);
      const resetFiltro: FiltroParams = { tipos: null, persistencia_min: 0 };
      setFiltro(resetFiltro);
      await runAnalysis(parsed.rows, resetFiltro);
      const descTxt =
        parsed.descartadas.length > 0 ? ` (${parsed.descartadas.length} descartadas)` : '';
      notify(`Archivo cargado: ${parsed.filename} · ${parsed.rows.length} datos${descTxt}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadEjemplo = async () => {
    setUploading(true);
    try {
      const ej = await apiJson<ParseArchivoResponse>('/api/analisis/ejemplo');
      setFilename(ej.filename);
      setRows(ej.rows);
      setDescartadas(ej.descartadas);
      setTiposConteo(ej.tipos_conteo);
      const resetFiltro: FiltroParams = { tipos: null, persistencia_min: 0 };
      setFiltro(resetFiltro);
      await runAnalysis(ej.rows, resetFiltro);
      notify(`Ejemplo cargado: ${ej.rows.length} datos`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar ejemplo.');
    } finally {
      setUploading(false);
    }
  };

  const withAnalysisRetry = async (action: (analysisId: string) => Promise<void>) => {
    if (!analisis) return;
    try {
      await action(analisis.analysis_id);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CACHE_MISS') {
        const refreshed = await runAnalysis();
        if (refreshed) {
          await action(refreshed.analysis_id);
        }
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Error al exportar.');
      }
    }
  };

  const handleExport = async (tipo: 'excel' | 'png' | 'zip') => {
    if (!analisis) return;
    setExporting(tipo);
    setErrorMsg(null);
    try {
      await withAnalysisRetry(async (analysisId) => {
        const { blob, filename: dlName } = await apiBlob(`/api/analisis/exportar/${tipo}`, {
          method: 'POST',
          body: JSON.stringify({ analysis_id: analysisId, vista, umbral, opciones }),
        });
        const fallback =
          tipo === 'excel'
            ? 'analisis_cinematico.xlsx'
            : tipo === 'png'
            ? `estereograma_${vista}.png`
            : 'resultados_cinematico.zip';
        triggerDownload(blob, dlName || fallback);
      });
    } finally {
      setExporting(null);
    }
  };

  const handleExportTableCsv = async (tabla: TablaExportKey) => {
    await withAnalysisRetry(async (analysisId) => {
      const { blob, filename: dlName } = await apiBlob(
        `/api/analisis/exportar/tabla-csv/${tabla}`,
        {
          method: 'POST',
          body: JSON.stringify({ analysis_id: analysisId, vista, umbral, opciones }),
        },
      );
      triggerDownload(blob, dlName || `${tabla}.csv`);
    });
  };

  const handleExportCunaExcel = async () => {
    await withAnalysisRetry(async (analysisId) => {
      const { blob, filename: dlName } = await apiBlob('/api/analisis/exportar/cuna-excel', {
        method: 'POST',
        body: JSON.stringify({ analysis_id: analysisId, vista, umbral, opciones }),
      });
      triggerDownload(blob, dlName || 'cuna_criticas.xlsx');
    });
  };

  const handleLogout = async () => {
    try {
      await apiJson('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignorar
    }
    setToken(null);
    setUser(null);
    setAnalisis(null);
    setFiguraSrc(null);
  };

  if (authChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 text-xs font-mono text-slate-500">
        Iniciando sesión…
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        onSuccess={(u) => {
          setUser(u);
          initWorkspace();
        }}
      />
    );
  }

  const veredictosActivos = (analisis?.veredictos || []).map((v) => ({
    ...v,
    posible: v.criticos > 0 && v.porcentaje >= umbral,
  }));
  const posibles = veredictosActivos.filter((v) => v.posible);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-100 text-slate-800 font-sans select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xlsm,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUploadFile(f);
          e.target.value = '';
        }}
      />

      {/* Toast de notificación */}
      {toastMsg && (
        <div className="fixed top-14 right-4 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded shadow-lg border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white ml-1 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* 1. BARRA DE MENÚ SUPERIOR DE ESCRITORIO */}
      <nav
        ref={menuBarRef}
        className="h-6 shrink-0 bg-slate-100 border-b border-slate-300 px-2 flex items-center justify-between text-[11px] text-slate-700 relative z-40"
      >
        <div className="flex items-center gap-0.5">
          {/* Menú Archivo */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'archivo' ? null : 'archivo')}
              className={`px-2 py-0.5 rounded-sm hover:bg-slate-200 font-medium ${
                activeMenu === 'archivo' ? 'bg-slate-300' : ''
              }`}
            >
              Archivo
            </button>
            {activeMenu === 'archivo' && (
              <div className="absolute left-0 top-full mt-0.5 bg-white border border-slate-300 rounded shadow-lg py-1 min-w-[200px] text-xs z-50">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir archivo…</span>
                </button>
                <div className="h-px bg-slate-200 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    handleExport('excel');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Descargar en Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('png');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center gap-2"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#881337]" />
                  <span>Descargar en PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('zip');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center gap-2"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-700" />
                  <span>Descargar en ZIP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportCunaExcel();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Descargar cuña en Excel</span>
                </button>
                <div className="h-px bg-slate-200 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-rose-700 hover:text-white text-rose-700 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>

          {/* Menú Editar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'editar' ? null : 'editar')}
              className={`px-2 py-0.5 rounded-sm hover:bg-slate-200 font-medium ${
                activeMenu === 'editar' ? 'bg-slate-300' : ''
              }`}
            >
              Editar
            </button>
            {activeMenu === 'editar' && (
              <div className="absolute left-0 top-full mt-0.5 bg-white border border-slate-300 rounded shadow-lg py-1 min-w-[200px] text-xs z-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditor(true);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center gap-2"
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>Tabla de datos…</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPwd(true);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Cambiar contraseña…</span>
                </button>
              </div>
            )}
          </div>

          {/* Menú Análisis */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'analisis' ? null : 'analisis')}
              className={`px-2 py-0.5 rounded-sm hover:bg-slate-200 font-medium ${
                activeMenu === 'analisis' ? 'bg-slate-300' : ''
              }`}
            >
              Análisis
            </button>
            {activeMenu === 'analisis' && (
              <div className="absolute left-0 top-full mt-0.5 bg-white border border-slate-300 rounded shadow-lg py-1 min-w-[200px] text-xs z-50">
                <button
                  type="button"
                  onClick={() => {
                    runAnalysis();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center gap-2 font-medium"
                >
                  <Play className="w-3.5 h-3.5 text-[#881337]" />
                  <span>Recalcular (F5)</span>
                </button>
                <div className="h-px bg-slate-200 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setUmbral(10);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center justify-between"
                >
                  <span>Umbral crítico: 10% (Dips)</span>
                  {umbral === 10 && <span className="font-bold text-[#881337]">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUmbral(15);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center justify-between"
                >
                  <span>Umbral crítico: 15%</span>
                  {umbral === 15 && <span className="font-bold text-[#881337]">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUmbral(5);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center justify-between"
                >
                  <span>Umbral crítico: 5%</span>
                  {umbral === 5 && <span className="font-bold text-[#881337]">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Menú Ver */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'ver' ? null : 'ver')}
              className={`px-2 py-0.5 rounded-sm hover:bg-slate-200 font-medium ${
                activeMenu === 'ver' ? 'bg-slate-300' : ''
              }`}
            >
              Ver
            </button>
            {activeMenu === 'ver' && (
              <div className="absolute left-0 top-full mt-0.5 bg-white border border-slate-300 rounded shadow-lg py-1 min-w-[200px] text-xs z-50">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarCollapsed((c) => !c);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center justify-between"
                >
                  <span>Panel de opciones (Izquierda)</span>
                  {!sidebarCollapsed && <span className="font-bold text-[#881337]">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInspectorCollapsed((c) => !c);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center justify-between"
                >
                  <span>Inspector (Derecha)</span>
                  {!inspectorCollapsed && <span className="font-bold text-[#881337]">✓</span>}
                </button>
                <div className="h-px bg-slate-200 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setZoomFull(false);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white"
                >
                  Ajustar gráfico
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomFull(true);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white"
                >
                  Ampliar gráfico
                </button>
              </div>
            )}
          </div>

          {/* Menú Herramientas (si es admin) */}
          {user.rol_nombre === 'admin' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'herramientas' ? null : 'herramientas')}
                className={`px-2 py-0.5 rounded-sm hover:bg-slate-200 font-medium ${
                  activeMenu === 'herramientas' ? 'bg-slate-300' : ''
                }`}
              >
                Herramientas
              </button>
              {activeMenu === 'herramientas' && (
                <div className="absolute left-0 top-full mt-0.5 bg-white border border-slate-300 rounded shadow-lg py-1 min-w-[200px] text-xs z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdmin(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#881337]" />
                    <span>Administración y logs…</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Menú Ayuda */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'ayuda' ? null : 'ayuda')}
              className={`px-2 py-0.5 rounded-sm hover:bg-slate-200 font-medium ${
                activeMenu === 'ayuda' ? 'bg-slate-300' : ''
              }`}
            >
              Ayuda
            </button>
            {activeMenu === 'ayuda' && (
              <div className="absolute left-0 top-full mt-0.5 bg-white border border-slate-300 rounded shadow-lg py-1 min-w-[200px] text-xs z-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowHelp(true);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#881337] hover:text-white flex items-center justify-between"
                >
                  <span>Guía y referencias Dips</span>
                  <span className="text-[10px] text-slate-400 font-mono">F1</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info usuario derecha del menú */}
        <div className="flex items-center gap-2 font-mono text-[10.5px] text-slate-500">
          <span>{user.usuario} ({user.rol_nombre})</span>
        </div>
      </nav>

      {/* 2. BARRA DE HERRAMIENTAS RIBBON */}
      <div className="h-9 shrink-0 bg-[#F1F3F5] border-b border-slate-300 px-3 flex items-center justify-between text-xs select-none">
        {/* Acciones de herramientas */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto">
          <div className="flex items-center gap-2 mr-2 shrink-0">
            <img src="/logo.png" alt="Cinemático" className="w-5 h-5 object-contain" />
            <span className="font-bold text-xs text-slate-900 tracking-tight whitespace-nowrap">
              ANÁLISIS CINEMÁTICO
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0" />

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 border border-slate-300 hover:bg-white bg-slate-50/80 rounded text-slate-700 font-medium flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            title="Subir archivo"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>{uploading ? 'Leyendo…' : 'Subir archivo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEditor(true)}
            className="px-2 py-1 border border-slate-300 hover:bg-white bg-slate-50/80 rounded text-slate-700 font-medium flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            title="Ver tabla de discontinuidades"
          >
            <Table2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Tabla de datos ({rows.length})</span>
          </button>

          <button
            type="button"
            disabled={running}
            onClick={() => runAnalysis()}
            className="px-3.5 py-1 bg-[#881337] hover:bg-[#6F0F2C] text-white rounded font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
            title="Recalcular análisis"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>{running ? 'Calculando…' : 'Calcular'}</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0" />

          <button
            type="button"
            onClick={() => setZoomFull(false)}
            className={`p-1 border rounded text-slate-700 shadow-xs shrink-0 ${
              !zoomFull ? 'bg-slate-200/90 border-slate-400 font-semibold' : 'bg-slate-50/80 border-slate-300 hover:bg-white'
            }`}
            title="Ajustar a ventana"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setZoomFull(true)}
            className={`p-1 border rounded text-slate-700 shadow-xs shrink-0 ${
              zoomFull ? 'bg-slate-200/90 border-slate-400 font-semibold' : 'bg-slate-50/80 border-slate-300 hover:bg-white'
            }`}
            title="Ampliar gráfico"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0" />

          {/* Exportaciones */}
          <button
            type="button"
            disabled={!analisis || exporting !== null}
            onClick={() => handleExport('excel')}
            className="px-2 py-1 border border-slate-300 hover:bg-white bg-slate-50/80 rounded text-slate-700 font-medium flex items-center gap-1 shadow-xs disabled:opacity-50 shrink-0"
            title="Descargar en Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>{exporting === 'excel' ? '…' : 'Excel'}</span>
          </button>

          <button
            type="button"
            disabled={!analisis || exporting !== null}
            onClick={() => handleExport('png')}
            className="px-2 py-1 border border-slate-300 hover:bg-white bg-slate-50/80 rounded text-slate-700 font-medium flex items-center gap-1 shadow-xs disabled:opacity-50 shrink-0"
            title="Descargar en PNG"
          >
            <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
            <span>{exporting === 'png' ? '…' : 'PNG'}</span>
          </button>

          <button
            type="button"
            disabled={!analisis || exporting !== null}
            onClick={() => handleExport('zip')}
            className="px-2 py-1 border border-slate-300 hover:bg-white bg-slate-50/80 rounded text-slate-700 font-medium flex items-center gap-1 shadow-xs disabled:opacity-50 shrink-0"
            title="Descargar en ZIP"
          >
            <Archive className="w-3.5 h-3.5 text-amber-700" />
            <span>{exporting === 'zip' ? '…' : 'ZIP'}</span>
          </button>

          <button
            type="button"
            disabled={!analisis}
            onClick={handleExportCunaExcel}
            className="px-2 py-1 border border-slate-300 hover:bg-white bg-slate-50/80 rounded text-slate-700 font-medium flex items-center gap-1 shadow-xs disabled:opacity-50 shrink-0"
            title="Descargar cuña en Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Cuña</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0" />

          {/* Paneles */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={`p-1.5 border rounded text-slate-700 shadow-xs shrink-0 ${
              !sidebarCollapsed ? 'bg-slate-200/90 border-slate-400' : 'bg-slate-50/80 border-slate-300 hover:bg-white'
            }`}
            title="Alternar panel de opciones"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setInspectorCollapsed((c) => !c)}
            className={`p-1.5 border rounded text-slate-700 shadow-xs shrink-0 ${
              !inspectorCollapsed ? 'bg-slate-200/90 border-slate-400' : 'bg-slate-50/80 border-slate-300 hover:bg-white'
            }`}
            title="Alternar inspector de mecanismos"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>

          {/* Botón Admin */}
          {user.rol_nombre === 'admin' && (
            <button
              type="button"
              onClick={() => setShowAdmin(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-900 border border-slate-800 text-white rounded font-medium flex items-center gap-1 shadow-xs shrink-0"
            >
              <Shield className="w-3.5 h-3.5 text-rose-300" />
              <span>Admin</span>
            </button>
          )}
        </div>

        {/* Botón Cerrar Sesión claramente visible "de una" */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => setShowPwd(true)}
            className="p-1 hover:bg-slate-200/70 text-slate-600 rounded transition-colors"
            title="Cambiar contraseña"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-2.5 py-1 text-xs font-medium border border-slate-300 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-700 bg-white rounded flex items-center gap-1.5 transition-colors shadow-xs"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-600 group-hover:text-rose-700" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* 3. CUERPO PRINCIPAL */}
      <div className="flex-1 min-h-0 flex bg-slate-100">
        <LeftSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          filename={filename}
          totalRows={rows.length}
          descartadasCount={descartadas.length}
          tiposConteo={tiposConteo}
          filtro={filtro}
          onChangeFiltro={setFiltro}
          talud={talud}
          onChangeTalud={setTalud}
          parametros={parametros}
          onChangeParametros={setParametros}
          umbral={umbral}
          onChangeUmbral={setUmbral}
          opciones={opciones}
          onChangeOpciones={setOpciones}
          onUploadFile={handleUploadFile}
          onLoadEjemplo={handleLoadEjemplo}
          uploading={uploading}
        />

        {/* Viewport Central */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col bg-white">
          {errorMsg && (
            <div className="mx-3 mt-2 px-3 py-1.5 text-xs bg-red-50 border border-red-200 text-red-800 rounded flex items-center justify-between shrink-0 font-mono">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="font-bold ml-2 text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {analisis && (
            <div className="h-7 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between text-xs text-slate-700 shrink-0 select-none">
              <div className="flex items-center gap-2 min-w-0">
                {posibles.length > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#881337] shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <div className="truncate">
                  <span className="font-semibold text-slate-800">
                    {posibles.length > 0
                      ? `${posibles.length} de ${veredictosActivos.length} mecanismos cinemáticamente posibles:`
                      : 'Ningún mecanismo excede el umbral crítico'}
                  </span>{' '}
                  <span className="text-slate-600 font-mono text-[11px]">
                    {posibles.length > 0
                      ? posibles.map((p) => p.nombre).join(', ')
                      : `(umbral actual ${umbral} %)`}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-500 font-mono shrink-0">
                Umbral {umbral}%
              </span>
            </div>
          )}

          {/* Lienzo del Estereograma */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-3 overflow-auto bg-white">
            {(running || redrawing) && (
              <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded bg-slate-900/85 text-white text-xs font-mono shadow flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                <span>{running ? 'Calculando…' : 'Redibujando…'}</span>
              </div>
            )}
            {figuraSrc ? (
              <img
                src={figuraSrc}
                alt={`Estereograma ${vista}`}
                className={
                  zoomFull
                    ? 'max-w-none h-auto select-none'
                    : 'max-w-full max-h-full object-contain select-none'
                }
              />
            ) : (
              <div className="text-xs text-slate-400 font-mono">
                {running ? 'Generando estereograma…' : 'Sin gráfico disponible.'}
              </div>
            )}
          </div>

          {/* 4. PESTAÑAS DE VISTAS INFERIORES */}
          <div className="h-8 shrink-0 bg-slate-100 border-t border-slate-200 px-3 flex items-end gap-1 overflow-x-auto select-none">
            {VISTAS.map((v) => {
              const active = vista === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVista(v.id)}
                  className={`px-3 py-1.5 text-xs rounded-t border-t border-x transition-colors cursor-pointer ${
                    active
                      ? 'bg-white border-t-2 border-t-[#881337] border-slate-200 text-slate-900 font-semibold -mb-px z-10 shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-slate-200/70 text-slate-600 font-medium'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* 5. BARRA DE ESTADO INFERIOR LIMPIA */}
          <footer className="h-6 shrink-0 bg-slate-50 border-t border-slate-200 px-3 flex items-center justify-between text-[11px] text-slate-500 font-mono select-none">
            <div className="truncate">
              {analisis
                ? `${analisis.contexto.n_datos} discontinuidades · ${analisis.contexto.n_intersecciones.toLocaleString()} intersecciones · Talud ${talud.buz}°/${String(talud.dirbuz).padStart(3, '0')}° · φ = ${parametros.phi}°`
                : 'Sin datos'}
            </div>
            <div className="shrink-0 ml-3">
              {opciones.proyeccion === 'equiarea' ? 'Schmidt (Equiárea)' : 'Wulff (Equiángulo)'} · Hemisferio {opciones.hemisferio === 'inferior' ? 'Inferior' : 'Superior'}
            </div>
          </footer>
        </main>

        {/* Panel Derecho: Inspector de Mecanismos y Tablas */}
        <RightInspector
          data={analisis}
          vista={vista}
          umbral={umbral}
          onSelectVista={setVista}
          onExportTableCsv={handleExportTableCsv}
          onExportCunaExcel={handleExportCunaExcel}
          collapsed={inspectorCollapsed}
          onToggleCollapse={() => setInspectorCollapsed((c) => !c)}
        />
      </div>

      {/* Modales */}
      {showEditor && (
        <DataEditorModal
          rows={rows}
          descartadas={descartadas}
          onClose={() => setShowEditor(false)}
          onApplyAndRun={async (edited) => {
            setRows(edited);
            setShowEditor(false);
            await runAnalysis(edited);
            notify(`Tabla actualizada: ${edited.length} discontinuidades`);
          }}
        />
      )}

      {showAdmin && user.rol_nombre === 'admin' && (
        <AdminModal currentUser={user} onClose={() => setShowAdmin(false)} />
      )}

      {showPwd && (
        <ChangePasswordModal
          onClose={() => setShowPwd(false)}
          onChanged={() => {
            setShowPwd(false);
            setToken(null);
            setUser(null);
          }}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
