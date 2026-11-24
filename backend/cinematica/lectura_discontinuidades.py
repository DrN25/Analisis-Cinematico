"""Lectura, control de calidad y filtro de las discontinuidades (Buz, DirBuz, Tipo, Persistencia)."""
import io
import re
import unicodedata

import numpy as np
import pandas as pd

COLUMNAS = ["ID", "Tipo", "Buz", "DirBuz", "Persistencia", "Clase_P"]

# Nombres de columna aceptados (sin tildes, mayúsculas, espacios ni símbolos)
ALIAS = {
    "ID": ["id", "n", "no", "nro", "num", "numero", "registro", "codigo", "cod", "estructura"],
    "Buz": ["buz", "dip", "buzamiento", "buzam", "b"],
    "DirBuz": ["dirbuz", "dipdir", "dipdirection", "dipdireccion", "direcciondebuzamiento",
               "direccionbuzamiento", "dirbuzamiento", "dd", "azimut", "azimuth", "az"],
    "Tipo": ["tipo", "type", "tipoestructura", "tipodeestructura", "clase", "jointtype"],
    "Persistencia": ["persistencia", "persistence", "pers", "longitud", "largo", "traza", "tracelength"],
}

# Clases de persistencia (ISRM 1978)
CLASES_PERSISTENCIA = [(0, 1, "Muy baja"), (1, 3, "Baja"), (3, 10, "Media"), (10, 20, "Alta"), (20, np.inf, "Muy alta")]


