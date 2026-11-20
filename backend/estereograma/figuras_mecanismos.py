"""Estereogramas de resultados. Une los criterios (cinematica) con el dibujo (estereograma).

Cada figura sombrea la zona crítica pasando a sombrear_zona la MISMA función de zona que usa el cálculo.
"""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

from cinematica.criterio_cuna_dips import curvas_limite_cuna, zona_primaria_cuna, zona_secundaria_cuna
from cinematica.criterio_planar_dips import curvas_limite_planar, zona_planar
from cinematica.criterio_toppling_directo_dips import curvas_limite_directo, zonas_aristas_directo
from cinematica.criterio_toppling_flexural_dips import curvas_limite_flexural, zona_flexural
from cinematica.densidad_polos_fisher import densidad_en_puntos, pesos_segun_parametros
from cinematica.geometria_esferica import lineas_circulo_maximo, polo_de_plano, vector_linea, vector_polo
from cinematica.modelos_datos import porcentaje
from estereograma.capas_datos import (H, L, P, caja_info, capa_intersecciones, capa_planos, capa_polos, en_pares,
                                      etiquetar, leyenda, ley_planos, ley_tipos, marcador, puntos, tamanos)
from estereograma.proyeccion_estereografica import malla_proyeccion
from estereograma.red_estereografica import kw_barra_color, kw_leyenda, nueva_figura, trazar_lineas, ubicacion
from estereograma.zonas_criticas import sombrear_zona, trazar_curvas


def contexto(res):
    return dict(nombre=res.talud.nombre, psi_s=res.talud.buz, alfa_s=res.talud.dirbuz, phi=res.parametros.phi,
                tipos=list(res.tipos), hay_persistencia=bool(res.datos.Persistencia.notna().any()),
                filtro=res.filtro)


def _titulo(nombre, elementos):
    return f"{nombre} · " + " + ".join(e for e in ("polos", "planos", "intersecciones") if e in elementos)


def densidad_malla(res, op):
    """Malla de densidad de polos; se guarda en el resultado para no repetirla en cada estereograma."""
    clave = (op.proyeccion, op.hemisferio, int(op.resolucion))
    memo = res.__dict__.setdefault("_densidad", {})
    if clave not in memo:
        memo[clave] = _densidad_malla(res, op)
    return memo[clave]


def _densidad_malla(res, op):
    gx, gy, dentro, gt, gp = malla_proyeccion(op.proyeccion, op.hemisferio, int(op.resolucion))
    polos = vector_polo(res.datos.Buz.to_numpy(float), res.datos.DirBuz.to_numpy(float))
    valores = densidad_en_puntos(polos, vector_linea(gt[dentro], gp[dentro]), pesos_segun_parametros(res.datos, res.parametros),
                                 res.parametros.metodo_densidad, res.parametros.area_conteo)
    d = np.zeros(gx.shape)
    d[dentro] = valores
    return gx, gy, np.ma.masked_where(~dentro, d)


def _niveles(d):
    return np.linspace(0, max(float(d.max()), 1e-6), 9)[1:-1]


def _fondo(ax, res, op):
    if op.contornos_en_mecanismos:
        gx, gy, d = densidad_malla(res, op)
        niv = _niveles(d)
        ax.contourf(gx, gy, d, levels=niv, cmap=op.mapa_color, alpha=0.35, extend="max", zorder=1)


