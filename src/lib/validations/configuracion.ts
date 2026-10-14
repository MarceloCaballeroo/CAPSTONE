import { z } from "zod";

export const perfilSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa tu nombre completo").max(120, "El nombre es demasiado largo"),
  email: z.email("Ingresa un correo válido"),
});

const hora = z.coerce.number().int().min(0, "Hora no válida").max(24, "Hora no válida");

export const organizacionSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre de la consulta o centro").max(120, "El nombre es demasiado largo"),
  jornadaInicio: hora,
  jornadaFin: hora,
  duracion: z.coerce.number().int().min(10, "La cita debe durar al menos 10 minutos").max(240, "La cita no puede durar más de 4 horas"),
  dias: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Elige al menos un día de atención"),
}).refine((datos) => datos.jornadaFin > datos.jornadaInicio, { message: "La jornada debe terminar después de empezar", path: ["jornadaFin"] });

export const miembroSchema = z.object({
  usuarioId: z.uuid("Usuario no válido"),
  rol: z.enum(["admin", "clinico"]).optional(),
  activo: z.enum(["true", "false"]).transform((valor) => valor === "true").optional(),
});

export const invitacionSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre del profesional").max(120, "El nombre es demasiado largo"),
  email: z.email("Ingresa un correo válido"),
  rol: z.enum(["admin", "clinico"]),
});
