"""Casos de validación que aplican al enfoque Dips.

Cada caso compara el código con un resultado publicado, con una ecuación de la fuente o con un caso construido
que debe cumplir la condición del texto. Talud de referencia 70/180, φ = 30°, LL = 20°, salvo indicación.
"""
import os

import numpy as np
import pandas as pd

from cinematica.analisis_cinematico import ejecutar_analisis_dips
from cinematica.criterio_cuna_dips import evaluar_cuna
from cinematica.criterio_planar_dips import evaluar_planar, zona_planar
from cinematica.criterio_toppling_directo_dips import evaluar_toppling_directo
from cinematica.criterio_toppling_flexural_dips import evaluar_flexural
from cinematica.densidad_polos_fisher import (AREA_CONTEO, densidad_en_puntos, pesos_terzaghi, semiangulo_conteo,
                                              tabla_influencia_fisher)
from cinematica.geometria_esferica import (buz_aparente, envolver, orientacion_media, polo_de_plano, rumbo_a_dirbuz,
                                           vector_linea, vector_polo)
from cinematica.intersecciones_planos import calcular_intersecciones
from cinematica.lectura_discontinuidades import (clase_persistencia, filtrar, leer_archivo, leer_tabla,
                                                 validar_discontinuidades)
from cinematica.modelos_datos import GeometriaTalud, ParametrosDips
from cinematica.planos_paralelos_talud import planos_paralelos
from cinematica.veredicto_mecanismos import evaluar_veredicto
from estereograma.proyeccion_estereografica import inv_proyectar, malla_proyeccion, proyectar

RUTA_EJEMPLO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "datos_ejemplo",
                            "discontinuidades_ejemplo.csv")
RUTA_DIPS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos_dips", "prueba_01_zona_01_pared_W.csv")


def _t(buz=70, dirbuz=180):
    return GeometriaTalud(buz, dirbuz, "Prueba")


def _p(phi=30, ll=20, bordes="dips"):
    """Los casos de las fuentes y de Dips se comprueban con el borde incluido, como Dips."""
    return ParametrosDips(phi=phi, ll_planar=ll, ll_flexural=ll, ll_directo=ll, bordes_talud=bordes)


def _df(planos):
    return pd.DataFrame({"ID": [str(i) for i in range(len(planos))], "Tipo": "JN",
                         "Buz": [float(b) for b, _ in planos], "DirBuz": [float(d) for _, d in planos],
                         "Persistencia": np.nan, "Clase_P": "Sin dato"})


def _inter(trend, plunge):
    n = len(trend)
    return pd.DataFrame({"Plano_1": ["a"] * n, "Buz_1": [0.0] * n, "DirBuz_1": [0.0] * n,
                         "Plano_2": ["b"] * n, "Buz_2": [0.0] * n, "DirBuz_2": [0.0] * n,
                         "Persist_min": [np.nan] * n, "Trend": trend, "Plunge": plunge})


def _cuna(planos, talud=None, param=None):
    return evaluar_cuna(calcular_intersecciones(_df(planos)), talud or _t(), param or _p())


def _directo(planos, inter=None, talud=None, param=None):
    d = _df(planos)
    return evaluar_toppling_directo(d, calcular_intersecciones(d) if inter is None else inter,
                                    talud or _t(), param or _p())