def figura_general(res, op):
    ctx, datos, m, fs = contexto(res), res.datos, op.elementos("general"), op.tamano_fuente
    fig, ax = nueva_figura(op, f"Estereograma general · {ctx['nombre']} · N = {len(datos)}", ctx["filtro"])
    if op.contornos_general:
        gx, gy, d = densidad_malla(res, op)
        niv = _niveles(d)
        cf = ax.contourf(gx, gy, d, levels=niv, cmap=op.mapa_color, alpha=0.85, extend="max", zorder=1)
        ax.contour(gx, gy, d, levels=niv, colors="k", linewidths=0.3, zorder=1)
        cax = ax.inset_axes(kw_barra_color(op))
        cb = fig.colorbar(cf, cax=cax, format="%.1f")
        cb.set_label(f"% polos / 1 % área\n{res.parametros.metodo_densidad} · máx {d.max():.1f} %", fontsize=fs - 1.5)
        cb.ax.tick_params(labelsize=fs - 2)
    paleta, h = plt.get_cmap("tab10"), []
    if "intersecciones" in m:
        inter = res.intersecciones
        puntos(ax, op, inter.Trend, inter.Plunge, "0.15", "o", 9, z=4.5, ec="none")
        h.append(H(f"Intersección ({len(inter)})", "0.15"))
    for i, tipo in enumerate(ctx["tipos"]):
        s, col = datos[datos.Tipo == tipo], paleta(i % 10)
        if "planos" in m:
            for b, dd in zip(s.Buz, s.DirBuz):
                trazar_lineas(ax, op, lineas_circulo_maximo(b, dd), color=col, lw=0.8, zorder=3)
        if "polos" in m:
            puntos(ax, op, *polo_de_plano(s.Buz, s.DirBuz), col, marcador(tipo, op, ctx), tamanos(s.Clase_P, op), z=4)
            h.append(Line2D([], [], ls="-" if "planos" in m else "", lw=0.8, color=col, marker=marcador(tipo, op, ctx),
                            mfc=col, mec="k", ms=7, label=f"{tipo} ({len(s)})"))
        elif "planos" in m:
            h.append(L(col, f"{tipo} ({len(s)})", lw=1.2))
    if "polos" in m and str(op.etiquetas_polos).lower() == "todos":
        etiquetar(ax, op, *polo_de_plano(datos.Buz, datos.DirBuz), datos.ID)
    trazar_lineas(ax, op, lineas_circulo_maximo(res.talud.buz, res.talud.dirbuz), color=op.colores["talud"], lw=1.8, zorder=5)
    h.append(L(op.colores["talud"], f"Talud {res.talud.buz:.0f}/{res.talud.dirbuz:03.0f}", lw=1.8))
    if "polos" in m and op.tamano_por_persistencia and ctx["hay_persistencia"]:
        h.append(Line2D([], [], ls="", label="Tamaño ∝ persistencia (ISRM)"))
    leyenda(ax, op, h)
    return fig


def figura_planar(res, op):
    ctx, t, p, r, m = contexto(res), res.talud, res.parametros, res.planar, op.elementos("planar")
    fig, ax = nueva_figura(op, _titulo("Rotura planar", m), ctx["filtro"])
    _fondo(ax, res, op)
    sombrear_zona(ax, op, lambda gt, gp: zona_planar(gt, gp, t, p), op.colores["zona"])
    h_curvas = trazar_curvas(ax, op, curvas_limite_planar(t, p))
    h = []
    if "planos" in m:
        capa_planos(ax, op, r, [(r.Critico, op.colores["critico"])])
        h += ley_planos(op, [("Plano crítico", op.colores["critico"])])
    if "intersecciones" in m:
        capa_intersecciones(ax, op, res.intersecciones)
        h.append(H("Intersección (no se evalúa aquí)", op.colores["no_critico"]))
    if "polos" in m:
        capa_polos(ax, op, ctx, r, r.Critico)
        h = [H("Polo crítico", op.colores["critico"]), H("Polo no crítico", op.colores["no_critico"])] + h + ley_tipos(op, ctx)
    n, nc = len(r), int(r.Critico.sum())
    caja_info(ax, op, ctx, f"Dips v9 · LL = ±{p.ll_planar:g}°\nPolos: {n} · críticos: {nc} ({porcentaje(nc, n):.1f} %)")
    leyenda(ax, op, h + [P(op.colores["zona"], "Zona crítica (polos)")] + h_curvas)
    return fig


