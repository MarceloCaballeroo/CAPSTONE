import { z } from "zod";

function validarRut(rut: string): boolean {
  const limpio = rut.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;

  const cuerpo = limpio.slice(0, -1);
  const verificador = limpio.slice(-1);
  let suma = 0;
  let multiplicador = 2;

  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return esperado === verificador;
}

// Teléfono: acepta +, dígitos, espacios, paréntesis y guiones, con 8 a 15 dígitos.
function validarTelefono(valor: string): boolean {
  if (!/^[+\d\s()-]+$/.test(valor)) return false;
  const digitos = valor.replace(/\D/g, "").length;
  return digitos >= 8 && digitos <= 15;
}

// Fecha de nacimiento real (AAAA-MM-DD), no futura y con menos de 120 años.
function validarFechaNacimiento(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) return false;
  const hoy = new Date();
  const limiteFuturo = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  return fecha <= limiteFuturo && fecha.getUTCFullYear() >= hoy.getUTCFullYear() - 120;
}

const textoOpcional = (max: number, mensaje: string) => z.string().trim().max(max, mensaje).optional();
const telefonoOpcional = z
  .string()
  .trim()
  .max(20, "El teléfono es demasiado largo")
  .refine(validarTelefono, "Ingresa un teléfono válido (entre 8 y 15 dígitos)")
  .optional();

export const pacienteSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre del paciente").max(80, "El nombre es demasiado largo"),
  apellidoPaterno: z.string().trim().min(2, "Ingresa el apellido paterno").max(80, "El apellido es demasiado largo"),
  apellidoMaterno: textoOpcional(80, "El apellido es demasiado largo"),
  rut: z.string().trim().refine(validarRut, "Ingresa un RUT chileno válido"),
  fechaNacimiento: z
    .string()
    .trim()
    .refine((valor) => valor.length > 0, "Ingresa la fecha de nacimiento")
    .refine(validarFechaNacimiento, "Ingresa una fecha de nacimiento válida (no puede ser futura)"),
  sexoBiologico: z.enum(["masculino", "femenino", "intersexual", "no_especificado"]).optional(),
  telefono: telefonoOpcional,
  email: z.union([z.email("Ingresa un correo válido").max(254, "El correo es demasiado largo"), z.literal("")]).optional(),
  direccion: textoOpcional(120, "La dirección es demasiado larga"),
  comunaId: z.coerce.number().int().positive().optional(),
  prevision: z.enum(
    ["fonasa_a", "fonasa_b", "fonasa_c", "fonasa_d", "isapre", "dipreca_capredena", "particular"],
    "Selecciona la previsión de salud",
  ),
  centroSaludOrigen: textoOpcional(120, "El nombre del centro es demasiado largo"),
  contactoEmergenciaNombre: textoOpcional(80, "El nombre es demasiado largo"),
  contactoEmergenciaTelefono: telefonoOpcional,
  contactoEmergenciaParentesco: textoOpcional(40, "El parentesco es demasiado largo"),
  consentimiento: z.boolean().refine((value) => value, "Debes registrar el consentimiento informado"),
}).refine(
  (datos) => Boolean(datos.contactoEmergenciaNombre) || (!datos.contactoEmergenciaTelefono && !datos.contactoEmergenciaParentesco),
  { message: "Ingresa el nombre del contacto de emergencia", path: ["contactoEmergenciaNombre"] },
);

// Agrupa los errores de zod por campo para marcarlos en el formulario.
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((mapa, issue) => {
    const campo = String(issue.path[0] ?? "");
    if (campo && !mapa[campo]) mapa[campo] = issue.message;
    return mapa;
  }, {});
}

export type PacienteFormData = z.infer<typeof pacienteSchema>;

export function descomponerRut(rut: string): { rut_numero: number; rut_dv: string } {
  const limpio = rut.replace(/[.\-\s]/g, "").toUpperCase();
  const cuerpo = limpio.slice(0, -1);
  const verificador = limpio.slice(-1);
  return {
    rut_numero: parseInt(cuerpo, 10),
    rut_dv: verificador,
  };
}

function agruparMiles(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Formatea el RUT tecla a tecla: agrega los puntos y el guion, y se reacomoda al borrar.
// Con menos de 8 dígitos todavía no hay dígito verificador (todo es cuerpo), por eso el guion
// recién aparece a partir del octavo: así al borrar no queda un "12.345.678-" colgando.
export function formatearRutEnVivo(valor: string): string {
  const limpio = valor.replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length < 8) return agruparMiles(limpio);
  return `${agruparMiles(limpio.slice(0, -1))}-${limpio.slice(-1)}`;
}

export function formatearRut(
  rutOrNumero?: string | number | null,
  dv?: string | null
): string {
  if (rutOrNumero === null || rutOrNumero === undefined || rutOrNumero === "") return "Sin RUT";

  if (typeof rutOrNumero === "number" || (dv !== undefined && dv !== null)) {
    const num = typeof rutOrNumero === "number" ? rutOrNumero : parseInt(String(rutOrNumero).replace(/\D/g, ""), 10);
    if (isNaN(num)) return "Sin RUT";
    const numFormateado = num.toLocaleString("es-CL");
    return dv ? `${numFormateado}-${dv.toUpperCase()}` : numFormateado;
  }

  const limpio = String(rutOrNumero).replace(/[.\-\s]/g, "").toUpperCase();
  if (!limpio) return "Sin RUT";
  if (limpio.length === 1) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const verificador = limpio.slice(-1);
  const num = parseInt(cuerpo, 10);
  return isNaN(num) ? `${cuerpo}-${verificador}` : `${num.toLocaleString("es-CL")}-${verificador}`;
}