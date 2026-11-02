import test from "node:test";
import assert from "node:assert/strict";
import { estadoSuscripcion, diasHasta, siguienteVencimiento, sumarDias } from "./suscripcion.ts";
import { montoClp } from "./planes.ts";

test("la suscripción sigue activa el día de vencimiento", () => {
  assert.equal(estadoSuscripcion("2026-10-30", "2026-10-30"), "activa");
  assert.equal(estadoSuscripcion("2026-10-31", "2026-10-30"), "activa");
});

test("los cinco días posteriores al vencimiento son de gracia", () => {
  assert.equal(estadoSuscripcion("2026-10-29", "2026-10-30"), "gracia");
  assert.equal(estadoSuscripcion("2026-10-25", "2026-10-30"), "gracia");
});

test("al sexto día queda bloqueada", () => {
  assert.equal(estadoSuscripcion("2026-10-24", "2026-10-30"), "bloqueada");
});

test("sin fecha de suscripción no se bloquea", () => {
  assert.equal(estadoSuscripcion(null, "2026-10-30"), "activa");
});

test("el monto se convierte a CLP y el plan clínica cobra por profesional", () => {
  assert.equal(montoClp("individual"), 14250);
  assert.equal(montoClp("clinica", 2), 34200);
  assert.equal(montoClp("clinica", 0), 17100);
});

test("sumarDias respeta el cambio de mes", () => {
  assert.equal(sumarDias("2026-01-20", 30), "2026-02-19");
  assert.equal(sumarDias("2026-10-30", -5), "2026-10-25");
});

test("un pago nuevo suma 30 días desde el vencimiento vigente", () => {
  assert.equal(siguienteVencimiento("2026-11-29", "2026-10-30"), "2026-12-29");
  assert.equal(siguienteVencimiento(null, "2026-10-30"), "2026-11-29");
  assert.equal(siguienteVencimiento("2026-10-25", "2026-10-30"), "2026-11-29");
});

test("diasHasta cuenta los días que faltan", () => {
  assert.equal(diasHasta("2026-11-29", "2026-10-30"), 30);
  assert.equal(diasHasta("2026-10-30", "2026-10-30"), 0);
  assert.equal(diasHasta("2026-10-25", "2026-10-30"), -5);
});
