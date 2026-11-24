"""Capas de datos: polos, planos (círculos máximos), intersecciones, etiquetas, leyenda y cuadro de datos."""
import numpy as np
import pandas as pd
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

from cinematica.geometria_esferica import lineas_circulo_maximo, polo_de_plano
from cinematica.lectura_discontinuidades import clase_persistencia
from estereograma.proyeccion_estereografica import proyectar
from estereograma.red_estereografica import kw_info, kw_leyenda, trazar_lineas, ubicacion

MARCADORES = ["o", "s", "^", "D", "v", "P", "X", "h", "*"]
TAM_CLASE = {"Muy baja": 0.55, "Baja": 0.8, "Media": 1.1, "Alta": 1.5, "Muy alta": 2.0}


def marcador(tipo, op, ctx):
    if not op.simbolo_por_tipo:
        return "o"
    tipos = ctx.get("tipos", [])
    return MARCADORES[tipos.index(tipo) % len(MARCADORES)] if tipo in tipos else "o"


def tamanos(clases, op, base=None):
    """Tamaño de cada símbolo: base (por defecto op.tamano_simbolo) × factor de la clase de persistencia."""
    base = float(op.tamano_simbolo if base is None else base)
    if not op.tamano_por_persistencia:
        return np.full(len(clases), base)
    return base * pd.Series(np.asarray(clases, dtype=object)).map(TAM_CLASE).fillna(1.0).to_numpy(float)


def puntos(ax, op, trend, plunge, color, marker="o", s=30, z=3, ec="k", lw=0.5):
    trend, plunge = np.atleast_1d(np.asarray(trend, float)), np.atleast_1d(np.asarray(plunge, float))
    if len(trend):
        x, y = proyectar(trend, plunge, op.proyeccion, op.hemisferio)
        ax.scatter(x, y, s=s, color=color, marker=marker, edgecolors=ec, linewidths=lw, zorder=z)


def seleccion(opcion, critico):
    o = str(opcion).lower()
    if o.startswith("crit"):
        return np.asarray(critico, bool)
    return np.ones(len(critico), bool) if o == "todos" else np.zeros(len(critico), bool)


MAX_ETIQUETAS = 49          # rótulos de ID solo con menos de 50 elementos


