import { z } from "zod";
import { ESTADOS_DERIVACION } from "@/lib/clinical-rules";

export const actualizarEstadoDerivacionSchema = z.object({
  derivacionId: z.uuid("Derivación no válida"),
  pacienteId: z.uuid("Paciente no válido"),
  estado: z.enum(ESTADOS_DERIVACION),
});
