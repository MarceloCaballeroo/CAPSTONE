import { z } from "zod";
import type { ResultadoEvaluacion } from "@/lib/clinical-rules";
import type { FormState } from "@/lib/types/auth";

export const atencionSchema = z.object({
  pacienteId: z.uuid("Paciente no válido"),
  diagnosticoCie10: z.string().trim().min(1, "Selecciona el diagnóstico CIE-10").max(10, "Código CIE-10 no válido"),
  // Los dos primeros son hallazgos normales (se marcan cuando la exploración está conservada).
  monofilamento: z.boolean(),
  pulsos: z.boolean(),
  deformidad: z.boolean(),
  antecedentesUlcera: z.boolean(),
  signosInfeccion: z.boolean(),
  dolorIsquemico: z.boolean(),
  procedimientoInvasivo: z.boolean().default(false),
  // Se exige en la acción solo cuando la evaluación genera una derivación.
  especialidadDestino: z.string().trim().optional(),
  observaciones: z.string().trim().max(2000, "Máximo 2000 caracteres"),
});

export type AtencionInput = z.infer<typeof atencionSchema>;

// La acción devuelve, además del estado del formulario, la evaluación calculada en el servidor.
export type EstadoAtencion = FormState & { evaluacion?: ResultadoEvaluacion };
