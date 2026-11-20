"""Planos paralelos a la cara del talud: tratamiento de los casos de borde.

Un plano con la misma orientación que el talud (ψ = ψs, α = αs) es la propia cara o una lámina paralela a ella:
  · como plano no aflora (no corta la cara), aunque cae justo sobre la envolvente daylight;
  · todas sus intersecciones con otros planos están contenidas en la cara (ψi = ψapp exactamente), es decir,
    forman "cuñas" de volumen nulo que tampoco afloran.
Wyllie (2018) y Hudson & Harrison (2000) piden desigualdades estrictas (ψs > ψp, ψs > ψi), así que estos casos
no son críticos. Dips v9, en cambio, incluye el borde para planar y planos base, y en cuña clasifica estas
intersecciones según el error de redondeo (en la prueba Pared W: 749 sí y 394 no, de 1 143).

Modos (ParametrosDips.bordes_talud):
  "excluir"  (solo rotura planar y en cuña) planos con EXACTAMENTE la misma orientación que el talud (mismo buzamiento y misma dirección de
             buzamiento, con los mismos decimales) y sus intersecciones nunca son críticos (por defecto).
             Un plano que difiere aunque sea 0.1° ya no es paralelo: sus cuñas tienen volumen y se evalúan normal.
  "dips"     sin exclusión; no está en la interfaz, solo se usa para comparar con exportaciones de Dips
Los totales (N de polos e intersecciones) no cambian, para que los porcentajes sigan siendo comparables con Dips.
"""
import numpy as np

from cinematica.geometria_esferica import envolver

MOTIVO = "Excluida: plano paralelo al talud"


EXACTO = 1e-9   # solo absorbe la representación binaria (70.1 se guarda como 70.0999…); no es una tolerancia


def planos_paralelos(datos, talud):
    """Máscara de planos con el mismo buzamiento y la misma dirección de buzamiento que el talud (360° = 0°)."""
    buz = datos["Buz"].to_numpy(float)
    dif = envolver(datos["DirBuz"].to_numpy(float) - float(talud.dirbuz))
    return (np.abs(buz - float(talud.buz)) <= EXACTO) & (np.abs(dif) <= EXACTO)


def aplicar_exclusion(res, mascara):
    """Rotura planar y en cuña: los planos de 'mascara' y sus intersecciones no son críticos. Modifica res en el lugar.

    Solo se aplica a los mecanismos de deslizamiento hacia la cara (el bloque tendría volumen cero). Toppling
    flexural y directo (aristas y planos base) se evalúan sin cambios.
    """
    ids = set(res.datos["ID"][mascara])
    res.planar["Paralelo_Talud"] = res.planar["ID"].isin(ids).to_numpy()
    res.planar.loc[res.planar.Paralelo_Talud, "Critico"] = False
    res.cuna["Paralelo_Talud"] = (res.cuna["Plano_1"].isin(ids) | res.cuna["Plano_2"].isin(ids)).to_numpy()
    c = res.cuna.Paralelo_Talud
    res.cuna.loc[c, ["Zona_Primaria", "Zona_Secundaria", "Critico"]] = False
    res.cuna.loc[c, ["Modo", "Plano_Deslizamiento"]] = ""
    res.cuna.loc[c, "Clasificacion"] = MOTIVO
    return res


def resumen_exclusion(res):
    """Texto corto para el resumen: cuántos planos e intersecciones se excluyeron."""
    if "Paralelo_Talud" not in res.planar:
        return ""
    n_p, n_i = int(res.planar.Paralelo_Talud.sum()), int(res.cuna.Paralelo_Talud.sum())
    if not n_p:
        return "Sin planos paralelos al talud"
    return f"{n_p} plano(s) igual(es) al talud excluido(s) de planar y cuña ({n_i:,} intersecciones)"