def figura_cuna(res, op):
    ctx, t, p, r, m = contexto(res), res.talud, res.parametros, res.cuna, op.elementos("cuna")
    fig, ax = nueva_figura(op, _titulo("Rotura en cuña", m), ctx["filtro"])
    _fondo(ax, res, op)
    sombrear_zona(ax, op, lambda gt, gp: zona_primaria_cuna(gt, gp, t, p), op.colores["zona"])
    sombrear_zona(ax, op, lambda gt, gp: zona_secundaria_cuna(gt, gp, t, p), op.colores["zona_2"], 0.5)
    h_curvas = trazar_curvas(ax, op, curvas_limite_cuna(t, p))
    datos, h = res.datos, []
    en_cuna = en_pares(datos, r, r.Critico)
    if "planos" in m:
        capa_planos(ax, op, datos, [(en_cuna, op.colores["critico"])])
        h += ley_planos(op, [("Plano que forma cuña crítica", op.colores["critico"])])
    if "polos" in m:   # como Dips: en cuña los polos son referencia; lo crítico son las intersecciones
        capa_polos(ax, op, ctx, datos, np.zeros(len(datos), bool))
        h += [H("Polo", op.colores["no_critico"])] + ley_tipos(op, ctx)
    if "intersecciones" in m:
        p2, p1 = (r.Modo == "P2").to_numpy(), (r.Modo == "P1").to_numpy()
        capa_intersecciones(ax, op, r, [(p2, op.colores["critico"], "o"), (p1, op.colores["secundaria"], "D")])
        h = [H(f"P2 · cuña, dos planos ({int(p2.sum())})", op.colores["critico"]),
             H(f"P1 · un plano ({int(p1.sum())})", op.colores["secundaria"], "D")] + \
            ([] if op.solo_criticos("filtro_intersecciones") else
             [H(f"No crítica ({int((~r.Critico).sum())})", op.colores["no_critico"])]) + h
    n = len(r)
    caja_info(ax, op, ctx, f"Intersecciones: {n:,}\nP2 (dos planos): {porcentaje((r.Modo == 'P2').sum(), n):.2f} % · "
                           f"P1 (un plano): {porcentaje((r.Modo == 'P1').sum(), n):.2f} %\n"
                           f"Total: {porcentaje(r.Critico.sum(), n):.2f} %")
    leyenda(ax, op, h + [P(op.colores["zona"], "Zona primaria"), P(op.colores["zona_2"], "Zona secundaria", 0.5)] + h_curvas)
    return fig


def figura_flexural(res, op):
    ctx, t, p, r, m = contexto(res), res.talud, res.parametros, res.flexural, op.elementos("flexural")
    fig, ax = nueva_figura(op, _titulo("Toppling flexural", m), ctx["filtro"])
    _fondo(ax, res, op)
    sombrear_zona(ax, op, lambda gt, gp: zona_flexural(gt, gp, t, p), op.colores["zona"])
    h_curvas = trazar_curvas(ax, op, curvas_limite_flexural(t, p))
    h = []
    if "planos" in m:
        capa_planos(ax, op, r, [(r.Critico, op.colores["critico"])])
        h += ley_planos(op, [("Plano crítico", op.colores["critico"])])
    if "intersecciones" in m:
        capa_intersecciones(ax, op, res.intersecciones)
        h.append(H("Intersección (no se evalúa aquí)", op.colores["no_critico"]))
    if "polos" in m:
        capa_polos(ax, op, ctx, r, r.Critico)
        h = [H("Polo crítico", op.colores["critico"]), H("Polo no crítico", op.colores["no_critico"])] + h + ley_tipos(op, ctx)
    n, nc = len(r), int(r.Critico.sum())
    caja_info(ax, op, ctx, f"Dips v9 · LL = ±{p.ll_flexural:g}°\nPolos: {n} · críticos: {nc} ({porcentaje(nc, n):.1f} %)")
    leyenda(ax, op, h + [P(op.colores["zona"], "Zona crítica (polos)")] + h_curvas)
    return fig


