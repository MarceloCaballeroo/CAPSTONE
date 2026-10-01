import assert from "node:assert/strict";
import test from "node:test";
import { convertirFechaHoraChileAISO, obtenerDiasSemana, obtenerFechaInicioSemana, obtenerRangoSemanaUTC } from "./agenda.ts";

test("la semana parte el lunes y cubre siete días", () => {
  const inicio = obtenerFechaInicioSemana("2026-10-01", new Date("2026-10-01T12:00:00Z"));
  assert.equal(inicio, "2026-09-28");
  assert.deepEqual(obtenerDiasSemana(inicio).map(({ fecha }) => fecha), [
    "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
  ]);
});

test("convierte la hora de Santiago respetando horario de verano e invierno", () => {
  assert.equal(convertirFechaHoraChileAISO("2026-01-10T10:00"), "2026-01-10T13:00:00.000Z");
  assert.equal(convertirFechaHoraChileAISO("2026-06-10T10:00"), "2026-06-10T14:00:00.000Z");
});

test("consulta el rango semanal incluyendo ambos límites locales", () => {
  const [desde, hasta] = obtenerRangoSemanaUTC("2026-09-28");
  assert.equal(desde, "2026-09-27T12:00:00.000Z");
  assert.equal(hasta, "2026-10-05T12:00:00.000Z");
});