def normalizar_nombre(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def normalizar_columnas(df):
    """Renombra las columnas reconocidas a ID, Buz, DirBuz, Tipo, Persistencia y completa las que falten."""
    renombrar = {}
    for col in df.columns:
        n = normalizar_nombre(col)
        for interno, alias in ALIAS.items():
            if n in alias and interno not in renombrar.values():
                renombrar[col] = interno
                break
    df = df.rename(columns=renombrar)
    faltan = [c for c in ("Buz", "DirBuz") if c not in df.columns]
    if faltan:
        raise ValueError(f"Falta la columna {faltan}. Columnas leídas: {list(df.columns)}. "
                         f"Nombres aceptados: {ALIAS['Buz']} / {ALIAS['DirBuz']}")
    if "ID" not in df.columns:
        # Formato de etiqueta general P1, P2, ... (antes D001)
        df.insert(0, "ID", [f"P{i + 1}" for i in range(len(df))])
    if "Tipo" not in df.columns:
        df["Tipo"] = "Sin tipo"
    if "Persistencia" not in df.columns:
        df["Persistencia"] = np.nan
    return df


def _decodificar(crudo):
    """Texto de un CSV: UTF-8 (con o sin BOM) o ANSI de Windows (Excel en español)."""
    if isinstance(crudo, str):
        return crudo
    for codificacion in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return crudo.decode(codificacion)
        except UnicodeDecodeError:
            continue
    return crudo.decode("utf-8", errors="replace")


def _es_encabezado(valores):
    nombres = {normalizar_nombre(v) for v in valores}
    return bool(nombres & set(ALIAS["Buz"])) and bool(nombres & set(ALIAS["DirBuz"]))


def _con_encabezado(tabla):
    """Busca la fila de encabezados (Buz y DirBuz) en las primeras 30 filas de una tabla leída sin encabezado."""
    for i in range(min(30, len(tabla))):
        if _es_encabezado(tabla.iloc[i].tolist()):
            df = tabla.iloc[i + 1:].copy()
            df.columns = [str(c).strip() for c in tabla.iloc[i].tolist()]
            df = df.loc[:, [c not in ("", "nan", "None") for c in df.columns]]
            return df.dropna(how="all").reset_index(drop=True)
    return None


def leer_tabla(texto):
    """Lee una tabla pegada como texto (tabulaciones de Excel, ; , o espacios). Encuentra la fila de encabezados."""
    texto = _decodificar(texto).strip("\n")
    lineas = [l for l in texto.splitlines() if l.strip()]
    muestra = "\n".join(lineas[:30])
    sep = "\t" if "\t" in muestra else ";" if ";" in muestra else "," if "," in muestra else r"\s+"
    tabla = pd.read_csv(io.StringIO("\n".join(lineas)), sep=sep, engine="python", header=None, dtype=str,
                        skip_blank_lines=True, on_bad_lines="skip")
    df = _con_encabezado(tabla)
    if df is None:
        raise ValueError("No se encontró una fila con columnas de buzamiento y dirección de buzamiento "
                         f"(nombres aceptados: {ALIAS['Buz']} / {ALIAS['DirBuz']}). Primera fila leída: "
                         f"{[str(v) for v in tabla.iloc[0].tolist()] if len(tabla) else []}")
    return normalizar_columnas(df)


def leer_archivo(fuente, nombre=None, hoja=None):
    """Lee CSV, TXT o Excel (ruta, bytes o archivo abierto). En Excel usa la primera hoja que tenga encabezados."""
    nombre = str(nombre or getattr(fuente, "name", fuente)).lower()
    if isinstance(fuente, (bytes, bytearray)):
        fuente = io.BytesIO(fuente)
    if nombre.endswith((".xlsx", ".xlsm", ".xls")):
        hojas = pd.read_excel(fuente, sheet_name=hoja if hoja is not None else None, header=None, dtype=str)
        if not isinstance(hojas, dict):
            hojas = {hoja: hojas}
        for nombre_hoja, tabla in hojas.items():
            df = _con_encabezado(tabla)
            if df is not None:
                return normalizar_columnas(df)
        raise ValueError(f"Ninguna hoja ({list(hojas)}) tiene una fila con columnas de buzamiento y dirección de "
                         f"buzamiento. Nombres aceptados: {ALIAS['Buz']} / {ALIAS['DirBuz']}")
    crudo = fuente.read() if hasattr(fuente, "read") else open(fuente, "rb").read()
    return leer_tabla(crudo)


def clase_persistencia(p):
    p = pd.to_numeric(pd.Series(p), errors="coerce")
    clase = pd.Series("Sin dato", index=p.index, dtype=object)
    for lo, hi, nombre in CLASES_PERSISTENCIA:
        clase[(p >= lo) & (p < hi)] = nombre
    return clase.to_numpy()


def _numero(serie):
    return pd.to_numeric(serie.astype(str).str.replace(",", ".", regex=False).str.strip(), errors="coerce")


def validar_discontinuidades(df):
    """Control de calidad. Devuelve (datos válidos, filas descartadas con su motivo)."""
    d = normalizar_columnas(df.copy())
    d["ID"] = d["ID"].astype(str).str.strip()
    d["Tipo"] = d["Tipo"].fillna("Sin tipo").astype(str).str.strip().replace("", "Sin tipo")
    for c in ("Buz", "DirBuz", "Persistencia"):
        d[c] = _numero(d[c])
    d.loc[np.isclose(d.DirBuz, 360.0), "DirBuz"] = 0.0
    motivo = pd.Series("", index=d.index, dtype=object)
    motivo[d.Buz.isna() | d.DirBuz.isna()] = "Buz o DirBuz vacío / no numérico"
    motivo[(motivo == "") & ~d.Buz.between(0, 90)] = "Buz fuera de 0–90°"
    motivo[(motivo == "") & ~d.DirBuz.between(0, 360, inclusive="left")] = "DirBuz fuera de 0–360°"
    d["Clase_P"] = clase_persistencia(d.Persistencia)
    descartadas = d[motivo != ""].assign(Motivo=motivo[motivo != ""])
    datos = d[motivo == ""].reset_index(drop=True)
    return datos, descartadas


def filtrar(datos, tipos=None, persistencia_min=0.0):
    """Filtra por tipo y persistencia mínima. Devuelve (datos filtrados, texto del filtro, como en Dips)."""
    d = datos
    partes = []
    if tipos is not None and set(tipos) != set(datos.Tipo.unique()):
        d = d[d.Tipo.isin(tipos)]
        partes.append("Tipo: " + ", ".join(map(str, tipos)))
    if persistencia_min and persistencia_min > 0:
        d = d[d.Persistencia >= persistencia_min]
        partes.append(f"Persistencia ≥ {persistencia_min:g} m")
    texto = ("Filtro: " + " · ".join(partes)) if partes else "Sin filtro"
    return d.reset_index(drop=True), f"{texto} · N = {len(d)}"


def conteo_por_tipo(datos):
    return datos.Tipo.value_counts().to_dict()


def tabla_planos(planos, tipo="Ejemplo"):
    """Tabla mínima a partir de [(buz, dirbuz), ...] para ejemplos y pruebas."""
    return pd.DataFrame({"ID": [f"P{i + 1}" for i in range(len(planos))], "Tipo": tipo,
                         "Buz": [float(b) for b, _ in planos], "DirBuz": [float(d) for _, d in planos],
                         "Persistencia": np.nan, "Clase_P": "Sin dato"})


def base(df):
    """Columnas comunes de las tablas de resultados."""
    return df.reindex(columns=COLUMNAS).copy()
