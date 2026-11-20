"""Resumen SÍ / NO por mecanismo.

Regla: un mecanismo es cinemáticamente posible («SÍ») cuando hay elementos críticos y su porcentaje
alcanza el PORCENTAJE CRÍTICO DE DISCONTINUIDADES (10 % por defecto). Dips solo reporta porcentajes; este valor
lo fija el ingeniero. No es un factor de seguridad ni una probabilidad de falla.
En toppling directo se usan las aristas de las zonas 1 y 2; los planos base y la zona 3 se informan aparte.
"""
from dataclasses import dataclass, field
from typing import List

from cinematica.modelos_datos import porcentaje

UMBRAL_DEFECTO = 10.0   # PORCENTAJE CRÍTICO DE DISCONTINUIDADES por defecto


@dataclass
class VeredictoMecanismo:
    clave: str            # "planar", "cuna", "flexural", "directo"
    nombre: str
    porcentaje: float
    criticos: int
    total: int
    elemento: str         # "polos" o "intersecciones"
    posible: bool
    detalles: List[str] = field(default_factory=list)


def es_posible(criticos, pct, umbral):
    return criticos > 0 and pct >= umbral


def _tipos_criticos(tabla):
    c = tabla[tabla.Critico].Tipo.value_counts()
    return ", ".join(f"{t} ({n})" for t, n in c.items()) if len(c) else "ninguno"


def evaluar_veredicto(res, umbral=UMBRAL_DEFECTO):
    N, Ni = len(res.datos), len(res.intersecciones)
    p, t = res.parametros, res.talud
    v = []

    n = int(res.planar.Critico.sum())
    pc = porcentaje(n, N)
    v.append(VeredictoMecanismo("planar", "Rotura planar", pc, n, N, "polos", es_posible(n, pc, umbral),
                                [f"{n} de {N} polos críticos", f"Envolvente daylight · LL ±{p.ll_planar:g}°",
                                 f"Tipos: {_tipos_criticos(res.planar)}"]))

    n = int(res.cuna.Critico.sum())
    pc = porcentaje(n, Ni)
    v.append(VeredictoMecanismo("cuna", "Rotura en cuña", pc, n, Ni, "intersecciones", es_posible(n, pc, umbral),
                                [f"{n} de {Ni} intersecciones críticas",
                                 f"P2 dos planos {porcentaje((res.cuna.Modo == 'P2').sum(), Ni):.1f} % · "
                                 f"P1 un plano {porcentaje((res.cuna.Modo == 'P1').sum(), Ni):.1f} %",
                                 "Sin límites laterales (Dips)"]))

    n = int(res.flexural.Critico.sum())
    pc = porcentaje(n, N)
    v.append(VeredictoMecanismo("flexural", "Toppling flexural", pc, n, N, "polos", es_posible(n, pc, umbral),
                                [f"{n} de {N} polos críticos", f"Plano límite ψs − φ = {t.buz - p.phi:g}° · "
                                 f"LL ±{p.ll_flexural:g}°", f"Tipos: {_tipos_criticos(res.flexural)}"]))

    n = int(res.directo_aristas.Directo.sum())
    pc = porcentaje(n, Ni)
    nb = int(res.directo_base.Critico.sum())
    v.append(VeredictoMecanismo("directo", "Toppling directo", pc, n, Ni, "intersecciones", es_posible(n, pc, umbral),
                                [f"{n} de {Ni} aristas (zonas 1+2)",
                                 f"Zona 3: {porcentaje(res.directo_aristas.Oblicuo.sum(), Ni):.1f} % · total z1–z3 (C1 Dips): "
                                 f"{porcentaje(res.directo_aristas.C1_Dips.sum(), Ni):.1f} %",
                                 f"Planos base: {nb} de {N} ({porcentaje(nb, N):.1f} %)"]))
    return v


def redactar_veredicto(veredictos, umbral=UMBRAL_DEFECTO):
    """Devuelve (título, texto) del recuadro de veredicto."""
    posibles = [x.nombre.lower() for x in veredictos if x.posible]
    if not posibles:
        return ("Ningún mecanismo alcanza el porcentaje crítico",
                f"Con un porcentaje crítico de discontinuidades de {umbral:g} %, ningún mecanismo se marca como posible.")
    lista = posibles[0] if len(posibles) == 1 else ", ".join(posibles[:-1]) + " y " + posibles[-1]
    return (f"{len(posibles)} de {len(veredictos)} mecanismos cinemáticamente posibles",
            f"Posibles: {lista} (porcentaje crítico de discontinuidades {umbral:g} %).")
