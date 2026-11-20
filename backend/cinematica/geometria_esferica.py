"""Geometría esférica: vectores, polos, buzamiento aparente y líneas de referencia.

Convención: vectores (Este, Norte, abajo), hemisferio inferior, ángulos en grados.
Fuente: Diederichs (1990), cap. 2 y 3.
"""
import numpy as np

TOL = 1e-6   # tolerancia (°) para incluir los casos exactamente en el borde, como Dips


def envolver(a):
    """Diferencia angular llevada a [-180, 180)."""
    return (np.asarray(a, float) + 180.0) % 360.0 - 180.0


def vector_linea(trend, plunge):
    """Cosenos directores de una línea (Diederichs 1990, ec. 2.1–2.2)."""
    t, p = np.radians(trend), np.radians(plunge)
    return np.stack([np.cos(p) * np.sin(t), np.cos(p) * np.cos(t), np.sin(p)], axis=-1)


def linea_desde_vector(v):
    """(trend, plunge) de uno o varios vectores, llevados al hemisferio inferior."""
    v = np.atleast_2d(np.asarray(v, float))
    v = np.where(v[:, [2]] < 0, -v, v)
    v = v / np.linalg.norm(v, axis=1, keepdims=True)
    return np.degrees(np.arctan2(v[:, 0], v[:, 1])) % 360.0, np.degrees(np.arcsin(np.clip(v[:, 2], -1, 1)))


def polo_de_plano(buz, dirbuz):
    """Polo del plano: trend = dirbuz + 180°, plunge = 90° − buz (Diederichs 1990, fig. 2.5)."""
    return (np.asarray(dirbuz, float) + 180.0) % 360.0, 90.0 - np.asarray(buz, float)


def plano_de_polo(trend, plunge):
    return 90.0 - np.asarray(plunge, float), (np.asarray(trend, float) + 180.0) % 360.0


def vector_polo(buz, dirbuz):
    return vector_linea(*polo_de_plano(buz, dirbuz))


def buz_aparente(psi, alfa, trend):
    """Buzamiento aparente del plano (psi/alfa) en la dirección 'trend': tan ψapp = tan ψ · cos(trend − alfa)."""
    d = np.radians(envolver(np.asarray(trend, float) - alfa))
    return np.degrees(np.arctan(np.tan(np.radians(psi)) * np.cos(d)))


def rumbo_a_dirbuz(rumbo, regla="derecha"):
    """Rumbo → dirección de buzamiento (Diederichs 1990, tabla 2.1)."""
    return (np.asarray(rumbo, float) + (90.0 if regla == "derecha" else -90.0)) % 360.0


def orientacion_media(buz, dirbuz, pesos=None):
    """Orientación media por suma vectorial de normales y K de Fisher = (N − 1)/(N − R).

    Dips Verification Manual #1; Diederichs (1990) sec. 3.4.1, ec. 3.6–3.7.
    """
    b, d = np.radians(np.asarray(buz, float)), np.radians(np.asarray(dirbuz, float))
    n = np.c_[np.sin(b) * np.sin(d), np.sin(b) * np.cos(d), np.cos(b)]
    N = len(n)
    w = np.ones(N) if pesos is None else np.asarray(pesos, float)
    w = w * N / w.sum()
    eje = np.linalg.eigh((n * w[:, None]).T @ n)[1][:, -1]   # alinea normales de planos subverticales
    n = np.where((n @ eje)[:, None] < 0, -n, n)
    R = (n * w[:, None]).sum(axis=0)
    m = R / np.linalg.norm(R)
    if m[2] < 0:
        m = -m
    K = np.inf if np.isclose(np.linalg.norm(R), N) else (N - 1) / (N - np.linalg.norm(R))
    return np.degrees(np.arccos(np.clip(m[2], -1, 1))), np.degrees(np.arctan2(m[0], m[1])) % 360.0, K


# ---- Líneas de referencia como secuencias (trend, plunge); el dibujo solo las proyecta ----------------

def lineas_circulo_maximo(buz, dirbuz, n=181):
    """Círculo máximo de un plano: en cada dirección, su buzamiento aparente."""
    off = np.linspace(-90.0, 90.0, n)
    p = np.degrees(np.arctan(np.tan(np.radians(min(float(buz), 89.999))) * np.cos(np.radians(off))))
    p[[0, -1]] = 0.0
    return (dirbuz + off) % 360.0, np.clip(p, 0.0, 90.0)


def lineas_cono_vertical(plunge, n=361):
    """Lugar de las líneas con la misma inclinación (círculo centrado en la proyección)."""
    return np.linspace(0.0, 360.0, n), np.full(n, float(plunge))


def lineas_radial(trend, n=46):
    """Líneas de igual dirección, desde horizontal hasta vertical."""
    return np.full(n, float(trend) % 360.0), np.linspace(0.0, 90.0, n)


def lineas_cono_horizontal(eje_trend, ang, n=181):
    """Líneas que forman 'ang' grados con un eje horizontal (círculos menores de la red ecuatorial)."""
    e = np.radians(eje_trend)
    A, B, C = np.array([np.sin(e), np.cos(e), 0.0]), np.array([np.cos(e), -np.sin(e), 0.0]), np.array([0, 0, 1.0])
    t = np.linspace(0, np.pi, n)[:, None]
    a = np.radians(ang)
    v = np.cos(a) * A + np.sin(a) * (np.cos(t) * B + np.sin(t) * C)
    return np.degrees(np.arctan2(v[:, 0], v[:, 1])) % 360, np.degrees(np.arcsin(np.clip(v[:, 2], -1, 1)))


def lineas_polos_de_planos(buz, dirbuz):
    """Polos de una familia de planos dada como arreglos (p. ej., la envolvente daylight)."""
    return polo_de_plano(buz, dirbuz)
