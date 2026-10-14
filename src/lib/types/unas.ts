// Mapa de uñas en vista dorsal esquemática. Coordenadas del lienzo: x de -100 (izquierda) a 100 (derecha) e y creciente
// hacia proximal. Cada hallazgo de uña se guarda en el ancla (centro) de la parte tocada, con z = 0 y normal (0, 0, 1).
export const MODELO_UNAS_VERSION = "unas-v1";

export type LadoUna = "izquierdo" | "derecho";
export type DedoUna = 1 | 2 | 3 | 4 | 5;
export const DEDOS_UNA: readonly DedoUna[] = [1, 2, 3, 4, 5];
export const PARTES_UNA = ["distal", "medial", "lamina", "lateral", "proximal"] as const;
export type ParteUna = (typeof PARTES_UNA)[number];
export type Caja = { x: number; y: number; ancho: number; alto: number };

export const PARTE_UNA: Record<ParteUna, { nombre: string; detalle: string }> = {
  distal: { nombre: "Borde libre", detalle: "Extremo distal de la lámina e hiponiquio" },
  medial: { nombre: "Canal medial", detalle: "Surco y rodete periungueal medial" },
  lamina: { nombre: "Lámina", detalle: "Cuerpo de la uña y lecho ungueal" },
  lateral: { nombre: "Canal lateral", detalle: "Surco y rodete periungueal lateral" },
  proximal: { nombre: "Matriz y eponiquio", detalle: "Pliegue proximal, cutícula y matriz" },
};

const NOMBRE_DEDO: Record<DedoUna, string> = { 1: "hallux", 2: "2.º dedo", 3: "3.er dedo", 4: "4.º dedo", 5: "5.º dedo" };

export function nombreDedoUna(dedo: DedoUna): string {
  return NOMBRE_DEDO[dedo];
}

// Uñas del pie derecho (mitad derecha del lienzo, medial hacia el centro). El pie izquierdo es su espejo.
const UNAS_PIE_DERECHO: Record<DedoUna, { centro: number; arriba: number; ancho: number; alto: number }> = {
  1: { centro: 24, arriba: -34, ancho: 20, alto: 22 },
  2: { centro: 46, arriba: -33, ancho: 11, alto: 13 },
  3: { centro: 62, arriba: -27, ancho: 10, alto: 12 },
  4: { centro: 76, arriba: -20, ancho: 9, alto: 11 },
  5: { centro: 88, arriba: -11, ancho: 8, alto: 9 },
};

export function cajaUna(lado: LadoUna, dedo: DedoUna): Caja {
  const una = UNAS_PIE_DERECHO[dedo];
  const centro = lado === "derecho" ? una.centro : -una.centro;
  return { x: centro - una.ancho / 2, y: una.arriba, ancho: una.ancho, alto: una.alto };
}

// Partes en coordenadas de la uña: u de medial (0) a lateral (1) y v de distal (0) a proximal (1).
const PARTES_NORMALIZADAS: Record<ParteUna, { u0: number; u1: number; v0: number; v1: number }> = {
  distal: { u0: 0, u1: 1, v0: 0, v1: 0.2 },
  medial: { u0: 0, u1: 0.25, v0: 0.2, v1: 0.78 },
  lamina: { u0: 0.25, u1: 0.75, v0: 0.2, v1: 0.78 },
  lateral: { u0: 0.75, u1: 1, v0: 0.2, v1: 0.78 },
  proximal: { u0: 0, u1: 1, v0: 0.78, v1: 1 },
};

/** Rectángulo de una parte dentro de `caja` (por defecto, la uña en el mapa). En vista dorsal el lado medial mira al centro. */
export function cajaParte(lado: LadoUna, dedo: DedoUna, parte: ParteUna, caja: Caja = cajaUna(lado, dedo)): Caja {
  const { u0, u1, v0, v1 } = PARTES_NORMALIZADAS[parte];
  const [desde, hasta] = lado === "derecho" ? [u0, u1] : [1 - u1, 1 - u0];
  return { x: caja.x + desde * caja.ancho, y: caja.y + v0 * caja.alto, ancho: (hasta - desde) * caja.ancho, alto: (v1 - v0) * caja.alto };
}

