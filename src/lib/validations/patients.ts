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

export const pacienteSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre del paciente"),
  apellidoPaterno: z.string().trim().min(2, "Ingresa el apellido paterno"),
  apellidoMaterno: z.string().trim().optional(),
  rut: z.string().trim().refine(validarRut, "Ingresa un RUT chileno válido"),
  fechaNacimiento: z.string().optional(),
  sexoBiologico: z.enum(["masculino", "femenino", "intersexual", "no_especificado"]).optional(),
  telefono: z.string().trim().optional(),
  email: z.union([z.email("Ingresa un correo válido"), z.literal("")]).optional(),
  direccion: z.string().trim().optional(),
  comuna: z.string().trim().optional(),
  prevision: z.enum(["fonasa_a", "fonasa_b", "fonasa_c", "fonasa_d", "isapre", "dipreca_capredena", "particular"]).optional(),
  centroSaludOrigen: z.string().trim().optional(),
  contactoEmergenciaNombre: z.string().trim().optional(),
  contactoEmergenciaTelefono: z.string().trim().optional(),
  contactoEmergenciaParentesco: z.string().trim().optional(),
  consentimiento: z.boolean().refine((value) => value, "Debes registrar el consentimiento informado"),
});

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