def ejecutar_validacion():
    casos = []

    def verificar(fuente, caso, condicion):
        casos.append({"Fuente": fuente, "Caso": caso, "Resultado": "✔" if bool(condicion) else "✘"})

    # ---------------------------------------------------------------- casos básicos
    F = "Casos básicos"
    r = evaluar_planar(_df([(50, 175), (75, 175), (25, 180), (50, 240)]), _t(), _p())
    verificar(F, "Planar: crítico | no aflora | fricción | fuera de LL", list(r.Critico) == [True, False, False, False])
    r = evaluar_flexural(_df([(75, 5), (45, 0), (80, 60)]), _t(), _p())
    verificar(F, "Flexural: crítico | poco inclinado | fuera de LL", list(r.Critico) == [True, False, False])
    c = _cuna([(60, 140), (60, 220)])
    verificar(F, "Cuña 60/140 + 60/220 → intersección 53/180 en zona primaria",
              abs(c.Trend.iloc[0] - 180) < 0.5 and 52 < c.Plunge.iloc[0] < 54 and c.Zona_Primaria.iloc[0])
    c = _cuna([(30, 150), (30, 210)])
    verificar(F, "Cuña con intersección de 25° < φ → no está en la zona primaria", not c.Zona_Primaria.iloc[0])
    ri, rb = _directo([(80, 330), (80, 30), (10, 180), (10, 0)])
    verificar(F, "Directo: 80/330 + 80/030 → arista hacia el interior del talud",
              ri[(ri.Plano_1 == "0") & (ri.Plano_2 == "1")].Directo.iloc[0])
    verificar(F, "Directo: 10/180 plano base; 10/000 no (buza hacia el talud)", list(rb.Critico) == [False, False, True, False])

    # ---------------------------------------------------------------- Diederichs (1990)
    F = "Diederichs (1990)"
    t, p = polo_de_plano(50, 120)
    verificar(F, "Fig. 2.5: polo = (dirbuz + 180, 90 − buz)", np.isclose(t, 300) and np.isclose(p, 40))
    v = vector_linea(30, 40)
    verificar(F, "Ec. 2.1–2.2: cosenos directores unitarios",
              np.allclose(v, [np.sin(np.radians(30)) * np.cos(np.radians(40)),
                              np.cos(np.radians(30)) * np.cos(np.radians(40)), np.sin(np.radians(40))])
              and np.isclose(np.linalg.norm(v), 1))
    pa, pb = vector_polo(60, 140), vector_polo(60, 220)
    inter = calcular_intersecciones(_df([(60, 140), (60, 220)]))
    li = vector_linea(inter.Trend.iloc[0], inter.Plunge.iloc[0])
    cx = np.cross(pa, pb)
    cx /= np.linalg.norm(cx)
    verificar(F, "Ec. 2.3–2.4: intersección = producto vectorial de polos, contenida en ambos planos",
              np.isclose(abs(li @ cx), 1, atol=1e-4) and abs(li @ pa) < 1e-3 and abs(li @ pb) < 1e-3)
    verificar(F, "Sec. 3.2.2, ec. 3.2: equiárea r = √2·cos(45° + plunge/2)",
              all(np.isclose(np.hypot(*proyectar(135, pl, "equiarea")), np.sqrt(2) * np.cos(np.radians(45 + pl / 2)))
                  for pl in (0, 25, 60, 90))
              and np.allclose(inv_proyectar(*proyectar(212.0, 37.0, "equiarea"), "equiarea"), (212.0, 37.0)))
    verificar(F, "Fig. 3.4 (según Priest 1985): equiángulo r = tan(45° − plunge/2)",
              all(np.isclose(np.hypot(*proyectar(135, pl, "equiangulo")), np.tan(np.radians(45 - pl / 2)))
                  for pl in (0, 25, 60, 90))
              and np.allclose(inv_proyectar(*proyectar(212.0, 37.0, "equiangulo"), "equiangulo"), (212.0, 37.0)))
    p_ = np.array([5.0, 20.0, 45.0, 70.0, 85.0])
    verificar(F, "Sec. 3.2.2: equiárea conserva áreas (r² = 1 − sin p)",
              np.allclose(np.hypot(*proyectar(0.0, p_, "equiarea")) ** 2, 1 - np.sin(np.radians(p_))))

    def _desvio_circulo(x, y):
        A = np.c_[x, y, np.ones_like(x)]
        a, b, _ = np.linalg.lstsq(A, x ** 2 + y ** 2, rcond=None)[0]
        return np.ptp(np.hypot(x - a / 2, y - b / 2))
    eje = vector_linea(120.0, 35.0)
    u = np.cross(eje, [0, 0, 1.0])
    u /= np.linalg.norm(u)
    w_ = np.cross(eje, u)
    tt = np.linspace(0, 2 * np.pi, 72)[:, None]
    cono = np.cos(np.radians(20)) * eje + np.sin(np.radians(20)) * (np.cos(tt) * u + np.sin(tt) * w_)
    tr_c, pl_c = np.degrees(np.arctan2(cono[:, 0], cono[:, 1])) % 360, np.degrees(np.arcsin(cono[:, 2]))
    dw, ds = _desvio_circulo(*proyectar(tr_c, pl_c, "equiangulo")), _desvio_circulo(*proyectar(tr_c, pl_c, "equiarea"))
    verificar(F, f"Sec. 3.2.1: equiángulo — un cono se proyecta como círculo exacto (desvío {dw:.1e}; equiárea {ds:.3f})",
              dw < 1e-9 and ds > 1e-3)
    rho = semiangulo_conteo()
    xi_tab, infl_tab, kappa = tabla_influencia_fisher(rho)
    verificar(F, "Sec. 5.3.5: círculo de conteo = 1 % del hemisferio", np.isclose(1 - np.cos(np.radians(rho)), AREA_CONTEO))
    verificar(F, "Fisher: densidad en ρ = 5 % del máximo", np.isclose(np.exp(kappa * (np.cos(np.radians(rho)) - 1)), 0.05))
    xi = np.radians(xi_tab)
    trapecio = getattr(np, "trapezoid", None) or np.trapz
    vol = trapecio(infl_tab * 2 * np.pi * np.sin(xi), xi) / (2 * np.pi * (1 - np.cos(np.radians(rho))))
    verificar(F, "Fisher: volumen de influencia = cilindro de Schmidt (±1 %)", abs(vol - 1) < 0.01)
    P1 = vector_polo(np.array([50.0]), np.array([120.0]))
    verificar(F, "Un polo: densidad 100 % en su posición (Schmidt y Fisher)",
              all(np.isclose(densidad_en_puntos(P1, P1, metodo=m)[0], 100.0) for m in ("Schmidt", "Fisher")))
    verificar(F, "Fig. 5.9: polo junto al borde cuenta en el lado opuesto",
              densidad_en_puntos(vector_polo(np.array([89.0]), np.array([0.0])),
                                 vector_polo(np.array([89.0]), np.array([180.0])), metodo="Schmidt")[0] == 100.0)
    w = pesos_terzaghi(pd.DataFrame({"Buz": [90.0, 0.0], "DirBuz": [270.0, 0.0]}), (90.0, 0.0), 15)
    verificar(F, "Sec. 5.3.6: Terzaghi w = 1 (plano ⟂ línea) y w máx = 1/sin(ángulo mín)",
              np.isclose(w[0], 1.0) and np.isclose(w[1], 1 / np.sin(np.radians(15))))
    t, p = polo_de_plano(55, 300)
    verificar(F, "Tabla 2.1: plano 55/300 ↔ polo 120/35", np.isclose(t, 120) and np.isclose(p, 35))
    verificar(F, "Tabla 2.1: rumbo 210 (mano derecha) y 030 (mano izquierda) → dirbuz 300",
              np.isclose(rumbo_a_dirbuz(210, "derecha"), 300) and np.isclose(rumbo_a_dirbuz(30, "izquierda"), 300))
    bm, dm, K = orientacion_media([85, 85], [90, 270])
    verificar(F, "Sec. 3.4.1: media de 85/090 y 85/270 = plano vertical", np.isclose(bm, 90))
    bm, dm, K = orientacion_media([60, 60, 60], [100, 100, 100])
    verificar(F, "Ec. 3.6: K de Fisher → ∞ si los planos son paralelos", np.isinf(K) and np.isclose(bm, 60))

    # ---------------------------------------------------------------- Dips Verification Manual
    F = "Dips Verification Manual"
    bm, dm, _ = orientacion_media([68, 63, 53, 76, 70, 61, 72, 52, 74, 67], [118, 109, 119, 106, 118, 101, 102, 112, 117, 113])
    verificar(F, f"Problema #1: media {bm:.4f}/{dm:.4f} = 65.4771/111.4391",
              abs(bm - 65.4771) < 1e-3 and abs(dm - 111.4391) < 1e-3)

    # ---------------------------------------------------------------- Dips v9 (ayuda en línea)
    F = "Dips v9"
    r = evaluar_planar(_df([(69, 200), (69, 180)]), _t(), _p())
    verificar(F, "Planar Sliding: envolvente daylight — 69/200 no aflora (ψapp = 68.8°) aunque ψj < ψs; 69/180 sí",
              list(r.Critico) == [False, True] and all(np.array([69, 69]) < 70))
    c = _cuna([(60, 140), (60, 220)])
    verificar(F, "Wedge Sliding: zona primaria", c.Zona_Primaria.iloc[0] and c.Critico.iloc[0])
    b1 = np.degrees(np.arctan(np.tan(np.radians(25)) / np.cos(np.radians(50))))
    b2 = np.degrees(np.arctan(np.tan(np.radians(25)) / np.cos(np.radians(40))))
    b3 = np.degrees(np.arctan(np.tan(np.radians(25)) / np.cos(np.radians(20))))
    c = _cuna([(b1, 190), (b2, 100)])
    verificar(F, "Wedge Sliding: zona secundaria, desliza sobre el plano con vector en la primaria",
              c.Zona_Secundaria.iloc[0] and not c.Zona_Primaria.iloc[0] and c.Plano_Deslizamiento.iloc[0] == "0")
    c = _cuna([(b3, 120), (b2, 100)])
    verificar(F, "Wedge Sliding: zona secundaria sin plano en la primaria → no crítica",
              abs(c.Plunge.iloc[0] - 25) < 0.2 and not c.Critico.iloc[0])
    r = evaluar_flexural(_df([(75, 5), (49, 0), (51, 20), (80, 40)]), _t(), _p())
    verificar(F, "Flexural Toppling: fuera del plano límite y dentro de ±LL", list(r.Critico) == [True, False, False, False])
    ri, _ = _directo([], _inter([0, 0, 0, 10, 60, 60, 180], [40, 75, 15, 65, 70, 50, 75]))
    verificar(F, "Direct Toppling: zonas 1, 2, 3 y no críticas",
              list(ri.Clasificacion) == ["Directo (zona 1)", "Directo (zona 2)", "No crítica", "Directo (zona 2)",
                                         "Oblicuo (zona 3)", "No crítica", "No crítica"])
    _, rb = _directo([(10, 180), (20, 230), (10, 0), (40, 180)], _inter([], []))
    verificar(F, "Direct Toppling: planos base «Sliding+Base» (ψ ≤ φ) y «Base» (φ ≤ ψ ≤ ψs dentro de ±LL)",
              list(rb.Etiqueta_Dips) == ["Sliding+Base", "Sliding+Base", "", "Base"]
              and list(rb.Critico) == [True, True, False, True])
    verificar(F, "Direct Toppling: polo en zona 1 = vuelca y desliza", rb.Vuelca_y_Desliza.iloc[3])

    # ---------------------------------------------------------------- Exportación de Dips v9 (datos reales)
    F = "Exportación de Dips v9 · Prueba 01 Zona 01 pared W"
    if os.path.exists(RUTA_DIPS):
        datos, _ = validar_discontinuidades(leer_archivo(RUTA_DIPS))
        res = ejecutar_analisis_dips(datos, _t(70, 119), _p(30, 20))
        Ni = len(res.intersecciones)
        verificar(F, f"{len(datos)} planos y {Ni:,} intersecciones (Dips: 1 144 y 653 721; omite solo planos idénticos)",
                  len(datos) == 1144 and Ni == 653721)
        for nombre, n, esperado in [("Rotura planar", res.planar.Critico.sum(), 137),
                                    ("Toppling flexural", res.flexural.Critico.sum(), 71),
                                    ("Planos base «Base»", (res.directo_base.Etiqueta_Dips == "Base").sum(), 148),
                                    ("Planos base «Sliding+Base»", (res.directo_base.Etiqueta_Dips == "Sliding+Base").sum(), 59)]:
            verificar(F, f"{nombre}: {int(n)} planos (Dips {esperado})", int(n) == esperado)
        for nombre, n, esperado in [("Cuña P2 (dos planos)", (res.cuna.Modo == "P2").sum(), 104640),
                                    ("Cuña P1 (un plano)", (res.cuna.Modo == "P1").sum(), 69118),
                                    ("Toppling directo C1 (zonas 1+2+3)", res.directo_aristas.C1_Dips.sum(), 74893)]:
            verificar(F, f"{nombre}: {int(n):,} (Dips {esperado:,}; diferencia {abs(int(n) - esperado) / Ni * 100:.3f} % "
                         "del total, casos exactamente en el borde)", abs(int(n) - esperado) / Ni < 0.0005)

    # ---------------------------------------------------------------- Planos paralelos al talud (casos de borde)
    F = "Planos paralelos al talud"
    datos_b = _df([(70, 180), (50, 150), (50, 210), (45, 180)])
    r_d = ejecutar_analisis_dips(datos_b, _t(70, 180), _p(bordes="dips"))
    r_e = ejecutar_analisis_dips(datos_b, _t(70, 180), _p(bordes="excluir"))
    verificar(F, "Plano 70/180 = talud: crítico planar en modo Dips (borde incluido)", bool(r_d.planar.Critico.iloc[0]))
    verificar(F, "Plano 70/180 = talud: no crítico al excluir; el resto igual",
              list(r_e.planar.Critico) == [False] + list(r_d.planar.Critico.iloc[1:]))
    con_talud = r_e.cuna.Paralelo_Talud.to_numpy()
    verificar(F, "Sus intersecciones quedan sobre la cara (ψi = ψapp) y al excluir no son críticas",
              con_talud.sum() == 3 and not r_e.cuna.Critico[con_talud].any()
              and bool((abs(r_e.cuna.Plunge - buz_aparente(70, 180, r_e.cuna.Trend))[con_talud] < 1e-6).all()))
    verificar(F, "Toppling flexural y directo (aristas y planos base) no cambian: la exclusión es solo planar y cuña",
              list(r_e.flexural.Critico) == list(r_d.flexural.Critico)
              and list(r_e.directo_base.Critico) == list(r_d.directo_base.Critico)
              and list(r_e.directo_aristas.C1_Dips) == list(r_d.directo_aristas.C1_Dips)
              and "Paralelo_Talud" not in r_e.directo_base)
    verificar(F, "Las intersecciones sin el plano paralelo no cambian",
              list(r_e.cuna.Critico[~con_talud]) == list(r_d.cuna.Critico[~con_talud]))
    casi = _df([(70, 180), (70.1, 180), (70, 180.5), (69.9, 179.9), (70.0, 180.0)])
    verificar(F, "Solo planos exactamente paralelos: 70/180 y 70.0/180.0 sí; 70.1/180, 70/180.5 y 69.9/179.9 no",
              list(planos_paralelos(casi, _t(70, 180))) == [True, False, False, False, True])
    verificar(F, "Los totales no cambian (porcentajes comparables con Dips)",
              len(r_e.datos) == len(r_d.datos) and len(r_e.intersecciones) == len(r_d.intersecciones))
    if os.path.exists(RUTA_DIPS):
        datos, _ = validar_discontinuidades(leer_archivo(RUTA_DIPS))
        res = ejecutar_analisis_dips(datos, _t(70, 119), _p(30, 20, bordes="excluir"))
        verificar(F, "Pared W al excluir: 1 plano (70/119) y sus 1 143 intersecciones",
                  int(res.planar.Paralelo_Talud.sum()) == 1 and int(res.cuna.Paralelo_Talud.sum()) == 1143)
        verificar(F, "Pared W: planar 136, cuña 173 014; toppling sin cambio («Base» 148, flexural 71, C1 74 904)",
                  int(res.planar.Critico.sum()) == 136 and int((res.directo_base.Etiqueta_Dips == "Base").sum()) == 148
                  and int(res.cuna.Critico.sum()) == 173014 and int(res.flexural.Critico.sum()) == 71
                  and int(res.directo_aristas.C1_Dips.sum()) == 74904)

    # ---------------------------------------------------------------- Hudson & Harrison (2000), coincidentes con Dips
    F = "Hudson & Harrison (2000)"
    th, ph = _t(75, 295), _p(30, 20)
    r = evaluar_planar(_df([(50, 295), (50, 320), (80, 295), (25, 295)]), th, ph)
    verificar(F, "18.1.1 planar: crítico | fuera de ±20° | no aflora | fricción", list(r.Critico) == [True, False, False, False])
    c = evaluar_cuna(_inter([335], [50]), th, ph)
    verificar(F, "18.1.2 cuña: sin límites laterales, intersección a 40° del eje sigue crítica", c.Zona_Primaria.iloc[0])
    c = evaluar_cuna(_inter([295, 295], [78, 25]), th, ph)
    verificar(F, "Fig. 18.4: límites del talud (círculo máximo) y de fricción", list(c.Zona_Primaria) == [False, False])
    ri, _ = evaluar_toppling_directo(_df([]), _inter([115, 115, 115, 150], [70, 40, 10, 70]), th, ph)
    verificar(F, "Fig. 18.6: aristas dentro de ±20° con plunge ≥ 90 − φ (zona 2)", list(ri.Zona_2) == [True, False, False, False])
    _, rb = evaluar_toppling_directo(_df([(50, 295)]), _inter([], []), th, ph)
    verificar(F, "Fig. 18.6: plano entre φ y ψs → vuelca y desliza", rb.Vuelca_y_Desliza.iloc[0])
    r = evaluar_flexural(_df([(50, 115), (40, 115), (60, 155)]), th, ph)
    verificar(F, "Fig. 18.9 flexural: crítico | no supera el límite | fuera de ±20°", list(r.Critico) == [True, False, False])

    # ---------------------------------------------------------------- Wyllie (2018), geometría y casos coincidentes
    F = "Wyllie (2018)"
    r = evaluar_planar(_df([(45, 190), (45, 215), (70, 185), (25, 185)]), _t(65, 185), _p())
    verificar(F, "7.2 condiciones 1–3: ±20°, aflora, ψp > φ", list(r.Critico) == [True, False, False, False])
    inter = calcular_intersecciones(_df([(45, 105), (70, 235)]))
    tA, tB = np.tan(np.radians(45)), np.tan(np.radians(70))
    a_i = np.degrees(np.arctan((tA * np.cos(np.radians(105)) - tB * np.cos(np.radians(235)))
                               / (tB * np.sin(np.radians(235)) - tA * np.sin(np.radians(105))))) % 180
    a_i = a_i if 105 <= a_i <= 235 else a_i + 180
    p_i = np.degrees(np.arctan(tA * np.cos(np.radians(105 - a_i))))
    verificar(F, f"Ec. 8.1–8.2: intersección {inter.Plunge.iloc[0]}/{inter.Trend.iloc[0]} = {p_i:.1f}/{a_i:.1f}",
              abs(inter.Trend.iloc[0] - a_i) < 0.1 and abs(inter.Plunge.iloc[0] - p_i) < 0.1)
    verificar(F, "Tabla 8.2: ψ5 = 31.2°", abs(inter.Plunge.iloc[0] - 31.2) < 0.1)
    c = _cuna([(60, 140), (60, 220)], _t(55, 150))
    verificar(F, "8.2 cond. 2: la cara se mide con su buzamiento aparente (50.5° < 53° → no aflora)", not c.Zona_Primaria.iloc[0])
    r = evaluar_flexural(_df([(75, 8), (75, 15)]), _t(), _p(30, 10))
    verificar(F, "Ec. 10.5: alineación ±10°", list(r.Critico) == [True, False])

    # ---------------------------------------------------------------- Kliche (2019)
    F = "Kliche (2019)"
    r = evaluar_planar(_df([(45, 143), (45, 180), (25, 150), (80, 150)]), _t(75, 150), _p())
    verificar(F, "Test de Markland planar: ψ > β > φ y dirección dentro de ±20°", list(r.Critico) == [True, False, False, False])
    rng = np.random.default_rng(1)
    pl = _df(list(zip(rng.uniform(0, 90, 400).round(1), rng.uniform(0, 360, 400).round(1))))
    r = evaluar_planar(pl, _t(), _p())
    r_dv, r_fr = np.hypot(*proyectar(pl.DirBuz, pl.Buz, "equiarea")), np.hypot(*proyectar(0, 30, "equiarea"))
    r_ta = np.hypot(*proyectar(pl.DirBuz, np.clip(buz_aparente(70, 180, pl.DirBuz), 0, None), "equiarea"))
    modo_dv = (r_dv < r_fr) & (r_dv > r_ta) & (np.abs(envolver(pl.DirBuz - 180)) <= 20)
    verificar(F, "Fig. 5.6 vs 5.7: modo polos ≡ modo vectores de buzamiento (400 planos al azar)",
              (r.Critico.to_numpy() == modo_dv).all())
    r = evaluar_flexural(_df([(75, 5), (51, 20)]), _t(), _p())
    verificar(F, "Fig. 5.9: fuera del plano límite (ψ − φ) y dentro de ±LL", list(r.Critico) == [True, False])
    ri, rb = _directo([(80, 330), (80, 30), (10, 180)])
    verificar(F, "Test de Markland para toppling: plano base hacia la cara + aristas que socavan",
              rb.Critico.iloc[2] and ri[(ri.Plano_1 == "0") & (ri.Plano_2 == "1")].Directo.iloc[0])

    # ---------------------------------------------------------------- Entrada de datos
    F = "Entrada de datos e ISRM (1978)"
    prueba = leer_tabla("Dip\tDip Direction\tType\tPersistence\n45\t360\tJoint\t2,5\n95\t100\tJoint\t1\n30\tabc\tFault\t\n")
    verificar(F, "Encabezados Dip / Dip Direction / Type / Persistence reconocidos",
              {"ID", "Buz", "DirBuz", "Tipo", "Persistencia"} <= set(prueba.columns))
    ok, desc = validar_discontinuidades(prueba)
    verificar(F, "DirBuz 360 → 0 y coma decimal 2,5 → 2.5",
              len(ok) == 1 and ok.DirBuz.iloc[0] == 0 and ok.Persistencia.iloc[0] == 2.5)
    verificar(F, "Se descartan Buz > 90° y DirBuz no numérica, con su motivo",
              list(desc.Motivo) == ["Buz fuera de 0–90°", "Buz o DirBuz vacío / no numérico"])
    ok, _ = validar_discontinuidades(leer_tabla("Buz;DirBuz;Persistencia\n50;100;0,5\n50;120;4\n"))
    ok, texto = filtrar(ok, persistencia_min=1)
    verificar(F, "La persistencia mínima excluye estructuras más cortas y queda en la etiqueta de filtro",
              len(ok) == 1 and "Persistencia ≥ 1 m" in texto)
    verificar(F, "Clases ISRM: 0.5 | 2 | 5 | 15 | 25 m | sin dato",
              list(clase_persistencia([0.5, 2, 5, 15, 25, np.nan])) == ["Muy baja", "Baja", "Media", "Alta", "Muy alta", "Sin dato"])

    # ---------------------------------------------------------------- Estereograma
    F = "Estereograma"
    x0, y0 = proyectar(30, 40, "equiarea", "inferior")
    x1, y1 = proyectar(30, 40, "equiarea", "superior")
    verificar(F, "Hemisferio superior: cada línea se dibuja en su antípoda", np.allclose([x1, y1], [-x0, -y0]))
    rng = np.random.default_rng(3)
    pl = _df(list(zip(rng.uniform(0, 90, 300).round(1), rng.uniform(0, 360, 300).round(1))))
    r = evaluar_planar(pl, _t(), _p())
    coincide = []
    for modo in ("equiarea", "equiangulo"):
        for hem in ("inferior", "superior"):
            gx, gy, dentro, gt, gp = malla_proyeccion(modo, hem, 401)
            zona = zona_planar(gt, gp, _t(), _p())      # la misma función que usa el dibujo
            x, y = proyectar(*polo_de_plano(pl.Buz, pl.DirBuz), modo, hem)
            i, j = np.rint((y + 1) / 2 * 400).astype(int), np.rint((x + 1) / 2 * 400).astype(int)
            coincide.append((zona[i, j] == r.Critico.to_numpy()).mean())
    verificar(F, f"Zona sombreada = cálculo en las 4 combinaciones proyección/hemisferio ({min(coincide) * 100:.1f} %)",
              min(coincide) > 0.97)

    # ---------------------------------------------------------------- Resumen SÍ / NO
    F = "Resumen SÍ / NO"
    if os.path.exists(RUTA_EJEMPLO):
        datos, _ = validar_discontinuidades(leer_archivo(RUTA_EJEMPLO))
        res = ejecutar_analisis_dips(datos, _t(), _p())
        si = lambda u: ["SÍ" if v.posible else "NO" for v in evaluar_veredicto(res, u)]  # noqa: E731
        verificar(F, "Datos de ejemplo, umbral 5 %: planar SÍ, cuña SÍ, flexural SÍ, directo NO", si(5) == ["SÍ", "SÍ", "SÍ", "NO"])
        verificar(F, "Umbral 0 %: basta un elemento crítico (directo pasa a SÍ)", si(0) == ["SÍ", "SÍ", "SÍ", "SÍ"])
        verificar(F, "Umbral 30 %: solo la cuña (44.9 %) supera el umbral", si(30) == ["NO", "SÍ", "NO", "NO"])
    res = ejecutar_analisis_dips(_df([(20, 0), (25, 90)]), _t(), _p())
    verificar(F, "Sin elementos críticos → NO aunque el umbral sea 0 %",
              not any(v.posible for v in evaluar_veredicto(res, 0)))

    return pd.DataFrame(casos)


def resumen_por_fuente(tabla):
    t = tabla.assign(OK=tabla.Resultado == "✔")
    return t.groupby("Fuente", sort=False).agg(Casos=("OK", "size"), Correctos=("OK", "sum"))
