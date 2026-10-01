import { z } from "zod";

const fechaHoraSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Selecciona una fecha y hora válidas").refine((value) => {
  const fecha = new Date(`${value}:00Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 16) === value;
}, "Selecciona una fecha y hora válidas");

export const crearCitaSchema = z.object({
  pacienteId: z.uuid("Selecciona un paciente"),
  fechaHora: fechaHoraSchema,
  motivo: z.string().trim().max(300, "El motivo no puede superar los 300 caracteres"),
});

export const actualizarEstadoCitaSchema = z.object({
  citaId: z.uuid("Cita no válida"),
  estado: z.enum(["agendada", "confirmada", "en_espera", "atendida", "cancelada", "no_asiste"]),
});