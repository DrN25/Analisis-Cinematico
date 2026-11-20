"""Red del estereograma (ecuatorial o polar), borde, marcas, cruz, ejes, rótulos y disposición de la figura."""
import matplotlib.pyplot as plt
import numpy as np

from cinematica.geometria_esferica import lineas_circulo_maximo, lineas_cono_horizontal, lineas_cono_vertical, lineas_radial
from estereograma.proyeccion_estereografica import _es_wulff, proyectar


def trazar_lineas(ax, op, lineas, **kw):
    """Proyecta una secuencia (trend, plunge) y la dibuja."""
    ax.plot(*proyectar(lineas[0], lineas[1], op.proyeccion, op.hemisferio), **kw)


def ubicacion(op):
    u = str(op.ubicacion_leyenda).lower()
    return u if u in ("derecha", "izquierda", "abajo", "ninguna") else "derecha"


def dibujar_red(ax, op, titulo=""):
    fs, k = op.tamano_fuente, float(op.intervalo_red)
    cr, lw, red = op.color_red, op.ancho_superposicion * 0.45, str(op.red).lower()
    li = op.ancho_interno * 0.8
    if red == "ecuatorial":     # círculos máximos N–S y círculos menores alrededor del eje N–S
        for d in np.arange(k, 90, k):
            trazar_lineas(ax, op, lineas_circulo_maximo(d, 90), color=cr, lw=lw, zorder=0)
            trazar_lineas(ax, op, lineas_circulo_maximo(d, 270), color=cr, lw=lw, zorder=0)
        for a in np.arange(k, 180, k):
            if not np.isclose(a, 90):
                trazar_lineas(ax, op, lineas_cono_horizontal(0, a), color=cr, lw=lw, zorder=0)
        ax.plot([0, 0], [-1, 1], color=cr, lw=lw, zorder=0)
        ax.plot([-1, 1], [0, 0], color=cr, lw=lw, zorder=0)
    elif red == "polar":        # círculos de igual inclinación y radios de igual azimut
        for p in np.arange(k, 90, k):
            trazar_lineas(ax, op, lineas_cono_vertical(p), color=cr, lw=lw, zorder=0)
        for az in np.arange(0, 360, k):
            trazar_lineas(ax, op, lineas_radial(az), color=cr, lw=lw, zorder=0)
    if op.ejes_cruzados:
        ax.plot([0, 0], [-1, 1], color="k", lw=li, zorder=5)
        ax.plot([-1, 1], [0, 0], color="k", lw=li, zorder=5)
    th = np.linspace(0, 2 * np.pi, 361)
    if op.circulo_perimetral:
        ax.plot(np.cos(th), np.sin(th), "k", lw=op.ancho_borde * 0.5, zorder=5)
    paso_et = int(op.paso_etiquetas)
    if op.marcas_exteriores:
        for az in np.arange(0, 360, float(op.espaciado_marcas)):
            largo = 0.045 if np.isclose(az % paso_et, 0) else 0.022
            s, c = np.sin(np.radians(az)), np.cos(np.radians(az))
            ax.plot([s, s * (1 + largo)], [c, c * (1 + largo)], "k", lw=li, zorder=5)
    et = str(op.etiquetas).lower()
    cardinal = et in ("cardinales", "ambos")
    if et in ("grados", "ambos"):
        for az in range(0, 360, paso_et):
            if cardinal and az % 90 == 0:
                continue
            s, c = np.sin(np.radians(az)), np.cos(np.radians(az))
            ax.text(s * 1.11, c * 1.11, f"{az}°", ha="center", va="center", fontsize=fs - 1, color="0.2")
    if cardinal:
        for az, txt in [(0, "N"), (90, "E"), (180, "S"), (270, "W")]:
            s, c = np.sin(np.radians(az)), np.cos(np.radians(az))
            ax.text(s * 1.12, c * 1.12, txt, ha="center", va="center", fontsize=fs + 2, weight="bold")
    if op.cruz_central:
        ax.plot([-0.025, 0.025], [0, 0], "k", lw=li, zorder=6)
        ax.plot([0, 0], [-0.025, 0.025], "k", lw=li, zorder=6)
    ax.set_aspect("equal")
    ax.set_xlim(-1.22, 1.22)
    ax.set_ylim(-1.3, 1.22)
    ax.axis("off")
    if op.titulo and titulo:
        ax.set_title(titulo, fontsize=fs + 3, weight="bold", loc="left")
    if op.mostrar_proyeccion:
        ax.text(0, -1.27, texto_proyeccion(op), ha="center", fontsize=fs - 1.5, color="0.35")


def texto_proyeccion(op):
    """«Estereograma equiareal - Polar - Hemisferio inferior» (cada elemento con mayúscula inicial)."""
    partes = ["Estereograma equiangular" if _es_wulff(op.proyeccion) else "Estereograma equiareal"]
    red = str(op.red).lower()
    if red in ("ecuatorial", "polar"):
        partes.append(red.capitalize())
    partes.append(f"Hemisferio {str(op.hemisferio).lower()}")
    return " - ".join(partes)


def nueva_figura(op, titulo="", filtro=""):
    """Figura con la red dibujada; la disposición depende de la ubicación de la leyenda."""
    T, u = op.tamano_figura, ubicacion(op)
    if u == "abajo":
        fig = plt.figure(figsize=(T * 1.12, T * 1.55))
        ax = fig.add_axes([0.02, 0.36, 0.84, 0.6])
    elif u == "ninguna":
        fig = plt.figure(figsize=(T * 1.05, T))
        ax = fig.add_axes([0.02, 0.02, 0.96, 0.9])
    else:
        fig = plt.figure(figsize=(T * 1.6, T))
        ax = fig.add_axes([0.40, 0.02, 0.59, 0.9] if u == "izquierda" else [0.01, 0.02, 0.59, 0.9])
    dibujar_red(ax, op, titulo)
    if op.etiqueta_filtro and filtro:
        ax.text(0.0, 1.0, filtro, transform=ax.transAxes, ha="left", va="top", fontsize=op.tamano_fuente - 1.5,
                style="italic", color="0.3")
    return fig, ax


def kw_leyenda(op):
    u, esc = ubicacion(op), float(op.escala_leyenda) / 100.0
    kw = dict(fontsize=(op.tamano_fuente - 1) * esc, markerscale=esc, frameon=True, borderaxespad=0)
    if u == "izquierda":
        kw.update(loc="upper right", bbox_to_anchor=(-0.02, 1.0))
    elif u == "abajo":
        kw.update(loc="upper left", bbox_to_anchor=(0.0, -0.03))
    else:
        kw.update(loc="upper left", bbox_to_anchor=(1.02, 1.0))
    return kw


def kw_info(op):
    u = ubicacion(op)
    if u == "izquierda":
        return dict(x=-0.02, y=0.0, ha="right", va="bottom")
    if u == "abajo":
        return dict(x=1.0, y=-0.03, ha="right", va="top")
    if u == "ninguna":
        return dict(x=0.0, y=0.0, ha="left", va="bottom")
    return dict(x=1.02, y=0.0, ha="left", va="bottom")


def kw_barra_color(op):
    u = ubicacion(op)
    if u == "izquierda":
        return [-0.1, 0.03, 0.035, 0.36]
    if u == "ninguna":
        return [0.97, 0.03, 0.03, 0.36]
    if u == "abajo":
        return [1.0, 0.05, 0.035, 0.4]
    return [1.05, 0.03, 0.035, 0.36]
