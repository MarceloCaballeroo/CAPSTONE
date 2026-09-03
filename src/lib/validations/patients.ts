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

export function formatearRut(rut: string): string {
  const limpio = rut.replace(/[.\-\s]/g, "").toUpperCase();
  return limpio.length > 1 ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}` : limpio;
}