"""Líneas de intersección de cada par de planos (Diederichs 1990, ec. 2.3–2.4)."""
import numpy as np
import pandas as pd

from cinematica.geometria_esferica import linea_desde_vector, vector_polo


def calcular_intersecciones(datos, ang_min=0.0):
    """n1 × n2 para cada par. Como Dips, solo omite los planos idénticos; 'ang_min' permite descartar casi paralelos."""
    n = vector_polo(datos["Buz"].to_numpy(float), datos["DirBuz"].to_numpy(float))
    i, j = np.triu_indices(len(datos), k=1)
    c = np.cross(n[i], n[j]) if len(i) else np.empty((0, 3))
    ang = np.degrees(np.arcsin(np.clip(np.linalg.norm(c, axis=1), 0, 1))) if len(c) else np.array([])
    ok = (ang > 1e-6) & (ang >= ang_min)   # planos idénticos no tienen intersección (Dips también los omite)
    i, j, c = i[ok], j[ok], c[ok]
    trend, plunge = linea_desde_vector(c) if len(c) else (np.array([]), np.array([]))
    ids, b, d = datos["ID"].to_numpy(), datos["Buz"].to_numpy(float), datos["DirBuz"].to_numpy(float)
    tipo = datos["Tipo"].to_numpy() if "Tipo" in datos else np.full(len(datos), "Sin tipo")
    pers = datos["Persistencia"].to_numpy(float) if "Persistencia" in datos else np.full(len(datos), np.nan)
    return pd.DataFrame({
        "Plano_1": ids[i], "Tipo_1": tipo[i], "Buz_1": b[i], "DirBuz_1": d[i], "Persist_1": pers[i],
        "Plano_2": ids[j], "Tipo_2": tipo[j], "Buz_2": b[j], "DirBuz_2": d[j], "Persist_2": pers[j],
        "Persist_min": np.fmin(pers[i], pers[j]),
        "Trend": trend, "Plunge": plunge})   # sin redondear: se redondea solo al mostrar
