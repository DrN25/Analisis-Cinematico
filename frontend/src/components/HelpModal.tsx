import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const HelpModal: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<'ayuda' | 'referencias'>('ayuda');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[86vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-[#881337]" />
            <h2 className="font-display font-semibold text-base text-slate-900">
              Documentación técnica
            </h2>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setTab('ayuda')}
                className={`px-3 py-1 rounded-md font-medium ${
                  tab === 'ayuda' ? 'bg-white text-[#881337] shadow-sm' : 'text-slate-600'
                }`}
              >
                Criterios Dips
              </button>
              <button
                type="button"
                onClick={() => setTab('referencias')}
                className={`px-3 py-1 rounded-md font-medium ${
                  tab === 'referencias' ? 'bg-white text-[#881337] shadow-sm' : 'text-slate-600'
                }`}
              >
                Referencias (APA 7.ª)
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

        <div className="flex-1 overflow-auto p-6 text-xs text-slate-700 leading-relaxed space-y-4">
          {tab === 'ayuda' ? (
            <>
              <section className="space-y-1.5">
                <h3 className="font-display text-sm font-semibold text-slate-900">Cómo usar</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  <li><b>Datos de entrada:</b> sube un CSV o Excel, o edita la tabla. Sin archivo se usan los datos de ejemplo (36 discontinuidades).</li>
                  <li><b>Geometría y parámetros:</b> configura ψs, αs, φ y límites laterales en la pestaña <i>Análisis</i> y pulsa <b>Ejecutar análisis</b>.</li>
                  <li><b>Resumen SÍ / NO:</b> las tarjetas superiores permiten cambiar de vista; el umbral de % crítico se ajusta sin recalcular.</li>
                  <li><b>Plot y Red:</b> las pestañas <i>Plot</i> y <i>Red</i> (Stereonet Options) solo redibujan el estereograma.</li>
                  <li><b>Descargas:</b> exporta el libro Excel completo, PNG de alta resolución, ZIP o CSV por tabla.</li>
                </ol>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-display text-sm font-semibold text-slate-900">Formato de columnas</h3>
                <table className="w-full border-separate border-spacing-0 border border-slate-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <th className="px-3 py-1.5 border-b border-slate-200">Columna</th>
                      <th className="px-3 py-1.5 border-b border-slate-200">Obligatoria</th>
                      <th className="px-3 py-1.5 border-b border-slate-200">Nombres aceptados</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="px-3 py-1.5 font-mono border-b border-slate-100">Dip / Buz (0–90°)</td><td className="px-3 py-1.5 border-b border-slate-100">Sí</td><td className="px-3 py-1.5 border-b border-slate-100">Dip, Buz, Buzamiento</td></tr>
                    <tr><td className="px-3 py-1.5 font-mono border-b border-slate-100">DipDir / DirBuz (0–360°)</td><td className="px-3 py-1.5 border-b border-slate-100">Sí</td><td className="px-3 py-1.5 border-b border-slate-100">Dip Direction, DipDir, DD, Azimut</td></tr>
                    <tr><td className="px-3 py-1.5 font-mono border-b border-slate-100">Tipo de estructura</td><td className="px-3 py-1.5 border-b border-slate-100">No</td><td className="px-3 py-1.5 border-b border-slate-100">Tipo, Type, Clase</td></tr>
                    <tr><td className="px-3 py-1.5 font-mono border-b border-slate-100">Persistencia / Continuidad (m)</td><td className="px-3 py-1.5 border-b border-slate-100">No</td><td className="px-3 py-1.5 border-b border-slate-100">Persistence, Longitud, Traza</td></tr>
                    <tr><td className="px-3 py-1.5 font-mono">Celda / ID</td><td className="px-3 py-1.5">No</td><td className="px-3 py-1.5">ID, N, Nro, Código, Registro</td></tr>
                  </tbody>
                </table>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-display text-sm font-semibold text-slate-900">Criterios cinemáticos (Dips)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b>Rotura planar (polos):</b> dentro de ±LL, dentro de la envolvente daylight y fuera del cono de fricción.</li>
                  <li><b>Rotura en cuña (intersecciones):</b> primaria (φ ≤ ψi ≤ ψapp hacia la cara, sin límites laterales) y secundaria (entre talud y cono φ, con buzamiento de un plano en la primaria). P2 desliza en dos planos; P1 en un plano.</li>
                  <li><b>Toppling flexural (polos):</b> dentro de ±LL respecto a αs + 180° y fuera del plano límite ψs − φ.</li>
                  <li><b>Toppling directo (intersecciones y polos):</b> aristas en zonas 1, 2 y 3 (C1 en Dips); planos base «Base» (φ ≤ ψ ≤ ψs dentro de ±LL) y «Sliding+Base» (ψ ≤ φ hacia la cara).</li>
                </ul>
                <div className="bg-slate-50 border-l-4 border-[#881337] p-3 rounded-r text-slate-600">
                  <b>Nota sobre plano igual al talud:</b> en rotura planar y en cuña se excluyen planos con exactamente la misma orientación que la cara del talud (volumen de bloque cero). En toppling flexural y directo se evalúan normalmente. El porcentaje crítico no equivale a un factor de seguridad ni a una probabilidad de falla.
                </div>
              </section>
            </>
          ) : (
            <div className="space-y-4">
              <section className="space-y-1.5">
                <h3 className="font-display text-sm font-semibold text-slate-900">Libros y capítulos</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Hudson, J. A., &amp; Harrison, J. P. (2000). <i>Engineering rock mechanics: An introduction to the principles</i> (cap. 18). Pergamon.</li>
                  <li>Kliche, C. A. (2019). <i>Rock slope stability</i> (2.ª ed., cap. 5). SME.</li>
                  <li>Wyllie, D. C. (2018). <i>Rock slope engineering: Civil applications</i> (5.ª ed., caps. 7, 8 y 10). CRC Press.</li>
                  <li>Goodman, R. E. (1980). <i>Introduction to rock mechanics</i>. John Wiley &amp; Sons.</li>
                  <li>Priest, S. D. (1985). <i>Hemispherical projection methods in rock mechanics</i>. George Allen &amp; Unwin.</li>
                </ul>
              </section>
              <section className="space-y-1.5">
                <h3 className="font-display text-sm font-semibold text-slate-900">Tesis, artículos y Dips</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Diederichs, M. S. (1990). <i>DIPS: An interactive and graphical approach to the analysis of orientation based data</i> [Tesis de maestría, University of Toronto]. Rocscience.</li>
                  <li>Hocking, G. (1976). A method for distinguishing between single and double plane sliding of tetrahedral wedges. <i>Int. J. Rock Mech. Min. Sci. &amp; Geomech. Abstr., 13</i>(7), 225–226.</li>
                  <li>Markland, J. T. (1972). <i>A useful technique for estimating the stability of rock slopes when the rigid wedge slide type of failure is expected</i> (Report N.º 19). Imperial College.</li>
                  <li>International Society for Rock Mechanics. (1978). Suggested methods for the quantitative description of discontinuities in rock masses. <i>Int. J. Rock Mech. Min. Sci. &amp; Geomech. Abstr., 15</i>(6), 319–368.</li>
                  <li>Fisher, R. A. (1953). Dispersion on a sphere. <i>Proc. R. Soc. Lond. A, 217</i>(1130), 295–305.</li>
                  <li>Terzaghi, R. D. (1965). Sources of error in joint surveys. <i>Géotechnique, 15</i>(3), 287–304.</li>
                  <li>Rocscience Inc. (2012). <i>Dips: Verification manual</i> · Documentación de Dips (Kinematic Analysis Overview, Wedge Sliding, Flexural Toppling, Direct Toppling).</li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
