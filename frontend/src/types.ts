export interface User {
  usuario_id: number;
  usuario: string;
  email: string;
  nombre_completo?: string | null;
  rol_id: number;
  rol_nombre: string;
  protegido: boolean;
  estado: string;
  ultimo_acceso?: string | null;
  fecha_registro: string;
}

export interface Role {
  rol_id: number;
  nombre: string;
  descripcion?: string | null;
  estado: string;
}

export interface LogEntry {
  log_id: number;
  usuario_id?: number | null;
  usuario: string;
  accion: string;
  detalle?: string | null;
  direccion_ip?: string | null;
  user_agent?: string | null;
  fecha_hora: string;
}

export interface LogsKPIs {
  accesos_hoy: number;
  accesos_7d: number;
  usuarios_unicos_7d: number;
  logins_fallidos_7d: number;
  analisis_7d: number;
  descargas_7d: number;
}

export interface LogsResponse {
  kpis: LogsKPIs;
  items: LogEntry[];
}

export interface DiscontinuidadRow {
  ID?: string | null;
  Buz: number | string;
  DirBuz: number | string;
  Tipo?: string | null;
  Persistencia?: number | string | null;
}

export interface DescartadaRow {
  ID?: string | null;
  Buz?: number | string | null;
  DirBuz?: number | string | null;
  Motivo: string;
}

export interface ParseArchivoResponse {
  filename: string;
  rows: DiscontinuidadRow[];
  descartadas: DescartadaRow[];
  tipos_conteo: Record<string, number>;
}

export type VistaKey = 'general' | 'planar' | 'cuna' | 'flexural' | 'directo' | 'roseta';

export interface TaludParams {
  nombre: string;
  buz: number;
  dirbuz: number;
}

export interface DipsParams {
  phi: number;
  ll_planar: number;
  ll_flexural: number;
  ll_directo: number;
  ponderacion: 'ninguna' | 'terzaghi';
  azimut_muestreo: number;
  inclinacion_muestreo: number;
}

export interface FiltroParams {
  tipos: string[] | null;
  persistencia_min: number;
}

export interface OpcionesPlot {
  proyeccion: 'equiarea' | 'equiangulo';
  hemisferio: 'inferior' | 'superior';
  etiquetas: 'grados' | 'cardinales' | 'ambos' | 'ninguna';
  paso_etiquetas: number;
  marcas_exteriores: boolean;
  circulo_perimetral: boolean;
  cruz_central: boolean;
  ejes_cruzados: boolean;
  espaciado_marcas: number;
  ancho_borde: number;
  ancho_interno: number;
  ancho_superposicion: number;
  escala_leyenda: number;
  ubicacion_leyenda: 'derecha' | 'izquierda' | 'abajo' | 'ninguna';
  etiqueta_filtro: boolean;
  red: 'ecuatorial' | 'polar' | 'ninguna';
  intervalo_red: number;
  color_red: string;
  mostrar: ('polos' | 'planos' | 'intersecciones')[] | null;
  filtro_planos: 'criticos' | 'todos';
  filtro_intersecciones: 'criticos' | 'todos';
  etiquetas_polos: 'criticos' | 'todos' | 'ninguno';
  etiquetas_intersecciones: 'criticos' | 'todos' | 'ninguno';
  simbolo_por_tipo: boolean;
  tamano_por_persistencia: boolean;
  tamano_simbolo: number;
  tamano_polo: number;
  contornos_general: boolean;
  contornos_en_mecanismos: boolean;
  mapa_color: string;
  mapa_color_mecanismos: 'Blues' | 'Greens' | 'Purples' | 'Greys';
  titulo: boolean;
  caja_info: boolean;
  mostrar_proyeccion: boolean;
  tamano_figura: number;
  tamano_fuente: number;
  resolucion: number;
  dpi_pantalla: number;
  dpi_exportar: number;
}

export const DEFAULT_OPCIONES_PLOT: OpcionesPlot = {
  proyeccion: 'equiarea',
  hemisferio: 'inferior',
  etiquetas: 'grados',
  paso_etiquetas: 30,
  marcas_exteriores: true,
  circulo_perimetral: true,
  cruz_central: true,
  ejes_cruzados: false,
  espaciado_marcas: 10,
  ancho_borde: 3,
  ancho_interno: 1,
  ancho_superposicion: 1,
  escala_leyenda: 100,
  ubicacion_leyenda: 'derecha',
  etiqueta_filtro: true,
  red: 'ecuatorial',
  intervalo_red: 10,
  color_red: '#d4d4d4',
  mostrar: null,
  filtro_planos: 'criticos',
  filtro_intersecciones: 'criticos',
  etiquetas_polos: 'criticos',
  etiquetas_intersecciones: 'ninguno',
  simbolo_por_tipo: true,
  tamano_por_persistencia: true,
  tamano_simbolo: 30,
  tamano_polo: 10,
  contornos_general: true,
  contornos_en_mecanismos: true,
  mapa_color: 'YlOrRd',
  mapa_color_mecanismos: 'Blues',
  titulo: true,
  caja_info: true,
  mostrar_proyeccion: true,
  tamano_figura: 6,
  tamano_fuente: 9,
  resolucion: 201,
  dpi_pantalla: 110,
  dpi_exportar: 300,
};

export interface VeredictoMecanismo {
  clave: 'planar' | 'cuna' | 'flexural' | 'directo' | 'oblicuo';
  nombre: string;
  porcentaje: number;
  criticos: number;
  total: number;
  elemento: string;
  posible: boolean;
  detalles: string[];
}

export interface AnalisisContexto {
  nombre: string;
  buz: number;
  dirbuz: number;
  phi: number;
  n_datos: number;
  n_intersecciones: number;
  filtro: string;
  exclusion_resumen: string;
}

export type TableRow = Record<string, string | number | boolean | null>;

export interface AnalisisResponse {
  analysis_id: string;
  contexto: AnalisisContexto;
  veredictos: VeredictoMecanismo[];
  oblicuo?: VeredictoMecanismo;
  tablas: {
    resumen_porcentajes: TableRow[];
    criticos_por_tipo: TableRow[];
    criticos_por_persistencia: TableRow[];
    planar: TableRow[];
    cuna: TableRow[];
    cuna_total: number;
    flexural: TableRow[];
    directo_z12: TableRow[];
    directo_z12_total: number;
    directo_z3: TableRow[];
    directo_z3_total: number;
    directo_base: TableRow[];
    tipos_conteo: TableRow[];
    descartadas: DescartadaRow[];
  };
  figura_base64: string;
}
