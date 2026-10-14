import assert from "node:assert/strict";
import test from "node:test";
import { nombreZona, zonaHallazgo, zonaPie } from "./hallazgos.ts";

const ARRIBA = [0, 1, 0], ABAJO = [0, -1, 0], ADELANTE = [0, 0, 1], ATRAS = [0, 0, -1], MEDIAL = [-1, 0, 0], LATERAL = [1, 0, 0];
// El pie izquierdo se guarda con X negada (ver FootModelViewer).
const espejo = ([x, y, z]) => [-x, y, z];

test("foot-v2: nombra la región pintada en el modelo con su cara", () => {
  assert.equal(nombreZona("hallux", "derecho", ADELANTE), "Hallux · punta");
  assert.equal(nombreZona("hallux", "derecho", MEDIAL), "Hallux · medial");
  assert.equal(nombreZona("hallux", "derecho", LATERAL), "Hallux · interdigital lateral");
  assert.equal(nombreZona("dedo_5", "derecho", LATERAL), "5.º dedo · lateral");
  assert.equal(nombreZona("dedo_3", "derecho", MEDIAL), "3.er dedo · interdigital medial");
  assert.equal(nombreZona("cabeza_mt_1", "derecho", ABAJO), "Cabeza del 1.er metatarsiano · plantar");
  assert.equal(nombreZona("talon", "derecho", ATRAS), "Talón · posterior");
  assert.equal(nombreZona("maleolo_medial", "derecho", MEDIAL), "Maléolo medial");
  assert.equal(nombreZona("base_mt_5", "derecho", LATERAL), "Base del 5.º metatarsiano");
  assert.equal(nombreZona("desconocida", "derecho", ARRIBA), null);
  assert.equal(nombreZona("pierna", "derecho", ARRIBA), "Pierna distal");
  assert.equal(nombreZona("pierna", "derecho", MEDIAL), "Pierna distal · medial");
  // La cara medial del pie izquierdo se guarda con X positiva.
  assert.equal(nombreZona("hallux", "izquierdo", espejo(MEDIAL)), "Hallux · medial");
});

test("foot-v1: mapea las zonas clínicas desde la posición", () => {
  assert.equal(zonaPie("derecho", [-2.4, 1, 13.2], ADELANTE), "Hallux · punta");
  assert.equal(zonaPie("derecho", [-2.4, 2, 10], ARRIBA), "Hallux · dorsal");
  assert.equal(zonaPie("derecho", [-1.2, 1, 11], LATERAL), "Hallux · interdigital lateral");
  assert.equal(zonaPie("derecho", [-0.1, 1.5, 11.5], ARRIBA), "2.º dedo · dorsal");
  assert.equal(zonaPie("derecho", [3.4, 0.5, 8.5], ABAJO), "5.º dedo · plantar");
  assert.equal(zonaPie("derecho", [-2.5, 0.1, 6], ABAJO), "Cabeza del 1.er metatarsiano · plantar");
  assert.equal(zonaPie("derecho", [3.5, 0.2, 4.5], ABAJO), "Cabeza del 5.º metatarsiano · plantar");
  assert.equal(zonaPie("derecho", [-2, 1, 0], ABAJO), "Arco longitudinal medial");
  assert.equal(zonaPie("derecho", [2, 0.5, 0], ABAJO), "Mediopié · plantar");
  assert.equal(zonaPie("derecho", [0, 0.4, -7], ABAJO), "Talón · plantar");
  assert.equal(zonaPie("derecho", [-3.5, 6.5, -4], MEDIAL), "Maléolo medial");
  assert.equal(zonaPie("derecho", [1.5, 6.5, -4], LATERAL), "Maléolo lateral");
  assert.equal(zonaPie("derecho", [0, 7, -7.3], ATRAS), "Tendón de Aquiles");
  for (const [posicion, normal] of [[[-2.4, 2, 10], ARRIBA], [[-1.2, 1, 11], LATERAL], [[-3.5, 6.5, -4], MEDIAL]]) {
    assert.equal(zonaPie("izquierdo", espejo(posicion), espejo(normal)), zonaPie("derecho", posicion, normal));
  }
});

test("zonaHallazgo usa las reglas de cada versión del modelo", () => {
  const base = { lado_pie: "derecho", coordenada_x: -2.4, coordenada_y: 2, coordenada_z: 10, normal_x: 0, normal_y: 1, normal_z: 0 };
  assert.equal(zonaHallazgo({ ...base, id: "a", modelo_version: "foot-v1" }, {}), "Hallux · dorsal");
  assert.equal(zonaHallazgo({ ...base, id: "b", modelo_version: "foot-v2" }, { b: "dedo_2" }), "2.º dedo · dorsal");
  assert.equal(zonaHallazgo({ ...base, id: "c", modelo_version: "foot-v2" }, {}), null);
});
