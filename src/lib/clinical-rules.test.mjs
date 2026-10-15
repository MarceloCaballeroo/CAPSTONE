import assert from "node:assert/strict";
import test from "node:test";
import { alertasBloqueantes, evaluarRiesgoYDerivacion, fechaLimiteControl, textoControlSugerido } from "./clinical-rules.ts";

test("la frecuencia de control sigue los grupos IWGDF", () => {
  assert.equal(textoControlSugerido("muy_bajo"), "cada 12 meses");
  assert.equal(textoControlSugerido("alto"), "cada 1–3 meses");
  assert.equal(fechaLimiteControl("moderado", new Date(2026, 5, 3)).toDateString(), new Date(2026, 11, 3).toDateString());
});

test("la clasificación sigue la tabla de estratificación IWGDF", () => {
  const base = { monofilamentoSensible: true, pulsosPresentes: true, deformidadPresente: false, ulceraPreviaOAmputacion: false, signosInfeccion: false, dolorIsquemico: false };
  assert.equal(evaluarRiesgoYDerivacion(base).nivelRiesgo, "muy_bajo");
  assert.equal(evaluarRiesgoYDerivacion({ ...base, pulsosPresentes: false }).nivelRiesgo, "bajo");
  assert.equal(evaluarRiesgoYDerivacion({ ...base, pulsosPresentes: false, deformidadPresente: true }).nivelRiesgo, "moderado");
  assert.equal(evaluarRiesgoYDerivacion({ ...base, monofilamentoSensible: false, deformidadPresente: true }).nivelRiesgo, "moderado");
  const alto = evaluarRiesgoYDerivacion({ ...base, monofilamentoSensible: false, ulceraPreviaOAmputacion: true });
  assert.equal(alto.nivelRiesgo, "alto");
  assert.equal(alto.requiereDerivacion, true);
});

test("las alertas de una evaluación bloqueante se recuperan desde el motivo de derivación", () => {
  const { alertas, bloquearProcedimientoInvasivo } = evaluarRiesgoYDerivacion({
    monofilamentoSensible: true, pulsosPresentes: false, deformidadPresente: false,
    ulceraPreviaOAmputacion: false, signosInfeccion: true, dolorIsquemico: false,
  });
  assert.equal(bloquearProcedimientoInvasivo, true);
  assert.deepEqual(alertasBloqueantes(alertas.join(" | ")), alertas);
  assert.deepEqual(alertasBloqueantes(""), []);
  assert.deepEqual(alertasBloqueantes("Derivación manual"), []);
});
