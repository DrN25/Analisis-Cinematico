import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Image as ImageIcon,
  KeyRound,
  LogOut,
  Shield,
  Sliders,
  Upload,
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
import { ManualStructuresModal } from './components/ManualStructuresModal';
import { NumberInput } from './components/NumberInput';
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


const VISTAS: { id: VistaKey; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'planar', label: 'Rotura planar' },
  { id: 'cuna', label: 'Rotura en cuña' },
  { id: 'flexural', label: 'Toppling flexural' },
  { id: 'directo', label: 'Toppling directo' },
];

function getVisualOpcionesKey(op: OpcionesPlot): string {
  const { dpi_exportar: _ignored, ...visual } = op;
  return JSON.stringify(visual);
}

function cacheFigure(cache: Map<string, string>, key: string, dataUrl: string) {
  if (cache.size >= 15) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, dataUrl);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  const [running, setRunning] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [showEditor, setShowEditor] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [activeTab, setActiveTab] = useState<'analisis' | 'referencias'>('analisis');
  const [showDescargas, setShowDescargas] = useState(false);
  const [showMasOpciones, setShowMasOpciones] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const descargasRef = useRef<HTMLDivElement | null>(null);
  const masOpcionesRef = useRef<HTMLDivElement | null>(null);
  const figureCacheRef = useRef<Map<string, string>>(new Map());
  const lastRunSnapshotRef = useRef<{
    rows: DiscontinuidadRow[];
    filtro: FiltroParams;
    talud: TaludParams;
    parametros: DipsParams;
  } | null>(null);
  const opcionesRef = useRef(opciones);
  opcionesRef.current = opciones;
  const toastTimerRef = useRef<number | null>(null);

  const plotVisualKey = getVisualOpcionesKey(opciones);

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
      if (descargasRef.current && !descargasRef.current.contains(e.target as Node)) {
        setShowDescargas(false);
      }
      if (masOpcionesRef.current && !masOpcionesRef.current.contains(e.target as Node)) {
        setShowMasOpciones(false);
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

      const snapshot = {
        rows: targetRows,
        filtro: targetFiltro,
        talud,
        parametros,
      };
      const usedVisualKey = getVisualOpcionesKey(opciones);

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
        const dataUrl = `data:image/png;base64,${res.figura_base64}`;
        lastRunSnapshotRef.current = snapshot;
        figureCacheRef.current.clear();
        cacheFigure(figureCacheRef.current, `${res.analysis_id}|${targetVista}|${usedVisualKey}`, dataUrl);
        setAnalisis(res);
        setDescartadas(res.tablas.descartadas);
        setFiguraSrc(dataUrl);
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

  const rehydrateFromSnapshot = useCallback(
    async (targetVista: VistaKey): Promise<AnalisisResponse | null> => {
      const snap = lastRunSnapshotRef.current;
      if (!snap || snap.rows.length === 0) {
        return runAnalysis(undefined, undefined, targetVista);
      }

      const currentOpciones = opcionesRef.current;
      const usedVisualKey = getVisualOpcionesKey(currentOpciones);

      setRunning(true);
      setErrorMsg(null);
      try {
        const res = await apiJson<AnalisisResponse>('/api/analisis/ejecutar', {
          method: 'POST',
          body: JSON.stringify({
            filas: snap.rows,
            talud: snap.talud,
            parametros: snap.parametros,
            filtro: snap.filtro,
            umbral,
            vista: targetVista,
            opciones: currentOpciones,
          }),
        });
        const dataUrl = `data:image/png;base64,${res.figura_base64}`;
        figureCacheRef.current.clear();
        cacheFigure(figureCacheRef.current, `${res.analysis_id}|${targetVista}|${usedVisualKey}`, dataUrl);
        setAnalisis(res);
        setDescartadas(res.tablas.descartadas);
        setFiguraSrc(dataUrl);
        return res;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Error al reconstruir el análisis.');
        return null;
      } finally {
        setRunning(false);
      }
    },
    [runAnalysis, umbral],
  );

  const rehydrateFromSnapshotRef = useRef(rehydrateFromSnapshot);
  rehydrateFromSnapshotRef.current = rehydrateFromSnapshot;

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

      const currentOpciones = opcionesRef.current;
      const usedVisualKey = getVisualOpcionesKey(currentOpciones);

      const res = await apiJson<AnalisisResponse>('/api/analisis/ejecutar', {
        method: 'POST',
        body: JSON.stringify({
          filas: ej.rows,
          talud,
          parametros,
          filtro: initFiltro,
          umbral,
          vista: 'general',
          opciones: currentOpciones,
        }),
      });
      const dataUrl = `data:image/png;base64,${res.figura_base64}`;
      lastRunSnapshotRef.current = {
        rows: ej.rows,
        filtro: initFiltro,
        talud,
        parametros,
      };
      figureCacheRef.current.clear();
      cacheFigure(figureCacheRef.current, `${res.analysis_id}|general|${usedVisualKey}`, dataUrl);
      setAnalisis(res);
      setFiguraSrc(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo cargar el ejemplo inicial.');
    }
  }, [talud, parametros, umbral]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solo redibuja el estereograma al cambiar de vista o de opciones de dibujo (sin recalcular geometría/parámetros)
  useEffect(() => {
    if (!analisis?.analysis_id) return;

    const cacheKey = `${analisis.analysis_id}|${vista}|${plotVisualKey}`;
    const cached = figureCacheRef.current.get(cacheKey);
    if (cached) {
      setFiguraSrc(cached);
      setRedrawing(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setRedrawing(true);
      setErrorMsg(null);
      try {
        const { blob } = await apiBlob('/api/analisis/figura', {
          method: 'POST',
          signal: controller.signal,
          body: JSON.stringify({
            analysis_id: analisis.analysis_id,
            vista,
            opciones: opcionesRef.current,
          }),
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!cancelled && typeof reader.result === 'string') {
            cacheFigure(figureCacheRef.current, cacheKey, reader.result);
            setFiguraSrc(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        if (err instanceof ApiError && err.code === 'CACHE_MISS') {
          await rehydrateFromSnapshotRef.current(vista);
        } else {
          setErrorMsg(err instanceof Error ? err.message : 'No se pudo redibujar el estereograma.');
        }
      } finally {
        if (!cancelled) {
          setRedrawing(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [vista, plotVisualKey, analisis?.analysis_id]);

  const handleUploadFile = async (file: File) => {
    const MAX_FILE_SIZE_BYTES = 80 * 1024; // 80 KB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(
        `El archivo «${file.name}» excede el límite máximo permitido de 80 KB (pesa ${(file.size / 1024).toFixed(1)} KB). Por favor sube un archivo más liviano.`,
      );
      return;
    }
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
      notify(
        `Archivo cargado: ${parsed.filename} (${(file.size / 1024).toFixed(1)} KB) · ${parsed.rows.length} datos${descTxt}`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
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
        const refreshed = await rehydrateFromSnapshot(vista);
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

  const handleClearData = () => {
    setRows([]);
    setDescartadas([]);
    setTiposConteo({});
    setFilename('Sin archivo');
    setAnalisis(null);
    setFiguraSrc(null);
    figureCacheRef.current.clear();
    lastRunSnapshotRef.current = null;
    setErrorMsg(null);
    setFiltro({ tipos: null, persistencia_min: 0 });
    notify('Datos y resultados limpiados correctamente.');
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
    figureCacheRef.current.clear();
    lastRunSnapshotRef.current = null;
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

  const veredictosActivos = (analisis?.veredictos || [])
    .filter((v) => v.clave !== 'oblicuo')
    .map((v) => ({
      ...v,
      posible: v.criticos > 0 && v.porcentaje > umbral,
    }));
  const posibles = veredictosActivos.filter((v) => v.posible);

  const rawOblicuo =
    analisis?.oblicuo || (analisis?.veredictos || []).find((v) => v.clave === 'oblicuo');
  const oblicuo = rawOblicuo
    ? { ...rawOblicuo, posible: rawOblicuo.criticos > 0 && rawOblicuo.porcentaje > umbral }
    : undefined;

  let veredictoTitulo = '';
  let veredictoTexto = '';
  if (posibles.length === 0) {
    veredictoTitulo = 'Ningún mecanismo cinemáticamente posible';
    veredictoTexto = `Ningún mecanismo tiene un porcentaje crítico mayor a ${umbral} %.`;
  } else {
    const nombres = posibles.map((p) => p.nombre.toLowerCase());
    const lista =
      nombres.length === 1
        ? nombres[0]
        : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
    veredictoTitulo = `${posibles.length} de ${veredictosActivos.length} mecanismos cinemáticamente posibles`;
    veredictoTexto = `Posibles: ${lista} (porcentaje crítico mayor a ${umbral} %).`;
  }

  const advertenciaOblicuo =
    oblicuo && oblicuo.posible
      ? `Advertencia: toppling oblicuo (C2) con ${oblicuo.porcentaje.toFixed(1)} % de intersecciones críticas, mayor a ${umbral} %.`
      : '';

  return (
    <div className="min-h-[100dvh] lg:h-screen lg:overflow-hidden flex flex-col bg-slate-100 text-slate-800 font-sans select-none">
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
        <div className="fixed top-14 right-3 left-3 sm:left-auto sm:right-4 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded shadow-lg border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="flex-1 min-w-0">{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white ml-1 font-bold shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* 1. BARRA SUPERIOR: Pestañas [ Análisis ] [ Referencias ] y Sesión de usuario */}
      <nav className="min-h-8 shrink-0 bg-slate-100 border-b border-slate-300 px-2 sm:px-3 py-1 flex items-center justify-between gap-2 text-xs select-none">
        {/* Pestañas principales */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('analisis')}
            className={`px-2.5 sm:px-3 py-1 rounded text-xs transition-colors cursor-pointer ${activeTab === 'analisis'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-300 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
              }`}
          >
            Análisis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('referencias')}
            className={`px-2.5 sm:px-3 py-1 rounded text-xs transition-colors cursor-pointer ${activeTab === 'referencias'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-300 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
              }`}
          >
            Referencias
          </button>
        </div>

        {/* Info usuario y sesión derecha */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs max-w-[120px] sm:max-w-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="font-semibold truncate">{user.usuario}</span>
            <span className="text-slate-400 hidden md:inline shrink-0">({user.rol_nombre})</span>
          </div>

          <button
            type="button"
            onClick={() => setShowPwd(true)}
            className="px-2 py-0.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Cambiar contraseña"
            aria-label="Cambiar contraseña"
          >
            <KeyRound className="w-3 h-3 text-slate-500" />
            <span className="hidden sm:inline">Contraseña</span>
          </button>

          {user.rol_nombre === 'admin' && (
            <button
              type="button"
              onClick={() => setShowAdmin(true)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 border border-slate-800 text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Panel de Administración"
              aria-label="Panel de Administración"
            >
              <Shield className="w-3 h-3 text-rose-300" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="px-2 sm:px-2.5 py-0.5 border border-slate-300 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-700 bg-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-3 h-3 text-slate-500" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </nav>

      {/* 2. ENCABEZADO DE LA APLICACIÓN */}
      <header className="min-h-12 shrink-0 bg-white border-b border-slate-200 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {activeTab === 'analisis' && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden px-2.5 py-1.5 border border-[#881337]/30 bg-rose-50/70 hover:bg-rose-100/70 text-[#881337] rounded text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              aria-label="Abrir opciones y parámetros de análisis"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parámetros</span>
            </button>
          )}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-300 bg-slate-50 hidden sm:flex items-center justify-center p-0.5 shadow-2xs shrink-0">
            <svg width="32" height="32" viewBox="0 0 38 38" aria-hidden="true" fill="none">
              <circle cx="19" cy="19" r="17" stroke="#18202A" strokeWidth="2" />
              <path d="M2.5 19 C 8 27, 30 27, 35.5 19" stroke="#1F4E9C" strokeWidth="2" />
              <circle cx="19" cy="9" r="2.2" fill="#D9622B" />
              <circle cx="15" cy="11" r="2.2" fill="#D9622B" />
              <circle cx="25" cy="27" r="1.8" fill="#9AA5B1" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
              Análisis cinemático de taludes
            </h1>
            <p className="text-[11px] text-slate-500 leading-tight hidden sm:block truncate">
              Rotura planar · cuña · toppling flexural · toppling directo
            </p>
          </div>
        </div>

        {/* Botones de acción derecha con popovers */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Estereograma · más opciones */}
          <div className="relative" ref={masOpcionesRef}>
            <button
              type="button"
              onClick={() => {
                setShowMasOpciones((v) => !v);
                setShowDescargas(false);
              }}
              className="px-2.5 sm:px-3 py-1.5 border border-slate-300 hover:bg-slate-50 bg-white rounded text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="md:hidden">Más opciones</span>
              <span className="hidden md:inline">Estereograma · más opciones</span>
              {showMasOpciones ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {showMasOpciones && (
              <div className="fixed inset-x-3 top-[116px] sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-1 sm:w-80 max-h-[78vh] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl p-3.5 z-50 text-xs text-slate-700 space-y-3">
                <div className="font-semibold text-slate-800 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span>Más opciones del estereograma</span>
                  <button
                    type="button"
                    onClick={() => setShowMasOpciones(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                  >
                    ×
                  </button>
                </div>

                {/* Etiquetas y Red */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Etiquetas
                    </label>
                    <select
                      value={opciones.etiquetas}
                      onChange={(e) =>
                        setOpciones({
                          ...opciones,
                          etiquetas: e.target.value as 'grados' | 'cardinales' | 'ambos' | 'ninguna',
                        })
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                    >
                      <option value="grados">Grados</option>
                      <option value="cardinales">Cardinales</option>
                      <option value="ambos">Ambos</option>
                      <option value="ninguna">Ninguna</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Ubicación leyenda
                    </label>
                    <select
                      value={opciones.ubicacion_leyenda}
                      onChange={(e) =>
                        setOpciones({
                          ...opciones,
                          ubicacion_leyenda: e.target.value as 'derecha' | 'izquierda' | 'abajo' | 'ninguna',
                        })
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                    >
                      <option value="derecha">Derecha</option>
                      <option value="izquierda">Izquierda</option>
                      <option value="abajo">Abajo</option>
                      <option value="ninguna">Ninguna</option>
                    </select>
                  </div>
                </div>

                {/* Espaciados y Grosores */}
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput
                    label="Espaciado de marcas (°)"
                    value={opciones.espaciado_marcas ?? 10}
                    min={1}
                    max={45}
                    step={1}
                    onChange={(v) => setOpciones({ ...opciones, espaciado_marcas: v })}
                  />
                  <NumberInput
                    label="Intervalo de la red (°)"
                    value={opciones.intervalo_red ?? 10}
                    min={2}
                    max={30}
                    step={1}
                    onChange={(v) => setOpciones({ ...opciones, intervalo_red: v })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <NumberInput
                    label="Borde"
                    value={opciones.ancho_borde ?? 3}
                    min={0}
                    max={10}
                    step={0.5}
                    help="Grosor del círculo exterior"
                    onChange={(v) => setOpciones({ ...opciones, ancho_borde: v })}
                  />
                  <NumberInput
                    label="Interno"
                    value={opciones.ancho_interno ?? 1}
                    min={0}
                    max={10}
                    step={0.5}
                    help="Grosor de las líneas internas"
                    onChange={(v) => setOpciones({ ...opciones, ancho_interno: v })}
                  />
                  <NumberInput
                    label="Red"
                    value={opciones.ancho_superposicion ?? 1}
                    min={0}
                    max={10}
                    step={0.5}
                    help="Grosor de la red"
                    onChange={(v) => setOpciones({ ...opciones, ancho_superposicion: v })}
                  />
                </div>

                {/* Filtros de planos e intersecciones */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Planos dibujados
                    </label>
                    <select
                      value={opciones.filtro_planos}
                      onChange={(e) =>
                        setOpciones({
                          ...opciones,
                          filtro_planos: e.target.value as 'criticos' | 'todos',
                        })
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                    >
                      <option value="criticos">Solo críticos</option>
                      <option value="todos">Todos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Intersecciones
                    </label>
                    <select
                      value={opciones.filtro_intersecciones}
                      onChange={(e) =>
                        setOpciones({
                          ...opciones,
                          filtro_intersecciones: e.target.value as 'criticos' | 'todos',
                        })
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                    >
                      <option value="criticos">Solo críticas</option>
                      <option value="todos">Todas</option>
                    </select>
                  </div>
                </div>

                {/* Escala de leyenda */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-medium text-slate-600">
                      Escala de leyenda (%)
                    </label>
                    <span className="font-mono text-xs text-slate-700">
                      {opciones.escala_leyenda ?? 100}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    step={5}
                    value={opciones.escala_leyenda ?? 100}
                    onChange={(e) =>
                      setOpciones({ ...opciones, escala_leyenda: Number(e.target.value) })
                    }
                    className="w-full accent-[#881337] h-1.5 cursor-pointer"
                  />
                </div>

                {/* Casillas de verificación avanzadas */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opciones.marcas_exteriores ?? true}
                      onChange={(e) =>
                        setOpciones({ ...opciones, marcas_exteriores: e.target.checked })
                      }
                      className="rounded text-[#881337] focus:ring-[#881337]"
                    />
                    <span>Marcas exteriores</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opciones.circulo_perimetral ?? true}
                      onChange={(e) =>
                        setOpciones({ ...opciones, circulo_perimetral: e.target.checked })
                      }
                      className="rounded text-[#881337] focus:ring-[#881337]"
                    />
                    <span>Círculo perimetral</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opciones.cruz_central ?? true}
                      onChange={(e) =>
                        setOpciones({ ...opciones, cruz_central: e.target.checked })
                      }
                      className="rounded text-[#881337] focus:ring-[#881337]"
                    />
                    <span>Cruz central</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opciones.ejes_cruzados ?? false}
                      onChange={(e) =>
                        setOpciones({ ...opciones, ejes_cruzados: e.target.checked })
                      }
                      className="rounded text-[#881337] focus:ring-[#881337]"
                    />
                    <span>Ejes cruzados</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opciones.simbolo_por_tipo ?? true}
                      onChange={(e) =>
                        setOpciones({ ...opciones, simbolo_por_tipo: e.target.checked })
                      }
                      className="rounded text-[#881337] focus:ring-[#881337]"
                    />
                    <span>Símbolo por tipo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opciones.etiqueta_filtro ?? true}
                      onChange={(e) =>
                        setOpciones({ ...opciones, etiqueta_filtro: e.target.checked })
                      }
                      className="rounded text-[#881337] focus:ring-[#881337]"
                    />
                    <span>Etiqueta de filtro</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opciones.caja_info ?? true}
                      onChange={(e) =>
                        setOpciones({ ...opciones, caja_info: e.target.checked })
                      }
                      className="rounded text-[#881337] focus:ring-[#881337]"
                    />
                    <span>Cuadro de datos</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opciones.titulo ?? true}
                      onChange={(e) =>
                        setOpciones({ ...opciones, titulo: e.target.checked })
                      }
                      className="rounded text-[#881337] focus:ring-[#881337]"
                    />
                    <span>Título</span>
                  </label>
                </div>

                {/* Resolución al exportar (dpi) */}
                <div className="pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-medium text-slate-600">
                      Resolución al exportar (dpi)
                    </label>
                    <span className="font-mono text-xs text-[#881337] font-semibold">
                      {opciones.dpi_exportar ?? 300} dpi
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={(() => {
                      const idx = [150, 200, 300, 600].indexOf(opciones.dpi_exportar ?? 300);
                      return idx >= 0 ? idx : 2;
                    })()}
                    onChange={(e) => {
                      const values = [150, 200, 300, 600];
                      setOpciones({ ...opciones, dpi_exportar: values[Number(e.target.value)] });
                    }}
                    className="w-full accent-[#881337] h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5 mt-0.5">
                    <span>150</span>
                    <span>200</span>
                    <span>300</span>
                    <span>600</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Descargar resultados */}
          <div className="relative" ref={descargasRef}>
            <button
              type="button"
              onClick={() => {
                setShowDescargas((v) => !v);
                setShowMasOpciones(false);
              }}
              className="px-2.5 sm:px-3 py-1.5 border border-slate-300 hover:bg-slate-50 bg-white rounded text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="md:hidden">Descargar</span>
              <span className="hidden md:inline">Descargar resultados</span>
              {showDescargas ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {showDescargas && (
              <div className="fixed inset-x-3 top-[116px] sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-1 sm:w-80 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-50 text-xs text-slate-700 space-y-2">
                <p className="text-[11px] text-slate-500 italic pb-1 border-b border-slate-100 leading-snug">
                  Los archivos se generan en tu equipo; los datos no se suben a ningún servidor.
                </p>

                <button
                  type="button"
                  disabled={!analisis || exporting !== null}
                  onClick={() => {
                    handleExport('excel');
                    setShowDescargas(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Preparar Excel</span>
                </button>

                <button
                  type="button"
                  disabled={!analisis || exporting !== null}
                  onClick={() => {
                    handleExport('zip');
                    setShowDescargas(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Archive className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Preparar ZIP (Excel + PNG + CSV)</span>
                </button>

                <button
                  type="button"
                  disabled={!analisis || exporting !== null}
                  onClick={() => {
                    handleExport('png');
                    setShowDescargas(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-[#881337] shrink-0" />
                  <span>Preparar PNG de la vista activa ({opciones.dpi_exportar ?? 300} dpi)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. VISTA PRINCIPAL O REFERENCIAS */}
      {activeTab === 'referencias' ? (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              Referencias
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Para la construcción de la aplicación se utilizó la siguiente bibliografía técnica:
            </p>
            <ul className="text-xs text-slate-700 space-y-3 leading-relaxed list-disc list-inside">
              <li>
                <strong>Diederichs, M. S. (1990).</strong> <em>DIPS: An interactive and graphical approach to the analysis of orientation based data</em> [Tesis de maestría, University of Toronto].
              </li>
              <li>
                <strong>Hocking, G. (1976).</strong> A method for distinguishing between single and double plane sliding of tetrahedral wedges. <em>International Journal of Rock Mechanics and Mining Sciences & Geomechanics Abstracts, 13</em>(7), 225–226.
              </li>
              <li>
                <strong>Hudson, J. A., & Harrison, J. P. (2000).</strong> <em>Engineering rock mechanics: An introduction to the principles</em>. Pergamon.
              </li>
              <li>
                <strong>Kliche, C. A. (2019).</strong> <em>Rock slope stability</em> (2.ª ed.). Society for Mining, Metallurgy & Exploration.
              </li>
              <li>
                <strong>Priest, S. D. (1985).</strong> <em>Hemispherical projection methods in rock mechanics</em>. George Allen & Unwin.
              </li>
              <li>
                <strong>Rocscience Inc. (s. f.-a).</strong> <em>Direct toppling</em>. Rocscience Documentation.
              </li>
              <li>
                <strong>Rocscience Inc. (s. f.-b).</strong> <em>Flexural toppling</em>. Rocscience Documentation.
              </li>
              <li>
                <strong>Rocscience Inc. (s. f.-c).</strong> <em>Kinematic analysis overview</em>. Rocscience Documentation.
              </li>
              <li>
                <strong>Rocscience Inc. (s. f.-d).</strong> <em>Planar sliding</em>. Rocscience Documentation.
              </li>
              <li>
                <strong>Rocscience Inc. (s. f.-e).</strong> <em>6 – Kinematic analysis tutorial</em>. Rocscience Documentation.
              </li>
              <li>
                <strong>Rocscience Inc. (s. f.-f).</strong> <em>Wedge sliding</em>. Rocscience Documentation.
              </li>
              <li>
                <strong>Rocscience Inc. (2012).</strong> <em>Dips: Graphical and statistical analysis of orientation data. Verification manual</em>. Rocscience Inc.
              </li>
              <li>
                <strong>Wyllie, D. C. (2018).</strong> <em>Rock slope engineering: Civil applications</em> (5.ª ed.). CRC Press.
              </li>
            </ul>
          </div>
        </div>
      ) : (
        /* 4. CUERPO PRINCIPAL DE ANÁLISIS */
        <div className="flex-1 min-h-0 flex relative bg-slate-100 lg:overflow-hidden">
          <LeftSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
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
            onClearData={handleClearData}
            onRunAnalysis={() => runAnalysis()}
            onOpenEditor={() => setShowEditor(true)}
            onOpenManualAdd={() => setShowManualAdd(true)}
            running={running}
            uploading={uploading}
          />

          {/* Viewport Central */}
          <main className="flex-1 min-w-0 min-h-0 flex flex-col bg-white lg:overflow-hidden">
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

            {analisis ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden p-2.5 sm:p-3 lg:p-3.5">
                {/* 1. Encabezado del Resumen */}
                <div className="shrink-0 mb-2">
                  <h3 className="text-base font-bold text-[#18202A] tracking-tight mb-0.5 font-sans leading-tight">
                    Resumen del análisis cinemático
                  </h3>
                  <div className="ac-contexto">
                    Talud {analisis.contexto.buz}° / {String(analisis.contexto.dirbuz).padStart(3, '0')}° · φ = {analisis.contexto.phi}° · {analisis.contexto.n_datos} discontinuidades · {analisis.contexto.n_intersecciones.toLocaleString()} intersecciones · {analisis.contexto.filtro ? analisis.contexto.filtro.split(' · N =')[0] : 'Sin filtro'}
                  </div>

                  {/* Veredicto HTML */}
                  <div className={`ac-veredicto ${posibles.length > 0 ? 'ac-veredicto-si' : 'ac-veredicto-no'}`}>
                    {posibles.length > 0 ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B93815" strokeWidth="2" aria-hidden="true" className="shrink-0">
                        <path d="M12 3l9.5 17h-19z" />
                        <path d="M12 10v4" />
                        <path d="M12 17.2v.1" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F4E9C" strokeWidth="2" aria-hidden="true" className="shrink-0">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M8 12.5l2.7 2.7L16 9.8" />
                      </svg>
                    )}
                    <div className="min-w-0">
                      <b>{veredictoTitulo}</b>
                      <br />
                      <span>{veredictoTexto}</span>
                      {advertenciaOblicuo && (
                        <>
                          <br />
                          <span className="ac-advertencia">⚠ {advertenciaOblicuo}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Cuerpo: tarjetas (izquierda) + estereograma+notas (derecha) */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 lg:gap-3 min-w-0">
                  {/* Columna Tarjetas Apiladas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-2 lg:gap-1.5 shrink-0 w-full lg:w-[215px] xl:w-[220px] 2xl:w-[235px] p-1 lg:overflow-y-auto">
                    {veredictosActivos.map((v) => {
                      const active = vista === v.clave;
                      const si = v.posible;
                      const insignia = si ? 'SÍ' : 'NO';
                      const claseIns = si ? 'ac-insignia-si' : 'ac-insignia-no';
                      let claseTar = si ? 'ac-tarjeta-si' : 'ac-tarjeta-no';
                      const relleno = si ? '#D9622B' : '#8FB0DA';
                      const barra = Math.min(100, (v.porcentaje / 50) * 100);
                      const marca = Math.min(100, (umbral / 50) * 100);

                      let extra = null;
                      if (v.clave === 'directo' && oblicuo) {
                        if (oblicuo.posible && !si) {
                          claseTar = 'ac-tarjeta-adv';
                        }
                        const c2Barra = Math.min(100, (oblicuo.porcentaje / 50) * 100);
                        const c2Relleno = oblicuo.posible ? '#D97706' : '#8FB0DA';
                        extra = (
                          <div className={`ac-c2-box ${oblicuo.posible ? 'ac-c2-box-adv' : ''}`}>
                            <div className="ac-cab">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="ac-tag ac-tag-c2">C2</span>
                                <span className="text-[11.5px] font-semibold text-[#18202A] truncate">
                                  Toppling oblicuo
                                </span>
                              </span>
                              <span className={`ac-insignia ${oblicuo.posible ? 'ac-insignia-adv' : 'ac-insignia-no'}`}>
                                {oblicuo.posible ? 'SÍ' : 'NO'}
                              </span>
                            </div>
                            <div className="ac-pct">
                              <span className="ac-c2-num tabular-nums">{oblicuo.porcentaje.toFixed(1)}</span>
                              <span className="ac-unid">% crítico</span>
                            </div>
                            <div className="ac-n">{oblicuo.detalles[0]}</div>
                            <div className="ac-barra">
                              <div
                                className="ac-relleno"
                                style={{ width: `${c2Barra.toFixed(1)}%`, background: c2Relleno }}
                              />
                              <div className="ac-umbral" style={{ left: `${marca.toFixed(1)}%` }} />
                            </div>
                            {oblicuo.posible && (
                              <div className="ac-advertencia">
                                ⚠ C2 mayor a {umbral} %
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={v.clave}
                          onClick={() => setVista(v.clave as VistaKey)}
                          className={`ac-tarjeta ${claseTar} ${active ? 'ring-2 ring-[#B93815]/60 shadow-md' : 'hover:shadow-xs'
                            }`}
                        >
                          <div className="ac-cab">
                            <span className="flex items-center gap-1.5 min-w-0">
                              {v.clave === 'directo' && <span className="ac-tag ac-tag-c1">C1</span>}
                              <span className="ac-nombre truncate">{v.nombre}</span>
                            </span>
                            <span className={`ac-insignia ${claseIns}`}>{insignia}</span>
                          </div>
                          <div className="ac-pct">
                            <span className="ac-num tabular-nums">{v.porcentaje.toFixed(1)}</span>
                            <span className="ac-unid">% crítico</span>
                          </div>
                          <div className="ac-n">{v.detalles[0]}</div>
                          <div className="ac-barra">
                            <div
                              className="ac-relleno"
                              style={{ width: `${barra.toFixed(1)}%`, background: relleno }}
                            />
                            <div className="ac-umbral" style={{ left: `${marca.toFixed(1)}%` }} />
                          </div>
                          {extra}
                        </div>
                      );
                    })}
                  </div>

                  {/* Columna Estereograma + Notas (a la derecha) */}
                  <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-2">
                    {/* Selector de vistas */}
                    <div className="flex flex-wrap md:flex-nowrap items-center justify-start gap-1 md:gap-0.5 xl:gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200 max-w-full select-none shrink-0">
                      {VISTAS.map((v) => {
                        const active = vista === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVista(v.id)}
                            className={`px-2 xl:px-2.5 py-1 text-[11px] rounded transition-all font-medium cursor-pointer whitespace-nowrap ${active
                              ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                              }`}
                          >
                            {v.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Estereograma + Notas lado a lado */}
                    <div className="flex-1 min-h-0 flex flex-col md:flex-row lg:flex-col xl:flex-row gap-2.5 min-w-0">
                      {/* Contenedor del Estereograma */}
                      <div className="relative flex-1 min-w-0 min-h-[260px] sm:min-h-[340px] lg:min-h-0 flex items-center justify-center p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                        {(running || redrawing) && (
                          <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded bg-slate-900/85 text-white text-[11px] font-mono shadow flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            <span>{running ? 'Calculando…' : 'Redibujando…'}</span>
                          </div>
                        )}
                        {figuraSrc ? (
                          <img
                            src={figuraSrc}
                            alt={`Estereograma ${vista}`}
                            className="w-full h-full max-h-[65vh] lg:max-h-full object-contain select-none"
                          />
                        ) : (
                          <div className="text-xs text-slate-400 font-mono py-12">
                            {running ? 'Generando estereograma…' : 'Sin gráfico disponible.'}
                          </div>
                        )}
                      </div>

                      {/* Notas de los resultados (rectángulo a la derecha) */}
                      <aside className="ac-notas shrink-0 md:w-[205px] lg:w-full xl:w-[200px] 2xl:w-[240px] md:self-stretch lg:self-auto xl:self-stretch md:overflow-y-auto lg:overflow-y-visible xl:overflow-y-auto flex flex-col">
                        <div className="ac-notas-tit">Notas de los resultados</div>
                        <ol>
                          <li>
                            El porcentaje crítico de discontinuidades corresponde a la fracción de polos o intersecciones que están dentro de la zona crítica. No corresponde a un factor de seguridad ni a una probabilidad de falla del mecanismo de rotura.
                          </li>
                          <li>
                            En rotura planar y en cuña no se considera un plano igual al talud de análisis, debido a que no puede producir rotura planar ni formar cuñas críticas, porque no aflora y sus intersecciones generan bloques de volumen cero.
                          </li>
                        </ol>
                      </aside>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50">
                <div className="text-center p-8 max-w-md bg-white border border-slate-200 rounded-xl shadow-xs select-none">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Upload className="w-5 h-5 text-slate-500" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm mb-1">Área de trabajo limpia</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Suba un archivo CSV o Excel desde el paso <strong className="text-slate-700">1 · Datos de entrada</strong> en el panel lateral para ejecutar el análisis.
                  </p>
                </div>
              </div>
            )}

            {/* Barra de estado inferior */}
            <footer className="min-h-6 py-1 px-3 sm:px-4 shrink-0 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-mono select-none">
              <div className="truncate max-w-full">
                {analisis
                  ? `${analisis.contexto.n_datos} discontinuidades · ${analisis.contexto.n_intersecciones.toLocaleString()} intersecciones · Talud ${analisis.contexto.buz}°/${String(analisis.contexto.dirbuz).padStart(3, '0')}° · φ = ${analisis.contexto.phi}°`
                  : 'Sin datos'}
              </div>
              <div className="shrink-0">
                {opciones.proyeccion === 'equiarea' ? 'Schmidt (Equiárea)' : 'Wulff (Equiángulo)'} · Hemisferio {opciones.hemisferio === 'inferior' ? 'Inferior' : 'Superior'}
              </div>
            </footer>
          </main>
        </div>
      )}

      {/* Modales */}
      {showManualAdd && (
        <ManualStructuresModal
          onClose={() => setShowManualAdd(false)}
          onSaveStructures={(manualRows) => {
            setRows(manualRows);
            setDescartadas([]);
            setFilename('Estructuras manuales');
            const conteo: Record<string, number> = {};
            for (const r of manualRows) {
              const t = (r.Tipo || 'Sin tipo').toString().trim() || 'Sin tipo';
              conteo[t] = (conteo[t] || 0) + 1;
            }
            setTiposConteo(conteo);
            setFiltro({ tipos: null, persistencia_min: 0 });
            setAnalisis(null);
            setFiguraSrc(null);
            figureCacheRef.current.clear();
            lastRunSnapshotRef.current = null;
            setShowManualAdd(false);
            notify(`${manualRows.length} estructuras registradas. Pulsa «Ejecutar análisis» para calcular.`);
          }}
        />
      )}

      {showEditor && (
        <DataEditorModal
          rows={rows}
          descartadas={descartadas}
          onClose={() => setShowEditor(false)}
          onApplyAndRun={async (edited) => {
            setRows(edited);
            if (!filename || filename === 'Sin archivo') {
              setFilename('Estructuras manuales');
            }
            const conteo: Record<string, number> = {};
            for (const r of edited) {
              const t = (r.Tipo || 'Sin tipo').toString().trim() || 'Sin tipo';
              conteo[t] = (conteo[t] || 0) + 1;
            }
            setTiposConteo(conteo);
            const resetFiltro: FiltroParams = { tipos: null, persistencia_min: 0 };
            setFiltro(resetFiltro);
            setShowEditor(false);
            await runAnalysis(edited, resetFiltro);
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
