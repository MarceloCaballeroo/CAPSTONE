import assert from "node:assert/strict";
import test from "node:test";
import { atencionSchema } from "./atenciones.ts";

const base = {
  pacienteId: "8f14e45f-ceea-467a-9f22-9a0b1a7c1b2c",
  diagnosticoCie10: "E11.5",
  monofilamento: false,
  pulsos: true,
  deformidad: false,
  antecedentesUlcera: false,
  signosInfeccion: false,
  dolorIsquemico: false,
  observaciones: "",
};

test("acepta una atención con un código CIE-10 del catálogo", () => {
  const resultado = atencionSchema.safeParse(base);
  assert.equal(resultado.success, true);
});

test("exige el diagnóstico CIE-10 y un paciente válido", () => {
  assert.equal(atencionSchema.safeParse({ ...base, diagnosticoCie10: "   " }).success, false);
  assert.equal(atencionSchema.safeParse({ ...base, diagnosticoCie10: "E11.5" }).success, true);
  assert.equal(atencionSchema.safeParse({ ...base, pacienteId: "no-es-uuid" }).success, false);
});

test("rechaza observaciones de más de 2000 caracteres", () => {
  assert.equal(atencionSchema.safeParse({ ...base, observaciones: "x".repeat(2000) }).success, true);
  assert.equal(atencionSchema.safeParse({ ...base, observaciones: "x".repeat(2001) }).success, false);
});

test("el procedimiento invasivo es falso por defecto", () => {
  const resultado = atencionSchema.safeParse(base);
  assert.equal(resultado.success, true);
  if (resultado.success) assert.equal(resultado.data.procedimientoInvasivo, false);
});
