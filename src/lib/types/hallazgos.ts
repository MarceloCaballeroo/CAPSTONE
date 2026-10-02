export const MODELO_PIE_VERSION = "foot-v1";

export type LadoPie = "izquierdo" | "derecho";

export type AtencionMarcable = {
  id: string;
  created_at: string;
  diagnostico_cie10: string;
};

export type HallazgoClinico = {
  id: string;
  atencion_id: string;
  lado_pie: LadoPie;
  coordenada_x: number;
  coordenada_y: number;
  coordenada_z: number;
  normal_x: number;
  normal_y: number;
  normal_z: number;
  modelo_version: string;
  afeccion: string;
  intensidad_dolor: number;
  created_at: string;
};

export type EstadoGuardarHallazgo = { error?: string; hallazgo?: HallazgoClinico; seleccionId?: string };