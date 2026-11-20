# MANUAL DE USUARIO
## ANÁLISIS CINEMÁTICO DE TALUDES

---

## ÍNDICE DE CONTENIDOS

1. [Acceso al Sistema](#1-acceso-al-sistema)
2. [Estructura de la Pantalla](#2-estructura-de-la-pantalla)
3. [Carga de Datos Geológicos](#3-carga-de-datos-geológicos)
4. [Editor de Discontinuidades](#4-editor-de-discontinuidades)
5. [Panel Izquierdo: Configuración (Flujo de 5 Pasos)](#5-panel-izquierdo-configuración-flujo-de-5-pasos)
   - [5.1 1 · Datos de entrada](#51-1--datos-de-entrada)
   - [5.2 2 · Opciones del estereograma](#52-2--opciones-del-estereograma)
   - [5.3 3 · Geometría del talud](#53-3--geometría-del-talud)
   - [5.4 4 · Parámetros del análisis](#54-4--parámetros-del-análisis)
   - [5.5 5 · Criterio del resumen](#55-5--criterio-del-resumen)
6. [Ejecutar el Cálculo](#6-ejecutar-el-cálculo)
7. [Las 6 Vistas Gráficas](#7-las-6-vistas-gráficas)
   - [Vista 1: Estereograma General](#vista-1-estereograma-general)
   - [Vista 2: Rotura Planar](#vista-2-rotura-planar)
   - [Vista 3: Rotura en Cuña](#vista-3-rotura-en-cuña)
   - [Vista 4: Toppling Flexural](#vista-4-toppling-flexural)
   - [Vista 5: Toppling Directo](#vista-5-toppling-directo)
   - [Vista 6: Roseta de Rumbos](#vista-6-roseta-de-rumbos)
8. [Exportar Resultados](#8-exportar-resultados)
9. [Módulo de Administración (Solo Administradores)](#9-módulo-de-administración-solo-administradores)
   - [9.1 Logs de acceso](#91-logs-de-acceso)
   - [9.2 Usuarios](#92-usuarios)
10. [Cambio de Contraseña y Cierre de Sesión](#10-cambio-de-contraseña-y-cierre-de-sesión)
11. [Conexión a la Base de Datos (Referencia Técnica)](#11-conexión-a-la-base-de-datos-referencia-técnica)

---

## 1. ACCESO AL SISTEMA

Al abrir la dirección web del sistema aparece el cuadro de inicio de sesión con el logo **Cinemático Slope**.

> **Instrucción para Captura [FIG-01]:**
> Captura del cuadro de inicio de sesión.
> - Recuadro rojo **(1)** sobre el campo `Usuario o correo electrónico`.
> - Recuadro rojo **(2)** sobre el campo `Contraseña` y el ícono de ojo a su derecha.
> - Recuadro rojo **(3)** sobre el botón `→ Iniciar sesión`.

### Cómo iniciar sesión

1. **`Usuario o correo electrónico`:** Escriba el nombre de usuario o correo que le asignaron (por ejemplo: `ADMIN` o `GEOLOGO1`).
2. **`Contraseña`:** Escriba su clave. Si hace clic en el ícono de ojo a la derecha, el texto se hace visible para verificar que no haya errores.
3. Presione **`→ Iniciar sesión`**.

Si los datos son correctos, el sistema carga la pantalla principal. Si hay un error, aparece un aviso en rojo bajo el botón.

---

## 2. ESTRUCTURA DE LA PANTALLA

La pantalla principal tiene cuatro zonas fijas.

> **Instrucción para Captura [FIG-02]:**
> Captura completa de la pantalla principal con datos cargados.
> - Recuadro rojo **(1)** sobre la barra de herramientas superior (donde están `Subir archivo`, `Calcular`, `Excel`, `PNG`, etc.).
> - Recuadro rojo **(2)** sobre el panel izquierdo (`Opciones de Análisis`).
> - Recuadro rojo **(3)** sobre el área central (el estereograma y las pestañas de vistas).
> - Recuadro rojo **(4)** sobre el panel derecho (`Inspector de Mecanismos`).

### Las cuatro zonas

**Zona 1 — Barra superior:**
- Barra de menú: `Archivo`, `Editar`, `Análisis`, `Ver`, `Herramientas` (solo admin) y `Ayuda`.
- Barra de herramientas: logotipo, título `ANÁLISIS CINEMÁTICO`, botones `Subir archivo`, `Tabla de datos (N)`, `▶ Calcular`, botón `Limpiar` (restablece los datos y resultados al estado inicial vacío), herramientas de zoom, botones de exportación (`Excel`, `PNG`, `ZIP`, `Cuña`), controles de panel, botón `Admin` (solo admin) y botón `Cerrar sesión`.

**Zona 2 — Panel izquierdo (`Opciones de Análisis`):**
Cinco grupos desplegables organizados en un flujo de trabajo guiado de cinco pasos: `1 · Datos de entrada`, `2 · Opciones del estereograma`, `3 · Geometría del talud`, `4 · Parámetros del análisis` y `5 · Criterio del resumen`. Cada grupo se abre o cierra tocando su encabezado.

**Zona 3 — Área central:**
Muestra la proyección estereográfica. En la parte superior se ubican la barra con el recuento de mecanismos detectados y las 6 pestañas para alternar de gráfico. Debajo se despliega el lienzo estereográfico y al pie la barra de estado.

**Zona 4 — Panel derecho (`Inspector de Mecanismos`):**
Muestra las 4 tarjetas de veredicto cinemático (`Rotura planar`, `Rotura en cuña`, `Toppling flexural`, `Toppling directo`) y las tablas de resultados de la vista seleccionada.

---

## 3. CARGA DE DATOS GEOLÓGICOS

El sistema trabaja con datos de discontinuidades del macizo rocoso: diaclasas, fallas, foliaciones, estratificación, etc.

> **Instrucción para Captura [FIG-03]:**
> Captura del grupo `1 · Datos de entrada` del panel izquierdo, expandido.
> - Recuadro rojo **(1)** sobre la tarjeta de archivo cargado / botón `Subir archivo`.
> - Recuadro rojo **(2)** sobre los botones `Usar ejemplo` y `Limpiar datos`.
> - Recuadro rojo **(3)** sobre los botones de tipos a analizar (ej. `JN (3)`).
> - Recuadro rojo **(4)** sobre el campo `Persistencia mínima (m)`.

### Formatos de archivo admitidos

- **Excel:** `.xlsx`, `.xlsm`, `.xls`
- **Texto/tabla:** `.csv` o `.txt` separados por coma, punto y coma o tabulación

### Columnas que el sistema reconoce

- **Dip:** Buzamiento de la estructura (0° a 90°).
- **DipDir:** Dirección de buzamiento (0° a 360°).
- **Tipo de estructura** *(opcional):* Clasificación del elemento (Diaclasa, Falla, Foliación, etc.).
- **Persistencia / Continuidad** *(opcional):* Longitud de la traza en metros.

### Opciones de carga

1. **`Subir archivo`:** Abre el explorador de archivos del equipo. Al terminar de leer el archivo, aparece una tarjeta verde indicando el nombre del archivo, número de filas procesadas y columnas reconocidas.
2. **`Usar ejemplo`:** Carga un conjunto de prueba de discontinuidades sin necesidad de un archivo propio.
3. **`Limpiar datos`:** Botón con ícono de papelera que vacía la tabla y reinicia el área de trabajo y estereograma al estado inicial limpio.
4. **`Ver / editar tabla`:** Abre directamente el Editor de discontinuidades para revisar o modificar los registros.
5. **Botones de tipos a analizar:** Muestra las etiquetas de cada tipo detectado con su recuento (ej. `JN (3)`). Al hacer clic en una etiqueta se tacha y se excluye del análisis.
6. **`Persistencia mínima (m)`:** Permite ingresar un valor mínimo en metros (con botones `-` y `+` o escritura directa) para excluir discontinuidades de menor persistencia.

---

## 4. EDITOR DE DISCONTINUIDADES

Al hacer clic en **`Tabla de datos (N)`** de la barra superior se abre el **Editor de discontinuidades**. Desde aquí puede revisar, corregir o añadir filas manualmente antes de calcular.

> **Instrucción para Captura [FIG-04]:**
> Abrir el Editor haciendo clic en `Tabla de datos (36)`.
> - Recuadro rojo **(1)** sobre la fila de encabezados: `#`, `Celda`, `Dip (0–90°)`, `DipDir (0–360°)`, `Tipo de estructura`, `Persistencia / Continuidad (m)`.
> - Recuadro rojo **(2)** sobre la pestaña `Descartadas (0)` en la parte superior del modal.
> - Recuadro rojo **(3)** sobre el botón `+ Añadir fila` (esquina inferior izquierda).
> - Recuadro rojo **(4)** sobre el botón `Aplicar y ejecutar análisis` (esquina inferior derecha).

### Columnas de la tabla

| Columna | Qué contiene |
| :--- | :--- |
| `#` | Número de fila (1, 2, 3…). No editable. |
| `Celda` | Código de celda de muestreo (ej. `J1-01`). |
| `Dip (0–90°)` | Buzamiento de esa discontinuidad. |
| `DipDir (0–360°)` | Dirección de buzamiento. |
| `Tipo de estructura` | Clasificación (Diaclasa, Falla, Foliación, etc.). |
| `Persistencia / Continuidad (m)` | Longitud de la traza en metros. |
| *(ícono de papelera)* | Elimina esa fila de la tabla. |

### Pestaña `Descartadas`

Si el archivo subido tenía filas con texto donde debía haber números, o valores fuera de rango (buzamiento mayor a 90°, dirección mayor a 360°), el sistema las separa aquí. La pestaña muestra: `Celda`, `Dip`, `DipDir` y el motivo del descarte. Si no hubo errores, dice: *"Todas las filas pasaron el control de calidad sin observaciones."*

### Botones inferiores

- **`+ Añadir fila`:** Agrega una fila vacía al final para ingresar una discontinuidad manualmente.
- **`Cerrar`:** Cierra la ventana sin guardar los cambios realizados en esta sesión de edición.
- **`Aplicar y ejecutar análisis`:** Guarda todos los cambios y ejecuta el cálculo cinemático con los datos actualizados.

---

## 5. PANEL IZQUIERDO: CONFIGURACIÓN (FLUJO DE 5 PASOS)

El panel izquierdo organiza los parámetros en un flujo de trabajo guiado de cinco pasos numerados correlativamente. Cada paso se puede expandir o colapsar haciendo clic en su cabecera.

---

### 5.1 1 · DATOS DE ENTRADA

Muestra el estado del archivo cargado, accesos directos de carga, limpieza y edición, y los filtros de tipo de estructura y persistencia mínima:

- **Tarjeta de archivo cargado:** Muestra el nombre del archivo activo, peso y un botón para desvincularlo. Si la carga fue correcta, una tarjeta verde detalla el nombre, la cantidad de filas y las columnas reconocidas.
- **`Subir archivo`:** Abre el explorador del sistema para cargar un archivo CSV o Excel.
- **`Usar ejemplo`:** Carga instantáneamente un conjunto de datos geológicos de prueba.
- **`Limpiar datos`:** Botón con ícono de papelera que vacía la tabla y reinicia el estereograma a un área de trabajo limpia.
- **`Ver / editar tabla`:** Acceso directo para abrir el Editor de discontinuidades.
- **Tipos a analizar:** Etiquetas interactivas con el recuento de cada tipo geológico (ej. `JN (3)`). Al hacer clic sobre una de ellas se excluye o reincorpora del análisis.
- **`Persistencia mínima (m)`:** Filtro numérico (con botones `-` y `+` o entrada manual) para omitir discontinuidades cuya traza sea inferior a la longitud indicada.

---

### 5.2 2 · OPCIONES DEL ESTEREOGRAMA

Ajustes visuales de representación en la proyección estereográfica. Solo cambian el dibujo; no recalculan los modelos cinemáticos:

> **Instrucción para Captura [FIG-05b]:**
> Expandir el grupo `2 · Opciones del estereograma` del panel izquierdo.
> - Recuadro rojo **(1)** sobre el control deslizante `Tamaño de los polos`.
> - Recuadro rojo **(2)** sobre los selectores `Proyección`, `Hemisferio` y `Red`.
> - Recuadro rojo **(3)** sobre el selector `Color de los contornos` y las casillas `Contornos de densidad`, `Tamaño por persistencia` y `Etiquetas de los polos (ID)`.
> - Recuadro rojo **(4)** sobre las opciones avanzadas de `Elementos proyectados` y decoraciones perimetrales.

- **`Tamaño de los polos`:** Control deslizante (1 a 20 px) para regular el diámetro de los puntos proyectados.
- **`Proyección`:**
  - `Equiárea (Schmidt)`: Estándar para análisis estadístico de orientaciones y densidad de polos; conserva la relación de áreas.
  - `Equiángulo (Wulff)`: Conserva los ángulos verdaderos; los planos geológicos se representan como arcos circulares continuos.
- **`Hemisferio`:**
  - `Inferior`: Estándar universal en geología estructural y geotecnia; proyecta discontinuidades orientadas hacia abajo.
  - `Superior`: Proyección hemisférica superior.
- **`Red`:** Tipo de cuadrícula de referencia (`Ecuatorial`, `Polar` o `Ninguna`).
- **`Espaciado marcas`:** Frecuencia angular de la cuadrícula (`5°`, `10°`, `15°`).
- **`Color de los contornos`:** Paleta cromática para el mapa de calor de densidad (`Azules`, `Dips / Jet`, `Esmeralda`, `Magma`, `Viridis`).
- **`Contornos de densidad`:** Activa o desactiva las curvas de concentración de polos de Fisher.
- **`Tamaño por persistencia`:** Escala dinámicamente el diámetro de cada polo según la longitud de su traza en metros.
- **`Etiquetas de los polos (ID)`:** Muestra el código identificador de la discontinuidad junto a su polo proyectado.
- **`Elementos proyectados`:** Casilla de modo automático según mecanismo, o selección manual de casillas individuales (`polos`, `planos`, `intersecciones`).
- **`Decoraciones del círculo`:**
  - `Marcas exteriores`: Marcas de graduación en el perímetro exterior (N, S, E, W y divisiones angulares).
  - `Cruz central`: Marca en el centro geométrico de la proyección.
  - `Ejes N-S / E-W`: Líneas ortogonales que atraviesan los cuadrantes.
  - `Círculo borde`: Círculo de referencia que encierra la proyección estereográfica.

---

### 5.3 3 · GEOMETRÍA DEL TALUD

Parámetros geométricos de la cara de banco o ladera analizada:

- **`Nombre`:** Denominación o código del talud para reportes (ej. `Talud 1`).
- **`Buzamiento ψs (°)`:** Inclinación de la cara del talud respecto al plano horizontal (1° a 90°). Incluye controles de incremento y decremento rápido (`-` y `+`).
- **`Dir. de buzamiento αs (°)`:** Azimut hacia donde mira o buza la cara del talud (0° a 360°).

---

### 5.4 4 · PARÁMETROS DEL ANÁLISIS

Variables geomecánicas y envolventes cinemáticas de rotura:

> **Instrucción para Captura [FIG-05]:**
> Captura del panel izquierdo con los pasos `3 · Geometría del talud` y `4 · Parámetros del análisis` desplegados.
> - Recuadro rojo **(1)** sobre los campos `Buzamiento ψs (°)` y `Dir. de buzamiento αs (°)`.
> - Recuadro rojo **(2)** sobre el campo `Ángulo de fricción φ (°)`.
> - Recuadro rojo **(3)** sobre los tres campos de límites laterales (`LL planar ±°`, `LL flexural ±°`, `LL directo ±°`).
> - Recuadro rojo **(4)** sobre el botón azul `Ejecutar análisis`.

- **`Ángulo de fricción φ (°)`:** Ángulo de fricción básica de las discontinuidades (0° a 89°). Los planos con buzamiento superior a este valor se ubican dentro de la envolvente de deslizamiento.
- **Límites laterales (LL):** Rango de desviación angular admisible respecto a la orientación de la cara del talud:
  - **`LL planar ±°`:** Límite lateral para rotura planar (valor típico: 20°).
  - **`LL flexural ±°`:** Límite lateral para toppling flexural (valor típico: 20° a 30°).
  - **`LL directo ±°`:** Límite lateral para toppling directo (valor típico: 20°).
- **`Ponderación`:** Corrección estadística de sesgo de muestreo (Terzaghi), solicitando `Azimut línea (°)` e `Inclinación (°)`.
- **Botón `Ejecutar análisis`:** Botón destacado en color azul marino ubicado al final de este paso, que ejecuta de inmediato el cálculo cinemático y actualiza los gráficos y veredictos.

---

### 5.5 5 · CRITERIO DEL RESUMEN

- **`Porcentaje crítico de discontinuidades (%)` [Umbral]:** Control deslizante de 0% a 50% (valor predeterminado: **10.00%**, según el criterio estándar de Rocscience Dips). Define el porcentaje mínimo de polos o intersecciones en zona crítica necesario para declarar un mecanismo cinemáticamente admisible (**SÍ**) en las tarjetas del Inspector de Mecanismos y en las exportaciones ejecutivas.

---

## 6. EJECUTAR EL CÁLCULO

El cálculo se puede lanzar de dos formas equivalentes:
1. Desde el botón **`▶ Calcular`** de la barra de herramientas superior.
2. Desde el botón azul **`Ejecutar análisis`** ubicado al final del paso **`4 · Parámetros del análisis`** en el panel izquierdo.

> **Instrucción para Captura [FIG-06]:**
> Captura de la parte izquierda de la barra de herramientas.
> - Recuadro rojo destacado sobre el botón **`▶ Calcular`**.

Al hacer clic en **`▶ Calcular`**, el sistema toma los datos cargados junto con todos los parámetros del panel izquierdo y ejecuta el análisis cinemático. Durante el proceso, el botón muestra brevemente *"Calculando…"*. Al terminar, el estereograma central y todas las tablas del panel derecho se actualizan con los nuevos resultados.

El cálculo también se ejecuta automáticamente al presionar **`Aplicar y ejecutar análisis`** desde el Editor de discontinuidades.

---

## 7. LAS 6 VISTAS GRÁFICAS

En la parte superior del área gráfica se ubica la fila de pestañas de navegación. Al hacer clic en cualquiera de ellas, el estereograma se actualiza y la tabla del panel derecho muestra la información técnica correspondiente a esa vista.

> **Instrucción para Captura [FIG-07]:**
> Captura de la parte superior del área central.
> - Recuadro rojo **(1)** sobre las 6 pestañas de vistas: `Estereograma General`, `Rotura Planar`, `Rotura en Cuña`, `Toppling Flexural`, `Toppling Directo`, `Roseta de Rumbos`.
> - Recuadro rojo **(2)** sobre la barra informativa superior que indica los mecanismos activos y el umbral.

---

### VISTA 1: ESTEREOGRAMA GENERAL

**Qué muestra el gráfico:**
Todos los datos al mismo tiempo. Los puntos son los polos de cada discontinuidad. Los arcos son sus planos proyectados. Sobre ellos se superpone el mapa de densidad de Fisher: una nube de colores (azul = poca concentración, verde, amarillo, rojo = máxima concentración) que muestra dónde se agrupan más las discontinuidades. Los ejes N, S, E, W están marcados en el borde.

**Qué muestra el panel derecho:**
Tres sub-pestañas con tablas:

1. **`Porcentajes Dips`:** Tabla con columnas `Mecanismo`, `Críticos`, `Total`, `% Crítico`, `Veredicto SÍ/NO`. Resume el resultado final de los cuatro mecanismos.
2. **`Por tipo`:** Conteo de discontinuidades críticas desglosado por tipo de estructura (Diaclasa, Falla, Foliación, etc.).
3. **`Por persistencia`:** Conteo de discontinuidades críticas agrupado por rango de longitud.

Cada tabla tiene un botón **`CSV`** en su esquina superior derecha para descargarla.

> **Instrucción para Captura [FIG-08]:**
> Vista `Estereograma General` seleccionada.
> - Recuadro rojo **(1)** sobre las 4 tarjetas de mecanismos en la parte superior del panel derecho.
> - Recuadro rojo **(2)** sobre las tres sub-pestañas (`Porcentajes Dips`, `Por tipo`, `Por persistencia`).
> - Recuadro rojo **(3)** sobre el botón `CSV` a la derecha de la tabla.

---

### VISTA 2: ROTURA PLANAR

**Qué muestra el gráfico:**
Aparece una zona en rojo con forma de media luna o cresciente. Esa zona queda delimitada por el arco del plano del talud en la parte exterior, el círculo de fricción en la parte interior y dos líneas rectas que representan los límites laterales `LL Planar`. Cualquier polo que caiga dentro de esa zona roja corresponde a una discontinuidad que tiene la inclinación suficiente para deslizar, que aflora en la cara del talud y cuya orientación es casi paralela a la pared.

**Qué muestra el panel derecho:**
Tabla **`Planos críticos planar (N)`** con las columnas `Tipo`, `Buz`, `DirBuz` y `Pers`. Lista cada discontinuidad individual que cumple la condición de rotura planar. Tiene botón **`CSV`**.

> **Instrucción para Captura [FIG-09]:**
> Vista `Rotura Planar` seleccionada.
> - Recuadro rojo **(1)** sobre la zona crítica roja en el estereograma.
> - Recuadro rojo **(2)** sobre la tabla `Planos críticos planar` en el panel derecho.
> - Recuadro rojo **(3)** sobre su botón `CSV`.

---

### VISTA 3: ROTURA EN CUÑA

**Qué muestra el gráfico:**
Muestra los puntos donde se cruzan pares de planos de discontinuidades (intersecciones). La zona crítica es un área acotada por el círculo de fricción abajo y los planos de los límites laterales a los costados. Los puntos de intersección que caen dentro de esa zona son las cuñas con potencial de deslizamiento.

**Qué muestra el panel derecho:**
Tabla **`Intersecciones críticas cuña (N)`** con las columnas `Plano A`, `Plano B`, `Plunge` (inmersión de la arista de cuña) y `Trend` (dirección de la arista). Esta tabla tiene dos botones de descarga:
- **`Excel`:** Descarga solo esta tabla en formato `.xlsx`.
- **`CSV`:** Descarga esta tabla en formato `.csv`.

> **Instrucción para Captura [FIG-10]:**
> Vista `Rotura en Cuña` seleccionada.
> - Recuadro rojo **(1)** sobre los botones `Excel` y `CSV` en la parte superior del panel derecho.
> - Recuadro rojo **(2)** sobre la tabla de intersecciones críticas.

---

### VISTA 4: TOPPLING FLEXURAL

**Qué muestra el gráfico:**
Muestra la zona de volcamiento flexural: un área delimitada por los límites laterales `LL Flex.` y el plano límite de deslizamiento en la parte opuesta al talud (zona anti-dip). Los polos que caen en esa zona corresponden a estratos o columnas de roca esbeltas que buzan en sentido contrario a la cara del talud y tienen la geometría necesaria para doblarse y volcarse hacia adelante.

**Qué muestra el panel derecho:**
Tabla **`Planos críticos toppling flexural (N)`** con las columnas `Tipo`, `Buz`, `DirBuz` y `Pers`. Tiene botón **`CSV`**.

> **Instrucción para Captura [FIG-11]:**
> Vista `Toppling Flexural` seleccionada.
> - Recuadro rojo **(1)** sobre la zona crítica de volcamiento en el estereograma.
> - Recuadro rojo **(2)** sobre la tabla `Planos críticos toppling flexural` y su botón `CSV`.

---

### VISTA 5: TOPPLING DIRECTO

**Qué muestra el gráfico:**
Muestra las zonas de volcamiento directo (bloques que se vuelcan sobre planos basales). El estereograma proyecta las aristas de volcamiento en Zonas 1 y 2 (volcamiento directo) y Zona 3 (volcamiento oblicuo), además de los planos basales que actúan como superficie de despegue.

**Qué muestra el panel derecho:**
Tres sub-tablas seleccionables:
- **`Zonas 1+2 (N)`:** Intersecciones en condición directa de volcamiento.
- **`Zona 3 (N)`:** Intersecciones en condición oblicua.
- **`Planos base (N)`:** Discontinuidades que actúan como superficie basal.

Cada una tiene su botón **`CSV`**.

> **Instrucción para Captura [FIG-12]:**
> Vista `Toppling Directo` seleccionada.
> - Recuadro rojo **(1)** sobre los tres selectores de sub-tabla (`Zonas 1+2`, `Zona 3`, `Planos base`).
> - Recuadro rojo **(2)** sobre la tabla desplegada y su botón `CSV`.

---

### VISTA 6: ROSETA DE RUMBOS

**Qué muestra el gráfico:**
Un diagrama circular de pétalos. Cada pétalo apunta en una dirección de la brújula y su tamaño indica cuántas discontinuidades tienen esa orientación. Las familias principales aparecen como pétalos más largos. Esta vista no usa la proyección estereográfica: es un gráfico de frecuencias radiales agrupadas por rangos de dirección.

**Qué muestra el panel derecho:**
Tabla **`Discontinuidades por tipo (N)`** con el recuento de cada categoría de estructura. Tiene botón **`CSV`**.

> **Instrucción para Captura [FIG-13]:**
> Vista `Roseta de Rumbos` seleccionada.
> - Recuadro rojo **(1)** sobre el gráfico de roseta en el área central.
> - Recuadro rojo **(2)** sobre la tabla `Discontinuidades por tipo` y su botón `CSV`.

---

## 8. EXPORTAR RESULTADOS

La barra de herramientas tiene cuatro botones de exportación. Producen archivos distintos.

> **Instrucción para Captura [FIG-14]:**
> Captura de la barra de herramientas superior.
> - Recuadro rojo agrupando los cuatro botones: `Excel`, `PNG`, `ZIP` y `Cuña`.

| Botón | Archivo generado | Contenido |
| :--- | :--- | :--- |
| **`Excel`** | `analisis_cinematico.xlsx` | Libro completo: portada con parámetros del talud, hoja de resumen con porcentajes y veredictos de los 4 mecanismos, hoja de discontinuidades cargadas, hojas de cuñas e intersecciones críticas. |
| **`PNG`** | `estereograma_[vista].png` | Imagen del gráfico que esté visible en pantalla en ese momento. Si está en Rotura Planar, descarga esa vista. Si está en Roseta, descarga la roseta. |
| **`ZIP`** | `resultados_cinematico.zip` | Paquete con las 6 imágenes PNG (una por cada vista) más el libro Excel completo. |
| **`Cuña`** | `cuna_criticas.xlsx` | Solo las intersecciones críticas de cuña: Plunge, Trend y los planos que las forman. |

Además, cada tabla individual del panel derecho tiene su propio botón **`CSV`** para descargar solo esa tabla.

---

## 9. MÓDULO DE ADMINISTRACIÓN (SOLO ADMINISTRADORES)

Los usuarios con rol `Admin` ven el botón **`Admin`** en la barra superior (también accesible desde `Herramientas → Administración y logs…`). Al pulsarlo se abre la ventana de administración.

> **Instrucción para Captura [FIG-15]:**
> Captura del encabezado de la ventana de administración.
> - Recuadro rojo **(1)** sobre el título `Administración y Auditoría` con el ícono de escudo.
> - Recuadro rojo **(2)** sobre las dos pestañas: `Logs de acceso` y `Usuarios (N)`.

---

### 9.1 LOGS DE ACCESO

Registra cada evento ocurrido en el sistema para control de seguridad y auditoría.

> **Instrucción para Captura [FIG-16]:**
> Pestaña `Logs de acceso` abierta.
> - Recuadro rojo **(1)** sobre las 4 tarjetas de indicadores en la parte superior.
> - Recuadro rojo **(2)** sobre la barra de filtros (`Usuario`, `Acción`, `Desde`, `Hasta` y botón `Filtrar`).
> - Recuadro rojo **(3)** sobre el botón `Exportar CSV`.
> - Recuadro rojo **(4)** sobre la tabla con columnas `Fecha y hora`, `Usuario`, `Acción`, `Detalle`, `IP`, `Navegador`.

#### Tarjetas de indicadores (KPIs)

Hay cuatro tarjetas en la parte superior de la pestaña:

**`Accesos hoy`**
Número total de intentos de inicio de sesión (exitosos y fallidos) desde medianoche del día actual. Si el número es 0 y hay usuarios conectados, indica que la sesión comenzó antes de medianoche.

**`Accesos (últimos 7 días)`**
Total de intentos de inicio de sesión en los últimos 7 días. El número en rojo entre paréntesis (ej. `3 fallidos`) indica cuántos de esos intentos fallaron por contraseña incorrecta o cuenta inactiva.

**`Cuentas únicas (7 días)`**
Cuántas cuentas distintas iniciaron sesión en los últimos 7 días. Si `GEOLOGO1` inició sesión 10 veces, cuenta como 1. Útil para saber cuántos usuarios del sistema están activos.

**`Análisis / Descargas (7d)`**
El número de la izquierda es cuántas veces se pulsó `▶ Calcular` en los últimos 7 días. El número de la derecha (tras la `/`) es el total de archivos exportados (Excel, PNG, ZIP o CSV) en ese mismo periodo.

#### Filtros

- **`Usuario`:** Escriba el nombre de cuenta para ver solo sus eventos (ej. `GEOLOGO1`).
- **`Acción`:** Menú desplegable para filtrar por tipo de evento: `LOGIN_OK`, `LOGIN_FAIL`, `ANALISIS`, `EXPORT_EXCEL`, `EXPORT_PNG`, `EXPORT_ZIP`, `EXPORT_CSV`, `USER_CREATE`, `USER_UPDATE`, `USER_STATUS`, `PASSWORD_CHANGE`, `LOGOUT`.
- **`Desde` / `Hasta`:** Rango de fechas para la auditoría.
- **`Filtrar`:** Aplica los criterios seleccionados y actualiza la tabla.

#### Exportar logs

**`Exportar CSV`** descarga el archivo `cinematico_logs.csv` con todos los eventos filtrados actualmente. Útil para guardar un respaldo de auditoría o analizar el historial en Excel.

#### Tabla de eventos

Columnas: `Fecha y hora`, `Usuario`, `Acción`, `Detalle`, `IP`, `Navegador`. Cada fila es un evento con la fecha exacta, la cuenta que lo realizó, el tipo de acción, la IP desde donde se conectó y el navegador web usado.

---

### 9.2 USUARIOS

Gestión de cuentas de acceso: crear, editar, desactivar o reactivar usuarios.

> **Instrucción para Captura [FIG-17]:**
> Pestaña `Usuarios` abierta.
> - Recuadro rojo **(1)** sobre la tabla izquierda con columnas `Usuario`, `Nombre / Correo`, `Rol`, `Último acceso`, `Estado`, `Acciones`.
> - Recuadro rojo **(2)** sobre los botones de la columna `Acciones` (ícono de lápiz `Editar` e ícono de usuario para `Desactivar/Activar`).
> - Recuadro rojo **(3)** sobre el formulario derecho `Nuevo usuario` (o `Editar usuario`).
> - Recuadro rojo **(4)** sobre el botón `Crear cuenta` (o `Guardar cambios`).

#### Crear un nuevo usuario

En el panel derecho (`Nuevo usuario`) complete los campos:
- `Usuario`: Nombre de acceso (ej. `GEOLOGO4`).
- `Correo`: Correo institucional.
- `Nombre completo`: Nombre y apellido.
- `Rol`: `Usuario` (acceso a análisis, carga y descarga) o `Admin` (acceso total incluido este módulo).
- `Contraseña inicial`: La clave que el usuario usará la primera vez.

Presione **`Crear cuenta`**.

#### Editar un usuario existente

Haga clic en el ícono de lápiz (**`Editar`**) de la fila deseada. El panel derecho cambia a modo edición. Puede corregir el nombre, correo, rol o asignar una nueva contraseña (útil si el usuario la olvidó). Presione **`Guardar cambios`** o **`Cancelar`** para salir sin modificar.

#### Desactivar o activar una cuenta

Haga clic en el ícono de usuario de la columna `Acciones`. Si la cuenta estaba activa, pasa a **`Inactivo`** e impide el acceso inmediatamente. Si estaba inactiva, se reactiva. El historial de logs de ese usuario no se borra.

---

## 10. CAMBIO DE CONTRASEÑA Y CIERRE DE SESIÓN

En la esquina superior derecha de la barra de herramientas hay dos botones personales.

> **Instrucción para Captura [FIG-18]:**
> Captura de la esquina superior derecha de la barra.
> - Recuadro rojo **(1)** sobre el ícono de llave (`Cambiar contraseña`).
> - Recuadro rojo **(2)** sobre el botón `Cerrar sesión`.
> - Recuadro rojo **(3)** sobre el modal con los campos `Contraseña actual`, `Nueva contraseña`, `Confirmar nueva contraseña` y el botón `Actualizar`.

### Cambiar la contraseña

1. Haga clic en el ícono de llave en la barra superior.
2. Ingrese su `Contraseña actual`.
3. Ingrese su `Nueva contraseña` y repítala en `Confirmar nueva contraseña`.
4. Haga clic en **`Actualizar`**.

### Cerrar sesión

Haga clic en **`Cerrar sesión`**. El sistema cierra la sesión de inmediato y vuelve a la pantalla de inicio. Haga esto siempre al abandonar el equipo para evitar que otra persona use su cuenta.

---

*Sistema de Análisis Cinemático de Taludes — Versión 1.0 (2026)*

---

## 11. CONEXIÓN A LA BASE DE DATOS (REFERENCIA TÉCNICA)

Esta sección es para el administrador técnico o desarrollador que necesite verificar, cambiar o documentar cómo el sistema se conecta a la base de datos. No es necesaria para el uso diario del sistema.

---

### 11.1 ARCHIVO DE CONFIGURACIÓN: `.env`

**Archivo:** `backend/.env`

Este archivo contiene las credenciales y parámetros de conexión. El backend lo lee al arrancar. Nunca debe publicarse ni incluirse en repositorios compartidos.

> **Instrucción para Captura [FIG-19]:**
> Abrir el archivo `backend/.env` en un editor de texto (VS Code, Notepad++, etc.).
> - Recuadro rojo **(1)** sobre las líneas `DB_SERVER`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.
> - Recuadro rojo **(2)** sobre la línea `DB_DRIVER`.
> - Recuadro rojo **(3)** sobre la línea `SYSTEM_CODE`.

Las variables que controlan la conexión son:

| Variable | Valor de ejemplo | Qué define |
| :--- | :--- | :--- |
| `DB_SERVER` | `sql8012.site4now.net` | Servidor SQL Server al que se conecta. |
| `DB_NAME` | `db_ad0a4f_gema` | Nombre de la base de datos. |
| `DB_USER` | `db_ad0a4f_gema_admin` | Usuario de SQL Server. |
| `DB_PASSWORD` | `••••••••` | Contraseña del usuario de SQL Server. |
| `DB_DRIVER` | `SQL Server` | Driver ODBC instalado en el servidor. También acepta `ODBC Driver 17 for SQL Server` u `ODBC Driver 18 for SQL Server`. |
| `DB_TRUSTED` | `no` | Si se usa autenticación de Windows (`yes`) o usuario/contraseña (`no`). En producción siempre es `no`. |
| `SYSTEM_CODE` | `cinematico` | Código interno que identifica este sistema dentro de la tabla `auth.Sistemas`. |
| `JWT_SECRET_KEY` | *(clave larga)* | Clave secreta para firmar los tokens de sesión. Debe ser única y larga. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `720` | Tiempo en minutos antes de que la sesión expire (720 = 12 horas). |
| `PORT` | `8002` | Puerto TCP donde escucha el backend. |

> **Si se cambia el servidor o la base de datos**, edite `DB_SERVER`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`, y reinicie el backend.

---

### 11.2 LÓGICA DE CONEXIÓN: `app/database.py`

**Archivo:** `backend/app/database.py`

Este archivo construye la conexión real a la base de datos cada vez que arranca el backend.

> **Instrucción para Captura [FIG-20]:**
> Abrir `backend/app/database.py` en el editor.
> - Recuadro rojo **(1)** sobre la función `build_engine` (desde `def build_engine(...)` hasta el final de la función, aproximadamente líneas 21–66).
> - Recuadro rojo **(2)** dentro de esa función, sobre las líneas que leen `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` con `os.getenv(...)`.
> - Recuadro rojo **(3)** sobre la línea `engine = build_engine()` y `SessionLocal = sessionmaker(...)` (líneas 69–70), que crean la conexión global y la fábrica de sesiones.
> - Recuadro rojo **(4)** sobre la función `get_db()` (líneas 74–80), que es la que cada ruta del API usa para pedir y cerrar una sesión de base de datos.

**Qué hace `build_engine`:**

1. Lee `DATABASE_URL` del entorno. Si existe y empieza en `sqlite`, usa SQLite (modo de pruebas locales). Si es otra URL completa, la usa directamente.
2. Si no hay `DATABASE_URL`, lee las variables `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `DB_DRIVER` del `.env` y construye la cadena de conexión ODBC para SQL Server.
3. Prueba la conexión con `SELECT 1`. Si falla con un driver, intenta el siguiente.
4. Si todos los drivers fallan, crea una base de datos SQLite local temporal (`cinematico_dev.db`) para no detener el arranque.

**Qué hace `get_db`:**
Es la función que cada ruta del API llama para obtener una sesión de base de datos. Abre la sesión, la entrega, y la cierra automáticamente cuando la ruta termina (ya sea con éxito o con error).

---

### 11.3 CONFIGURACIÓN DEL SISTEMA: `app/config.py`

**Archivo:** `backend/app/config.py`

> **Instrucción para Captura [FIG-21]:**
> Abrir `backend/app/config.py` en el editor.
> - Recuadro rojo **(1)** sobre la línea `load_dotenv(BASE_DIR / ".env")` — aquí el backend carga el archivo `.env`.
> - Recuadro rojo **(2)** sobre la línea `SYSTEM_CODE = os.getenv("SYSTEM_CODE", "cinematico")` — el código que identifica este sistema en la BD.

Este archivo carga el `.env` usando `python-dotenv` y expone las variables de configuración al resto del backend. `SYSTEM_CODE` es el valor más importante: debe coincidir exactamente con el campo `Codigo` del registro de este sistema en la tabla `auth.Sistemas` de la base de datos.

---

### 11.4 TABLAS DE LA BASE DE DATOS

La base de datos es **`db_ad0a4f_gema`** en SQL Server (`sql8012.site4now.net`). Todas las tablas del sistema están en el esquema **`auth`**.

> **Instrucción para Captura [FIG-22]:**
> Abrir SQL Server Management Studio (SSMS) y conectarse a `sql8012.site4now.net` con el usuario administrador.
> - Expandir: `db_ad0a4f_gema` → `Tablas`.
> - Recuadro rojo **(1)** sobre las cuatro tablas del esquema `auth`: `auth.Sistemas`, `auth.Roles`, `auth.Usuarios`, `auth.LogsAcceso`.

El sistema usa cuatro tablas. A continuación se describe cada una:

---

#### Tabla `auth.Sistemas`

Registra los sistemas que comparten esta base de datos. Este sistema tiene `Codigo = 'cinematico'`.

> **Instrucción para Captura [FIG-23]:**
> En SSMS, hacer clic derecho sobre `auth.Sistemas` → `Select Top 1000 Rows`.
> - Recuadro rojo **(1)** sobre la fila donde `Codigo = 'cinematico'`, mostrando su `SistemaID`, `Nombre` y `Estado`.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `SistemaID` | `INT` (PK) | Identificador numérico del sistema. Este valor es el que aparece en todas las demás tablas para vincular registros. |
| `Codigo` | `VARCHAR(50)` | Código textual único del sistema. Para este sistema: `cinematico`. |
| `Nombre` | `VARCHAR(100)` | Nombre descriptivo del sistema. |
| `Estado` | `VARCHAR(1)` | `A` = Activo. `I` = Inactivo. |

---

#### Tabla `auth.Roles`

Define los roles de acceso para cada sistema.

> **Instrucción para Captura [FIG-24]:**
> En SSMS, hacer clic derecho sobre `auth.Roles` → `Select Top 1000 Rows`.
> - Recuadro rojo **(1)** sobre las filas donde `SistemaID` coincide con el ID del sistema `cinematico`, mostrando los roles `admin` y `usuario`.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `RolID` | `INT` (PK) | Identificador del rol. |
| `SistemaID` | `INT` (FK → Sistemas) | Vincula el rol a su sistema. |
| `Nombre` | `VARCHAR(50)` | Nombre del rol: `admin` o `usuario`. |
| `Descripcion` | `VARCHAR(200)` | Descripción opcional del rol. |
| `EsProtegido` | `BIT` | Si es `1`, el rol no puede eliminarse ni modificarse desde la interfaz. |
| `Estado` | `VARCHAR(1)` | `A` = Activo. |

---

#### Tabla `auth.Usuarios`

Almacena todas las cuentas de acceso al sistema.

> **Instrucción para Captura [FIG-25]:**
> En SSMS, hacer clic derecho sobre `auth.Usuarios` → `Select Top 1000 Rows`.
> - Recuadro rojo **(1)** sobre las columnas `UsuarioID`, `Usuario`, `Email`, `NombreCompleto`, `RolID`, `Estado` y `UltimoAcceso`.
> - Recuadro rojo **(2)** sobre la columna `ContrasenaHash` — señalar que el hash almacenado **no es la contraseña en texto plano**, sino su versión encriptada (bcrypt). Nunca es reversible.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `UsuarioID` | `INT` (PK) | Identificador único de la cuenta. |
| `SistemaID` | `INT` (FK → Sistemas) | Sistema al que pertenece la cuenta. |
| `Usuario` | `VARCHAR(50)` | Nombre de acceso (ej. `ADMIN`, `GEOLOGO1`). |
| `Email` | `VARCHAR(200)` | Correo electrónico de la cuenta. |
| `NombreCompleto` | `VARCHAR(150)` | Nombre y apellido del titular. |
| `ContrasenaHash` | `VARCHAR(255)` | Hash bcrypt de la contraseña. No es texto legible. |
| `RolID` | `INT` (FK → Roles) | Rol asignado (`admin` o `usuario`). |
| `Estado` | `VARCHAR(1)` | `A` = Activo (puede iniciar sesión). `I` = Inactivo (bloqueado). |
| `UltimoAcceso` | `DATETIME` | Fecha y hora del último login exitoso. |
| `VersionSeguridad` | `INT` | Número que se incrementa cuando se cambia la contraseña, invalidando sesiones anteriores. |
| `EsProtegido` | `BIT` | Si es `1`, la cuenta no puede desactivarse ni cambiar de rol desde la interfaz (ej. la cuenta ADMIN principal). |
| `FechaRegistro` | `DATETIME` | Cuándo se creó la cuenta. |

---

#### Tabla `auth.LogsAcceso`

Registra cada evento auditado: logins, análisis, exportaciones, cambios de usuario.

> **Instrucción para Captura [FIG-26]:**
> En SSMS, hacer clic derecho sobre `auth.LogsAcceso` → `Select Top 1000 Rows`.
> - Recuadro rojo **(1)** sobre las columnas `FechaHora`, `Usuario`, `Accion`, `Detalle`, `DireccionIP`, `UserAgent`.
> - Recuadro rojo **(2)** sobre varias filas de distintas acciones: una con `Accion = 'LOGIN_OK'`, otra con `Accion = 'ANALISIS'`, otra con `Accion = 'EXPORT_EXCEL'`, para mostrar la variedad de eventos registrados.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `LogID` | `INT` (PK) | Identificador del evento. |
| `SistemaID` | `INT` (FK → Sistemas) | Sistema que generó el evento. |
| `UsuarioID` | `INT` (FK → Usuarios, nullable) | ID de la cuenta involucrada. Puede ser `NULL` si el intento fue con un usuario inexistente. |
| `Usuario` | `VARCHAR(50)` | Nombre de usuario tal como se escribió al intentar el acceso. |
| `Accion` | `VARCHAR(50)` | Código del evento. Valores posibles: `LOGIN_OK`, `LOGIN_FAIL`, `LOGOUT`, `ANALISIS`, `EXPORT_EXCEL`, `EXPORT_PNG`, `EXPORT_ZIP`, `EXPORT_CSV`, `USER_CREATE`, `USER_UPDATE`, `USER_STATUS`, `PASSWORD_CHANGE`. |
| `Detalle` | `VARCHAR(500)` | Descripción adicional del evento (ej. nombre del talud analizado, nombre del archivo exportado). |
| `DireccionIP` | `VARCHAR(64)` | Dirección IP desde donde se realizó la acción. |
| `UserAgent` | `VARCHAR(255)` | Navegador web usado (ej. `Chrome`, `Edge`, `Firefox`). |
| `FechaHora` | `DATETIME` | Fecha y hora exacta del evento (UTC). |

---

### 11.5 CÓMO SE RELACIONAN LAS TABLAS

> **Instrucción para Captura [FIG-27]:**
> En SSMS, abrir el archivo `backend/app/models.py` en el editor de código.
> - Recuadro rojo **(1)** sobre la clase `class Sistema(Base)` — definición de `auth.Sistemas`.
> - Recuadro rojo **(2)** sobre la clase `class Role(Base)` — definición de `auth.Roles`, señalando `ForeignKey("auth.Sistemas.SistemaID")`.
> - Recuadro rojo **(3)** sobre la clase `class Usuario(Base)` — definición de `auth.Usuarios`, señalando `ForeignKeyConstraint` que apunta a `Roles`.
> - Recuadro rojo **(4)** sobre la clase `class LogAcceso(Base)` — definición de `auth.LogsAcceso`.

El flujo es:

1. `auth.Sistemas` define el sistema `cinematico` con su `SistemaID`.
2. `auth.Roles` define los roles (`admin`, `usuario`) vinculados a ese `SistemaID`.
3. `auth.Usuarios` almacena cada cuenta, vinculada al sistema y a un rol.
4. `auth.LogsAcceso` guarda cada evento, vinculado al sistema y opcionalmente a un usuario.

Todos los accesos desde el backend filtran por `SistemaID` para que los datos de este sistema no se mezclen con otros sistemas que compartan la misma base de datos.

---

*Sistema de Análisis Cinemático de Taludes — Versión 1.0 (2026)*
