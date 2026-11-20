import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  Image as ImageIcon,
  KeyRound,
  LogOut,
  Shield,
  ZoomIn,
  ZoomOut,
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

const VISTAS: { id: VistaKey; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'planar', label: 'Planar' },
  { id: 'cuna', label: 'Cuña' },
  { id: 'flexural', label: 'T. Flexural' },
  { id: 'directo', label: 'T. Directo' },
  { id: 'roseta', label: 'Roseta' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const skipNextRedrawRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 5000);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setAnalisis(null);
      setFiguraSrc(null);
    });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, opciones]);

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
      const descTxt = parsed.descartadas.length > 0 ? ` (${parsed.descartadas.length} descartadas)` : '';
      notify(`Archivo cargado: ${parsed.filename} · ${parsed.rows.length} discontinuidades válidas${descTxt}`);
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
      notify(`Datos de ejemplo cargados: ${ej.rows.length} discontinuidades`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error cargando ejemplo.');
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
      const { blob, filename: dlName } = await apiBlob(`/api/analisis/exportar/tabla-csv/${tabla}`, {
        method: 'POST',
        body: JSON.stringify({ analysis_id: analysisId, vista, umbral, opciones }),
      });
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
      <div className="h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Verificando sesión…
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
    <div className="h-screen overflow-hidden flex flex-col bg-slate-100">
      {/* Toast de notificación al cargar archivo */}
      {toastMsg && (
        <div className="fixed top-14 right-4 z-50 bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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

      {/* Barra superior ejecutiva granate */}
      <header className="h-12 shrink-0 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <svg width="24" height="24" viewBox="0 0 38 38" fill="none" className="shrink-0">
            <circle cx="19" cy="19" r="16.5" stroke="#18202A" strokeWidth="2.2" />
            <path d="M2.5 19 C 8 27, 30 27, 35.5 19" stroke="#881337" strokeWidth="2.2" />
            <circle cx="19" cy="9" r="2.4" fill="#B91C1C" />
            <circle cx="14.5" cy="11.5" r="2.4" fill="#B91C1C" />
          </svg>
          <span className="font-display font-semibold text-sm text-slate-900 whitespace-nowrap">
            Análisis Cinemático
          </span>
          {analisis && (
            <span className="hidden xl:inline-block text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 truncate">
              {analisis.contexto.nombre} · {analisis.contexto.buz}°/{String(analisis.contexto.dirbuz).padStart(3, '0')}° · N={analisis.contexto.n_datos}
            </span>
          )}
        </div>

        <nav className="flex items-center bg-slate-100 p-0.5 rounded-lg overflow-x-auto">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVista(v.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                vista === v.id
                  ? 'bg-[#881337] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {v.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={!analisis || exporting !== null}
            onClick={() => handleExport('excel')}
            className="px-2 py-1 text-xs font-medium border border-slate-200 hover:bg-slate-50 rounded-md text-slate-700 flex items-center gap-1 disabled:opacity-50"
            title="Descargar libro Excel completo"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">{exporting === 'excel' ? '…' : 'Excel'}</span>
          </button>
          <button
            type="button"
            disabled={!analisis || exporting !== null}
            onClick={() => handleExport('png')}
            className="px-2 py-1 text-xs font-medium border border-slate-200 hover:bg-slate-50 rounded-md text-slate-700 flex items-center gap-1 disabled:opacity-50"
            title={`Descargar PNG (${opciones.dpi_exportar} dpi)`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#881337]" />
            <span className="hidden sm:inline">{exporting === 'png' ? '…' : 'PNG'}</span>
          </button>
          <button
            type="button"
            disabled={!analisis || exporting !== null}
            onClick={() => handleExport('zip')}
            className="px-2 py-1 text-xs font-medium border border-slate-200 hover:bg-slate-50 rounded-md text-slate-700 flex items-center gap-1 disabled:opacity-50"
            title="Descargar ZIP completo"
          >
            <Archive className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">{exporting === 'zip' ? '…' : 'ZIP'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Ayuda y referencias APA"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          {user.rol_nombre === 'admin' && (
            <button
              type="button"
              onClick={() => setShowAdmin(true)}
              className="px-2.5 py-1 text-xs font-semibold bg-[#881337] hover:bg-[#6F0F2C] text-white rounded-md flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin / Logs
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 mx-0.5" />

          <span className="hidden md:inline text-xs font-medium text-slate-700 px-1">
            {user.usuario}
          </span>
          <button
            type="button"
            onClick={() => setShowPwd(true)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
            title="Cambiar contraseña"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-700"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
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
          onOpenEditor={() => setShowEditor(true)}
          onRunAnalysis={() => runAnalysis()}
          running={running}
          uploading={uploading}
        />

        <main className="flex-1 min-w-0 min-h-0 flex flex-col bg-white">
          {errorMsg && (
            <div className="mx-3 mt-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center justify-between shrink-0">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="font-semibold ml-2">
                ×
              </button>
            </div>
          )}

          {analisis && (
            <div
              className={`mx-3 mt-2.5 px-3 py-2 rounded-xl border flex items-center justify-between gap-3 shrink-0 ${
                posibles.length > 0
                  ? 'bg-rose-50/80 border-rose-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {posibles.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-[#881337] shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <div className="text-xs truncate">
                  <b className="text-slate-900">
                    {posibles.length > 0
                      ? `${posibles.length} de ${veredictosActivos.length} mecanismos cinemáticamente posibles:`
                      : 'Ningún mecanismo alcanza el porcentaje crítico'}
                  </b>{' '}
                  <span className="text-slate-600">
                    {posibles.length > 0
                      ? posibles.map((p) => p.nombre).join(', ')
                      : `(umbral actual ${umbral} %)`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZoomFull((z) => !z)}
                className="px-2 py-1 text-[11px] font-medium bg-white/80 hover:bg-white border border-slate-200 rounded-md text-slate-700 flex items-center gap-1 shrink-0"
                title="Alternar tamaño completo / ajustado"
              >
                {zoomFull ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                {zoomFull ? 'Ajustar' : 'Ampliar'}
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0 relative flex items-center justify-center p-3 overflow-auto">
            {(running || redrawing) && (
              <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[11px]">
                {running ? 'Calculando…' : 'Redibujando…'}
              </div>
            )}
            {figuraSrc ? (
              <img
                src={figuraSrc}
                alt={`Estereograma ${vista}`}
                className={
                  zoomFull
                    ? 'max-w-none h-auto'
                    : 'max-w-full max-h-full object-contain select-none'
                }
              />
            ) : (
              <div className="text-xs text-slate-400">
                {running ? 'Generando estereograma inicial…' : 'Sin gráfico disponible.'}
              </div>
            )}
          </div>

          <footer className="h-7 shrink-0 bg-slate-50 border-t border-slate-200 px-3 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">
              {analisis
                ? `${analisis.contexto.nombre} · talud ${analisis.contexto.buz}° / ${String(
                    analisis.contexto.dirbuz,
                  ).padStart(3, '0')}° · φ = ${analisis.contexto.phi}° · ${
                    analisis.contexto.n_datos
                  } discontinuidades · ${analisis.contexto.n_intersecciones.toLocaleString()} intersecciones · ${
                    analisis.contexto.exclusion_resumen
                  }`
                : 'Listo'}
            </span>
            <span className="shrink-0 ml-2 font-mono text-[10.5px]">
              {opciones.proyeccion === 'equiarea' ? 'Equal Area' : 'Equal Angle'} ·{' '}
              {opciones.hemisferio === 'inferior' ? 'Lower' : 'Upper'}
            </span>
          </footer>
        </main>

        <RightInspector
          data={analisis}
          vista={vista}
          umbral={umbral}
          onSelectVista={setVista}
          onExportTableCsv={handleExportTableCsv}
          onExportCunaExcel={handleExportCunaExcel}
        />
      </div>

      {showEditor && (
        <DataEditorModal
          rows={rows}
          descartadas={descartadas}
          onClose={() => setShowEditor(false)}
          onApplyAndRun={async (edited) => {
            setRows(edited);
            setShowEditor(false);
            await runAnalysis(edited);
            notify(`Tabla actualizada: ${edited.length} filas`);
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