// Simétrico respecto de 0 (Math.round lleva -x,5 hacia +∞): así el pie izquierdo es espejo exacto del derecho.
const redondear = (valor: number) => (Math.sign(valor) * Math.round(Math.abs(valor) * 100)) / 100 || 0;

/** Punto que se guarda para un hallazgo en esa parte de la uña. */
export function anclaParte(lado: LadoUna, dedo: DedoUna, parte: ParteUna): [number, number] {
  const caja = cajaParte(lado, dedo, parte);
  return [redondear(caja.x + caja.ancho / 2), redondear(caja.y + caja.alto / 2)];
}

/** Uña y parte que corresponden a un punto guardado; null si no es un ancla válida. */
export function ubicarParteUna(lado: LadoUna, x: number, y: number): { dedo: DedoUna; parte: ParteUna } | null {
  for (const dedo of DEDOS_UNA) {
    for (const parte of PARTES_UNA) {
      const [ax, ay] = anclaParte(lado, dedo, parte);
      if (Math.abs(ax - x) < 0.01 && Math.abs(ay - y) < 0.01) return { dedo, parte };
    }
  }
  return null;
}

export function nombreParteUna(dedo: DedoUna, parte: ParteUna): string {
  return `Uña del ${NOMBRE_DEDO[dedo]} · ${PARTE_UNA[parte].nombre.toLowerCase()}`;
}

export function zonaHallazgoUna(hallazgo: { lado_pie: LadoUna; coordenada_x: number; coordenada_y: number }): string | null {
  const una = ubicarParteUna(hallazgo.lado_pie, hallazgo.coordenada_x, hallazgo.coordenada_y);
  return una ? nombreParteUna(una.dedo, una.parte) : null;
}

// Afecciones ungueales frecuentes, sugeridas según la parte tocada. Son atajos de texto: el profesional puede escribir otra.
// Grados de onicocriptosis según Heifetz (I inflamación, II infección, III granuloma).
export const AFECCIONES_UNA: readonly { texto: string; partes: readonly ParteUna[] }[] = [
  { texto: "Onicocriptosis grado I (eritema y edema)", partes: ["medial", "lateral"] },
  { texto: "Onicocriptosis grado II (infección o supuración)", partes: ["medial", "lateral"] },
  { texto: "Onicocriptosis grado III (granuloma e hipertrofia del rodete)", partes: ["medial", "lateral"] },
  { texto: "Onicofosis (heloma en el canal ungueal)", partes: ["medial", "lateral"] },
  { texto: "Uña involuta (en teja o en pinza)", partes: ["medial", "lateral", "lamina"] },
  { texto: "Paroniquia", partes: ["medial", "lateral", "proximal"] },
  { texto: "Onicomicosis subungueal distal-lateral", partes: ["distal", "lamina", "medial", "lateral"] },
  { texto: "Onicomicosis blanca superficial", partes: ["lamina"] },
  { texto: "Onicomicosis subungueal proximal", partes: ["proximal"] },
  { texto: "Onicomicosis distrófica total", partes: ["lamina"] },
  { texto: "Onicogrifosis", partes: ["lamina", "distal"] },
  { texto: "Onicolisis", partes: ["distal", "lamina"] },
  { texto: "Hiperqueratosis subungueal", partes: ["distal", "lamina"] },
  { texto: "Hematoma subungueal", partes: ["lamina", "proximal"] },
  { texto: "Onicodistrofia", partes: ["lamina", "proximal"] },
];

export function afeccionesSugeridasUna(parte: ParteUna): string[] {
  return AFECCIONES_UNA.filter((afeccion) => afeccion.partes.includes(parte)).map((afeccion) => afeccion.texto);
}
