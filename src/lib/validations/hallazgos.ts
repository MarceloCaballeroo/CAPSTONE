import { z } from "zod";

const coordenada = z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-100).max(100));
const normal = z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-1.000001).max(1.000001));

const hallazgoClinicoBaseSchema = z.object({
  pacienteId: z.uuid("Ficha de paciente no válida"),
  atencionId: z.uuid("Selecciona una atención"),
  ladoPie: z.enum(["izquierdo", "derecho"]),
  x: coordenada,
  y: coordenada,
  z: coordenada,
  normalX: normal,
  normalY: normal,
  normalZ: normal,
  afeccion: z.string().trim().min(1, "Describe la afección").max(120, "Máximo 120 caracteres"),
  intensidadDolor: z.string().regex(/^(?:[0-9]|10)$/, "El dolor debe estar entre 0 y 10").transform(Number),
});

export const hallazgoClinicoSchema = hallazgoClinicoBaseSchema.extend({
  seleccionId: z.uuid("Punto seleccionado no válido"),
  corrigeHallazgoId: z.uuid("Marca a corregir no válida").optional(),
}).refine((hallazgo) => Math.abs(Math.hypot(hallazgo.normalX, hallazgo.normalY, hallazgo.normalZ) - 1) < 0.001, {
  message: "La normal de superficie no es válida",
  path: ["normalX"],
});

export type HallazgoClinicoInput = z.infer<typeof hallazgoClinicoSchema>;
