import test from "node:test";
import assert from "node:assert/strict";
import { textoCartaDerivacion } from "./derivacion.ts";

test("arma la carta con nombre completo, motivos separados y diagnóstico", () => {
  const carta = textoCartaDerivacion({
    paciente: { nombre: "Ana", apellidoPaterno: "Pérez", apellidoMaterno: null, rut: "12.345.678-9" },
    profesional: "Martín Maldonado",
    organizacion: "PodoCare",
    especialidad: "Cirugía Vascular",
    motivo: "Signos clínicos de infección activa detectados. | Compromiso vascular periférico / sospecha de isquemia crítica.",
    diagnostico: { codigo: "E11.621", nombre: "Úlcera del pie" },
  });

  assert.equal(carta.nombrePaciente, "Ana Pérez");
  assert.equal(
    carta.cuerpo[0],
    "Por medio de la presente, derivo a Ana Pérez, RUT 12.345.678-9, al servicio de Cirugía Vascular.",
  );
  assert.deepEqual(carta.cuerpo.slice(1), [
    "Motivo: Signos clínicos de infección activa detectados.",
    "Motivo: Compromiso vascular periférico / sospecha de isquemia crítica.",
  ]);
  assert.equal(carta.diagnostico, "E11.621 — Úlcera del pie");
  assert.equal(carta.firma, "Martín Maldonado\nPodoCare");
});

test("omite el diagnóstico cuando el catálogo no lo encuentra", () => {
  const carta = textoCartaDerivacion({
    paciente: { nombre: "Ana", apellidoPaterno: "Pérez", apellidoMaterno: "Soto", rut: "12.345.678-9" },
    profesional: "Martín Maldonado",
    organizacion: "PodoCare",
    especialidad: "Medicina General",
    motivo: "Riesgo IWGDF alto: úlcera previa o amputación.",
  });

  assert.equal(carta.nombrePaciente, "Ana Pérez Soto");
  assert.equal(carta.diagnostico, null);
  assert.deepEqual(carta.cuerpo.slice(1), ["Motivo: Riesgo IWGDF alto: úlcera previa o amputación."]);
});
