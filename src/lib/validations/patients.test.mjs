import assert from "node:assert/strict";
import test from "node:test";
import { descomponerRut, erroresPorCampo, formatearRutEnVivo, pacienteSchema } from "./patients.ts";

const base = { nombre: "Ana", apellidoPaterno: "Pérez", rut: "12.345.678-5", fechaNacimiento: "1966-03-14", prevision: "fonasa_a", consentimiento: true };

test("convierte la comuna recibida desde FormData a número", () => {
  assert.equal(pacienteSchema.parse({ ...base, comunaId: "13101" }).comunaId, 13101);
});

test("acepta un paciente sin comuna", () => {
  const resultado = pacienteSchema.safeParse(base);
  assert.equal(resultado.success, true);
  assert.equal(resultado.data.comunaId, undefined);
});

test("rechaza una comuna inválida", () => {
  assert.equal(pacienteSchema.safeParse({ ...base, comunaId: "0" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, comunaId: "abc" }).success, false);
});

test("descompone el RUT en número y dígito verificador", () => {
  assert.deepEqual(descomponerRut("12.345.678-5"), { rut_numero: 12345678, rut_dv: "5" });
});

test("exige el nombre del contacto de emergencia cuando hay teléfono o parentesco", () => {
  assert.equal(pacienteSchema.safeParse({ ...base, contactoEmergenciaTelefono: "+56915560372" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, contactoEmergenciaParentesco: "Hijo" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, contactoEmergenciaNombre: "Carlos Fuentes", contactoEmergenciaParentesco: "Hijo" }).success, true);
  assert.equal(pacienteSchema.safeParse(base).success, true);
});

test("rechaza fechas de nacimiento futuras, ilógicas o mal formadas", () => {
  assert.equal(pacienteSchema.safeParse({ ...base, fechaNacimiento: "2099-01-01" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, fechaNacimiento: "no-es-fecha" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, fechaNacimiento: "1800-01-01" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, fechaNacimiento: "2024-02-31" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, fechaNacimiento: "1966-03-14" }).success, true);
});

test("rechaza teléfonos que no parecen teléfonos", () => {
  assert.equal(pacienteSchema.safeParse({ ...base, telefono: "abcdef" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, telefono: "1234" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, telefono: "9".repeat(50) }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, contactoEmergenciaNombre: "Ana", contactoEmergenciaTelefono: "letras" }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, telefono: "+56 9 1349 2088" }).success, true);
  assert.equal(pacienteSchema.safeParse({ ...base, telefono: "+56913492088" }).success, true);
});

test("rechaza textos demasiado largos", () => {
  assert.equal(pacienteSchema.safeParse({ ...base, nombre: "A".repeat(81) }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, apellidoPaterno: "A".repeat(81) }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, direccion: "x".repeat(121) }).success, false);
  assert.equal(pacienteSchema.safeParse({ ...base, centroSaludOrigen: "x".repeat(121) }).success, false);
});

test("agrupa los errores por campo para marcarlos en el formulario", () => {
  const resultado = pacienteSchema.safeParse({ ...base, nombre: "", rut: "1-9" });
  assert.equal(resultado.success, false);
  const errores = erroresPorCampo(resultado.error);
  assert.equal(typeof errores.nombre, "string");
  assert.equal(typeof errores.rut, "string");
  assert.equal(errores.apellidoPaterno, undefined);
});

test("exige la fecha de nacimiento y la previsión (columnas NOT NULL en la base)", () => {
  const sinFecha = pacienteSchema.safeParse({ ...base, fechaNacimiento: "" });
  assert.equal(sinFecha.success, false);
  assert.match(erroresPorCampo(sinFecha.error).fechaNacimiento, /fecha de nacimiento/i);

  const sinPrevision = pacienteSchema.safeParse({ ...base, prevision: "" });
  assert.equal(sinPrevision.success, false);
  assert.ok(erroresPorCampo(sinPrevision.error).prevision);
});

test("formatea el RUT mientras se escribe", () => {
  assert.equal(formatearRutEnVivo("1"), "1");
  assert.equal(formatearRutEnVivo("1234"), "1.234");
  assert.equal(formatearRutEnVivo("1234567"), "1.234.567");
  assert.equal(formatearRutEnVivo("12345678"), "1.234.567-8");
  assert.equal(formatearRutEnVivo("123456785"), "12.345.678-5");
  assert.equal(formatearRutEnVivo("12345678k"), "12.345.678-K");
  assert.equal(formatearRutEnVivo("12 345 678 5"), "12.345.678-5");
  assert.equal(formatearRutEnVivo(""), "");
});

test("se reacomoda al borrar y no deja guiones colgando", () => {
  assert.equal(formatearRutEnVivo("1.234.567-"), "1.234.567");
  assert.equal(formatearRutEnVivo("1.234.56"), "123.456");
  assert.equal(formatearRutEnVivo("12.345.678-"), "1.234.567-8");
  assert.equal(formatearRutEnVivo("1.234.567"), "1.234.567");
});
