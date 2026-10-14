export const MODELO_PIE_VERSION = "foot-v2";
export const MODELO_PIE_V1 = "foot-v1";

export type LadoPie = "izquierdo" | "derecho";

export type AtencionMarcable = {
  id: string;
  created_at: string;
  diagnostico_cie10: string;
};

export type HallazgoClinico = {
  id: string;
  atencion_id: string;
  corrige_hallazgo_id: string | null;
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

const ORDINALES = ["1.er", "2.º", "3.er", "4.º", "5.º"];

// Regiones anatómicas. En foot-v2 vienen pintadas en el modelo (material "zona:<id>", ver scripts/build_foot_v2.py).
const REGIONES: Record<string, string> = {
  hallux: "Hallux",
  ...Object.fromEntries([2, 3, 4, 5].map((n) => [`dedo_${n}`, `${ORDINALES[n - 1]} dedo`])),
  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`cabeza_mt_${n}`, `Cabeza del ${ORDINALES[n - 1]} metatarsiano`])),
  diafisis_mt: "Antepié (diáfisis metatarsianas)",
  base_mt_5: "Base del 5.º metatarsiano",
  mediopie: "Mediopié",
  arco_medial: "Arco longitudinal medial",
  talon: "Talón",
  maleolo_medial: "Maléolo medial",
  maleolo_lateral: "Maléolo lateral",
  aquiles: "Tendón de Aquiles",
  tobillo: "Tobillo",
  pierna: "Pierna distal",
};
// Regiones cuyo nombre ya implica la cara.
const SIN_CARA = new Set(["maleolo_medial", "maleolo_lateral", "aquiles", "arco_medial", "base_mt_5"]);

// Ambos modelos son un pie IZQUIERDO con +Z hacia los dedos, +Y dorsal y -X medial.
// Coordenadas guardadas: pie izquierdo con X negada (FootModelViewer la espeja al guardar); pie derecho tal cual.
function marcoAnatomico(lado: LadoPie, vector: readonly number[]): [number, number, number] {
  return [vector[0] * (lado === "derecho" ? 1 : -1), vector[1], vector[2]];
}

export function nombreZona(region: string, lado: LadoPie, normal: readonly number[]): string | null {
  const nombre = REGIONES[region];
  if (!nombre) return null;
  if (SIN_CARA.has(region)) return nombre;
  const [nx, ny, nz] = marcoAnatomico(lado, normal);
  const lateralidad = nx < 0 ? "medial" : "lateral";
  const cara = ny < -0.5 ? "plantar" : ny > 0.5 ? "dorsal" : Math.abs(nz) > Math.abs(nx) ? (nz > 0 ? "anterior" : "posterior") : lateralidad;
  // La cara superior de la pierna es el corte del modelo, no una superficie anatómica.
  if (region === "pierna" && cara === "dorsal") return nombre;
  const esDedo = region === "hallux" || region.startsWith("dedo_");
  if (!esDedo) return `${nombre} · ${cara}`;
  if (cara === "anterior") return `${nombre} · punta`;
  // Interdigital: la cara que mira a otro dedo (no el borde medial del hallux ni el lateral del 5.º).
  const bordeLibre = (region === "hallux" && cara === "medial") || (region === "dedo_5" && cara === "lateral");
  return `${nombre} · ${cara === lateralidad && !bordeLibre ? `interdigital ${cara}` : cara}`;
}

// foot-v1 (malla única "Foot", sin partes nombradas): la región se deriva de la posición.
// Talón -8.96, punta del hallux 13.3; 1 u ≈ 1,1 cm.
const TALON_Z_V1 = -8.96;
const porcentajeLargoV1 = (fraccion: number) => TALON_Z_V1 + (13.3 - TALON_Z_V1) * fraccion;
// Límites medial→lateral entre radios, medidos en las hendiduras interdigitales de la malla.
const LIMITES_RADIOS_V1 = [-1, 0.7, 2.05, 2.9];
// Línea metatarsofalángica oblicua (proporciones de horma): 1.ª MTF ≈ 72,5 % y 5.ª MTF ≈ 63,5 % del largo.
const MTF_V1 = { xMedial: -2.5, zMedial: porcentajeLargoV1(0.725), xLateral: 3.5, zLateral: porcentajeLargoV1(0.635) };

// ponytail: umbrales fijos medidos sobre foot-v1; solo para hallazgos antiguos.
export function regionV1(lado: LadoPie, posicion: readonly number[], normal: readonly number[]): string {
  const [x, y, z] = marcoAnatomico(lado, posicion);
  const [nx, ny, nz] = marcoAnatomico(lado, normal);
  const radioIndice = LIMITES_RADIOS_V1.findIndex((limite) => x < limite);
  const radio = radioIndice === -1 ? 5 : radioIndice + 1;
  const zMtf = MTF_V1.zMedial + ((x - MTF_V1.xMedial) * (MTF_V1.zLateral - MTF_V1.zMedial)) / (MTF_V1.xLateral - MTF_V1.xMedial);

  // Tobillo sobre ~5,5 cm, pierna sobre ~9,5 cm.
  if (y >= 5 && z < porcentajeLargoV1(0.45)) {
    if (y >= 8.5) return "pierna";
    if (Math.abs(ny) <= 0.5 && Math.abs(nx) >= Math.abs(nz)) return nx < 0 ? "maleolo_medial" : "maleolo_lateral";
    return Math.abs(ny) <= 0.5 && nz < 0 && Math.abs(nz) > Math.abs(nx) ? "aquiles" : "tobillo";
  }
  if (z < porcentajeLargoV1(0.3)) return "talon";
  if (z >= zMtf) return radio === 1 ? "hallux" : `dedo_${radio}`;
  if (z >= zMtf - 2) return `cabeza_mt_${radio}`;
  if (z >= porcentajeLargoV1(0.55)) return "diafisis_mt";
  return ny < -0.5 && x < -0.5 ? "arco_medial" : "mediopie";
}

export function zonaPie(lado: LadoPie, posicion: readonly number[], normal: readonly number[]): string | null {
  return nombreZona(regionV1(lado, posicion, normal), lado, normal);
}

/** Zona legible de un hallazgo; los de foot-v2 necesitan la región leída del modelo (`regionesV2`). */
export function zonaHallazgo(hallazgo: HallazgoClinico, regionesV2: Readonly<Record<string, string>>): string | null {
  const normal = [hallazgo.normal_x, hallazgo.normal_y, hallazgo.normal_z];
  if (hallazgo.modelo_version === MODELO_PIE_V1) {
    return zonaPie(hallazgo.lado_pie, [hallazgo.coordenada_x, hallazgo.coordenada_y, hallazgo.coordenada_z], normal);
  }
  const region = regionesV2[hallazgo.id];
  return region ? nombreZona(region, hallazgo.lado_pie, normal) : null;
}

export function hallazgosVigentes(hallazgos: HallazgoClinico[]): HallazgoClinico[] {
  const reemplazados = new Set(hallazgos.map((hallazgo) => hallazgo.corrige_hallazgo_id).filter((id): id is string => id !== null));
  return hallazgos.filter((hallazgo) => !reemplazados.has(hallazgo.id));
}

export type EstadoGuardarHallazgo = { error?: string; hallazgo?: HallazgoClinico; seleccionId?: string; regiones?: Record<string, string> };