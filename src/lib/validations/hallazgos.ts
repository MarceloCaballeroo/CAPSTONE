import { z } from "zod";
import { MODELO_PIE_VERSION } from "@/lib/types/hallazgos";
import { MODELO_UNAS_VERSION, ubicarParteUna } from "@/lib/types/unas";

const coordenada = z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-100).max(100));
const normal = z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-1.000001).max(1.000001));

const hallazgoClinicoBaseSchema = z.object({
  pacienteId: z.uuid("Ficha de paciente no válida"),
  atencionId: z.uuid("Selecciona una atención"),
  modeloVersion: z.enum([MODELO_PIE_VERSION, MODELO_UNAS_VERSION]).default(MODELO_PIE_VERSION),
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
}).refine((hallazgo) => hallazgo.modeloVersion !== MODELO_UNAS_VERSION
  || (hallazgo.z === 0 && hallazgo.normalZ === 1 && ubicarParteUna(hallazgo.ladoPie, hallazgo.x, hallazgo.y) !== null), {
  message: "La zona de la uña no es válida",
  path: ["x"],
});

export type HallazgoClinicoInput = z.infer<typeof hallazgoClinicoSchema>;
