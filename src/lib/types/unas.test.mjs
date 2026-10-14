import assert from "node:assert/strict";
import test from "node:test";
import { AFECCIONES_UNA, afeccionesSugeridasUna, anclaParte, DEDOS_UNA, PARTES_UNA, ubicarParteUna, zonaHallazgoUna } from "./unas.ts";

const LADOS = ["izquierdo", "derecho"];

test("cada parte de cada uña tiene un ancla única, dentro del rango guardable y recuperable", () => {
  for (const lado of LADOS) {
    const vistas = new Set();
    for (const dedo of DEDOS_UNA) {
      for (const parte of PARTES_UNA) {
        const [x, y] = anclaParte(lado, dedo, parte);
        assert.ok(Math.abs(x) <= 100 && Math.abs(y) <= 100, `${lado} ${dedo} ${parte} fuera de rango`);
        assert.ok(!vistas.has(`${x},${y}`), `${lado} ${dedo} ${parte} repetida`);
        vistas.add(`${x},${y}`);
        assert.deepEqual(ubicarParteUna(lado, x, y), { dedo, parte });
      }
    }
  }
  assert.equal(ubicarParteUna("derecho", 0, 0), null);
});

test("el lado medial mira al centro y el pie izquierdo es espejo del derecho", () => {
  for (const dedo of DEDOS_UNA) {
    assert.ok(anclaParte("derecho", dedo, "medial")[0] < anclaParte("derecho", dedo, "lateral")[0]);
    assert.ok(anclaParte("izquierdo", dedo, "medial")[0] > anclaParte("izquierdo", dedo, "lateral")[0]);
    for (const parte of PARTES_UNA) {
      const [x, y] = anclaParte("derecho", dedo, parte);
      assert.deepEqual(anclaParte("izquierdo", dedo, parte), [-x || 0, y]);
    }
  }
  // Las coordenadas del pie izquierdo no son anclas del derecho.
  const [x, y] = anclaParte("izquierdo", 1, "medial");
  assert.equal(ubicarParteUna("derecho", x, y), null);
});

test("nombra la zona y sugiere afecciones por parte", () => {
  const [x, y] = anclaParte("derecho", 1, "medial");
  assert.equal(zonaHallazgoUna({ lado_pie: "derecho", coordenada_x: x, coordenada_y: y }), "Uña del hallux · canal medial");
  const [x2, y2] = anclaParte("izquierdo", 2, "proximal");
  assert.equal(zonaHallazgoUna({ lado_pie: "izquierdo", coordenada_x: x2, coordenada_y: y2 }), "Uña del 2.º dedo · matriz y eponiquio");
  assert.ok(afeccionesSugeridasUna("medial").some((texto) => texto.startsWith("Onicocriptosis")));
  for (const parte of PARTES_UNA) assert.ok(afeccionesSugeridasUna(parte).length >= 3, `${parte} con pocas sugerencias`);
  for (const { texto } of AFECCIONES_UNA) assert.ok(texto.length <= 120, `${texto} supera 120 caracteres`);
});