def figura_directo(res, op):
    ctx, t, p, m = contexto(res), res.talud, res.parametros, op.elementos("directo")
    ri, rb = res.directo_aristas, res.directo_base
    fig, ax = nueva_figura(op, _titulo("Toppling directo", m), ctx["filtro"])
    _fondo(ax, res, op)
    sombrear_zona(ax, op, lambda gt, gp: zonas_aristas_directo(gt, gp, t, p)["Zona_1"], op.colores["zona"], 0.45)
    sombrear_zona(ax, op, lambda gt, gp: zonas_aristas_directo(gt, gp, t, p)["Zona_2"], op.colores["critico"], 0.35)
    sombrear_zona(ax, op, lambda gt, gp: zonas_aristas_directo(gt, gp, t, p)["Zona_3"], op.colores["zona_2"], 0.6)
    h_curvas = trazar_curvas(ax, op, curvas_limite_directo(t, p))
    h, base = [], rb.Critico.to_numpy()
    if "planos" in m:
        arista = en_pares(rb, ri, ri.Directo | ri.Oblicuo)
        capa_planos(ax, op, rb, [(base, op.colores["base"]), (arista, op.colores["critico"])])
        h += ley_planos(op, [("Plano base", op.colores["base"]), ("Plano que forma arista crítica", op.colores["critico"])])
    if "polos" in m:
        capa_polos(ax, op, ctx, rb, base, op.colores["base"])
        h += [H(f"Polo de plano base ({int(base.sum())})", op.colores["base"]),
              H("Polo de otro plano", op.colores["no_critico"])] + ley_tipos(op, ctx)
    if "intersecciones" in m:
        capa_intersecciones(ax, op, ri, [(ri.Directo, op.colores["critico"], "o"), (ri.Oblicuo, op.colores["oblicuo"], "o")])
        h = [H(f"Arista directa, zonas 1+2 ({int(ri.Directo.sum())})", op.colores["critico"]),
             H(f"Arista oblicua, zona 3 ({int(ri.Oblicuo.sum())})", op.colores["oblicuo"])] + \
            ([] if op.solo_criticos("filtro_intersecciones") else [H("Intersección no crítica", op.colores["no_critico"])]) + h
    ni, nb = len(ri), len(rb)
    caja_info(ax, op, ctx, f"LL = ±{p.ll_directo:g}°\nDirecto (z1+z2): {porcentaje(ri.Directo.sum(), ni):.2f} % · "
                           f"oblicuo (z3): {porcentaje(ri.Oblicuo.sum(), ni):.2f} %\n"
                           f"Total z1–z3 (C1 Dips): {porcentaje(ri.C1_Dips.sum(), ni):.2f} % · "
                           f"planos base: {porcentaje(rb.Critico.sum(), nb):.2f} %")
    leyenda(ax, op, h + [P(op.colores["zona"], "Zona 1"), P(op.colores["critico"], "Zona 2", 0.35),
                         P(op.colores["zona_2"], "Zona 3", 0.6)] + h_curvas)
    return fig


def figura_roseta(res, op):
    ctx, datos, fs = contexto(res), res.datos, op.tamano_fuente
    fig = plt.figure(figsize=(op.tamano_figura * 1.35, op.tamano_figura))
    ax = fig.add_axes([0.05, 0.05, 0.62, 0.82], projection="polar")
    ax.set_theta_zero_location("N")
    ax.set_theta_direction(-1)
    bins = np.arange(0, 361, 10)
    abajo = np.zeros(36)
    for i, tipo in enumerate(ctx["tipos"]):
        cuenta, _ = np.histogram(datos.DirBuz[datos.Tipo == tipo] % 360, bins=bins)
        ax.bar(np.radians(bins[:-1] + 5), cuenta, width=np.radians(10), bottom=abajo,
               color=plt.get_cmap("tab10")(i % 10), edgecolor="k", lw=0.4, label=tipo)
        abajo += cuenta
    ax.annotate("", xy=(np.radians(res.talud.dirbuz), max(abajo.max(), 1) * 1.08), xytext=(0, 0),
                arrowprops=dict(arrowstyle="->", color=op.colores["critico"], lw=2))
    ax.set_title(f"Roseta de direcciones de buzamiento (10°) · flecha = αs\n{ctx['nombre']} · N = {len(datos)}",
                 fontsize=fs + 1, weight="bold", pad=16)
    ax.tick_params(labelsize=fs - 1)
    if ubicacion(op) != "ninguna":
        ax.legend(**{**kw_leyenda(op), "loc": "upper left", "bbox_to_anchor": (1.08, 1.0)})
    return fig


FIGURAS = {
    "general": ("General", figura_general),
    "planar": ("Rotura planar", figura_planar),
    "cuna": ("Rotura en cuña", figura_cuna),
    "flexural": ("Toppling flexural", figura_flexural),
    "directo": ("Toppling directo", figura_directo),
    "roseta": ("Roseta", figura_roseta),
}