def etiquetar(ax, op, trend, plunge, textos):
    """Etiquetas junto a los puntos; si se superponen, se desplazan y se unen al punto con una línea fina.
    Con más de MAX_ETIQUETAS puntos no se rotula (sería ilegible)."""
    if len(np.atleast_1d(np.asarray(trend))) > MAX_ETIQUETAS:
        return
    x, y = proyectar(np.atleast_1d(np.asarray(trend, float)), np.atleast_1d(np.asarray(plunge, float)),
                     op.proyeccion, op.hemisferio)
    fs = op.tamano_fuente - 2
    dy, dx_min, colocadas = 0.045 * fs / 7, 0.16, []
    for xi, yi, t in sorted(zip(x, y, textos), key=lambda e: -e[1]):
        tx, ty0 = xi + 0.03, yi + 0.02
        ty = ty0
        for k in range(60):
            ty = ty0 + dy * ((k + 1) // 2) * (-1 if k % 2 else 1)
            if not any(abs(ty - cy) < dy and abs(tx - cx) < dx_min for cx, cy in colocadas):
                break
        colocadas.append((tx, ty))
        movida = abs(ty - ty0) > 1e-9
        ax.annotate(str(t), (xi, yi), xytext=(tx, ty), textcoords="data", fontsize=fs, color="0.1", zorder=7,
                    va="center", arrowprops=dict(arrowstyle="-", lw=0.4, color="0.4") if movida else None)


def capa_polos(ax, op, ctx, tabla, critico, color_crit=None):
    critico = np.asarray(critico, bool)
    for es_crit, color in ((False, op.colores["no_critico"]), (True, color_crit or op.colores["critico"])):
        sub = tabla[critico == es_crit]
        # OCULTO POR REQUERIMIENTO: no distinguir símbolo por tipo de estructura; usar marcador circular uniforme.
        # for tipo, s2 in sub.groupby("Tipo", sort=False):   # tamaño elegido por el usuario (op.tamano_polo)
        #     puntos(ax, op, *polo_de_plano(s2.Buz, s2.DirBuz), color, marcador(tipo, op, ctx),
        #            tamanos(s2.Clase_P, op, op.tamano_polo), z=4 if es_crit else 3,
        #            lw=0.5 if op.tamano_polo >= 12 else 0.25)
        puntos(ax, op, *polo_de_plano(sub.Buz, sub.DirBuz), color, "o",
               tamanos(sub.Clase_P, op, op.tamano_polo), z=4 if es_crit else 3,
               lw=0.5 if op.tamano_polo >= 12 else 0.25)
    if op.etiquetas_polos == "todos" and len(tabla) <= MAX_ETIQUETAS:   # interruptor «Etiquetas de los polos»
        # OCULTO POR REQUERIMIENTO: rotular polos como P1..Pn en lugar de prefijos estructurales (J, F, S, D...)
        # etiquetar(ax, op, *polo_de_plano(tabla.Buz, tabla.DirBuz), tabla.ID)
        etiquetar(ax, op, *polo_de_plano(tabla.Buz, tabla.DirBuz), [f"P{idx + 1}" for idx in range(len(tabla))])


def capa_planos(ax, op, tabla, grupos):
    """Círculos máximos. grupos = [(máscara, color), ...] por prioridad; el resto es 'no crítico'."""
    resto = np.ones(len(tabla), bool)
    for m, color in grupos:
        m = np.asarray(m, bool) & resto
        for b, d in zip(tabla.Buz[m], tabla.DirBuz[m]):
            trazar_lineas(ax, op, lineas_circulo_maximo(b, d), color=color, lw=1.0, zorder=2.5)
        resto &= ~m
    if not op.solo_criticos("filtro_planos"):
        for b, d in zip(tabla.Buz[resto], tabla.DirBuz[resto]):
            trazar_lineas(ax, op, lineas_circulo_maximo(b, d), color=op.colores["no_critico"], lw=0.6, zorder=2)


def capa_intersecciones(ax, op, r, mascaras=()):
    """mascaras = [(máscara, color, marcador), ...]; el resto va en gris pequeño."""
    resto = np.ones(len(r), bool)
    for m, *_ in mascaras:
        resto &= ~np.asarray(m, bool)
    clases = clase_persistencia(r.Persist_min)
    # Con miles de intersecciones los símbolos se reducen y pierden el borde, para que se lean las zonas.
    f = float(np.clip(np.sqrt(3000 / max(len(r), 1)), 0.05, 1.0))
    borde = "k" if f >= 1 else "none"
    if not (mascaras and op.solo_criticos("filtro_intersecciones")):
        puntos(ax, op, r.Trend[resto], r.Plunge[resto], op.colores["no_critico"], "o",
               0.25 * f * tamanos(clases[resto], op), z=2, ec="none")
    for k, (m, color, mk) in enumerate(mascaras):   # el primero de la lista queda encima
        m = np.asarray(m, bool)
        puntos(ax, op, r.Trend[m], r.Plunge[m], color, mk, 0.6 * f * tamanos(clases[m], op), z=4 + len(mascaras) - k,
               ec=borde)
    sel = seleccion(op.etiquetas_intersecciones, ~resto)
    if np.any(sel) and np.sum(sel) <= MAX_ETIQUETAS:
        etiquetas = r.Plano_1[sel].astype(str) + "×" + r.Plano_2[sel].astype(str)
        etiquetar(ax, op, r.Trend[sel], r.Plunge[sel], etiquetas)


def en_pares(tabla, r, mascara):
    """Planos de 'tabla' que forman parte de alguna intersección marcada en 'mascara'."""
    m = np.asarray(mascara, bool)
    ids = set(r.Plano_1[m]) | set(r.Plano_2[m])
    return tabla.ID.isin(ids).to_numpy()


def H(label, color, marker="o", mfc=None):
    return Line2D([], [], ls="", marker=marker, mfc=mfc or color, mec="k", mew=0.5, ms=7, label=label)


def L(color, label, ls="-", lw=1.4):
    return Line2D([], [], color=color, lw=lw, ls=ls, label=label)


def P(color, label, alpha=0.62):
    """Cuadro de leyenda con el mismo color y transparencia que la zona dibujada."""
    return Patch(facecolor=color, edgecolor="#7a1f1f", alpha=alpha, label=label, lw=0.6)


def ley_tipos(op, ctx):
    h = []
    if op.simbolo_por_tipo and len(ctx.get("tipos", [])) > 1:
        h += [H(f"Tipo: {t}", "k", marcador(t, op, ctx), "white") for t in ctx["tipos"]]
    if op.tamano_por_persistencia and ctx.get("hay_persistencia"):
        h.append(Line2D([], [], ls="", label="Tamaño ∝ persistencia (ISRM)"))
    return h


def ley_planos(op, grupos):
    h = [L(c, e, lw=1.0) for e, c in grupos]
    if not op.solo_criticos("filtro_planos"):
        h.append(L(op.colores["no_critico"], "Plano no crítico", lw=0.6))
    return h


def leyenda(ax, op, polos=(), zonas=(), intersecciones=(), planos=()):
    """Leyenda reducida, siempre en el mismo orden:
    polos (crítico / no crítico) · plano del talud · zonas críticas · densidad de polos · intersecciones · planos.
    No incluye persistencia, tipos ni curvas auxiliares (cono de fricción, límites laterales, etc.)."""
    handles = list(polos) + [L(op.colores["talud"], "Plano del talud", lw=1.8)] + list(zonas)
    if getattr(ax, "_contornos_polos", False):
        from matplotlib import colormaps
        handles.append(Patch(facecolor=colormaps[op.mapa_color_mecanismos](0.6), alpha=0.7, label="Densidad de polos"))
    handles += list(intersecciones) + list(planos)
    if ubicacion(op) != "ninguna" and handles:
        ax.legend(handles=handles, **kw_leyenda(op))


def caja_info(ax, op, ctx, texto):
    if not op.caja_info:
        return
    txt = (f"{ctx['nombre']}\nTalud ψs/αs = {ctx['psi_s']:.0f}° / {ctx['alfa_s']:03.0f}°\n"
           f"φ = {ctx['phi']:.0f}°\n{texto}")
    k = kw_info(op)
    ax.text(k["x"], k["y"], txt, transform=ax.transAxes, fontsize=op.tamano_fuente - 1, va=k["va"], ha=k["ha"],
            bbox=dict(boxstyle="round", fc="white", ec="0.6"), zorder=8)
