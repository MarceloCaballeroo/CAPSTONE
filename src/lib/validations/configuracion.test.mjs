import assert from "node:assert/strict";
import test from "node:test";
import { organizacionSchema } from "./configuracion.ts";

const base = { nombre: "Centro Andes", jornadaInicio: "8", jornadaFin: "19", duracion: "45", dias: ["1", "2", "3"] };

test("acepta una configuración de agenda válida desde FormData", () => {
  const resultado = organizacionSchema.parse(base);
  assert.deepEqual(resultado.dias, [1, 2, 3]);
  assert.equal(resultado.jornadaFin, 19);
});

test("rechaza jornadas invertidas, duraciones fuera de rango y semanas sin días", () => {
  assert.equal(organizacionSchema.safeParse({ ...base, jornadaInicio: "19", jornadaFin: "8" }).success, false);
  assert.equal(organizacionSchema.safeParse({ ...base, duracion: "5" }).success, false);
  assert.equal(organizacionSchema.safeParse({ ...base, dias: [] }).success, false);
  assert.equal(organizacionSchema.safeParse({ ...base, dias: ["8"] }).success, false);
});
