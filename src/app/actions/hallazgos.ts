"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MODELO_PIE_VERSION, type EstadoGuardarHallazgo, type HallazgoClinico } from "@/lib/types/hallazgos";
import { hallazgoClinicoSchema } from "@/lib/validations/hallazgos";

export async function guardarHallazgoClinicoAction(_previo: EstadoGuardarHallazgo, formData: FormData): Promise<EstadoGuardarHallazgo> {
  const seleccionId = String(formData.get("seleccionId") ?? "");
  const parsed = hallazgoClinicoSchema.safeParse({
    seleccionId,
    pacienteId: formData.get("pacienteId"),
    atencionId: formData.get("atencionId"),
    ladoPie: formData.get("ladoPie"),
    x: formData.get("x"),
    y: formData.get("y"),
    z: formData.get("z"),
    normalX: formData.get("normalX"),
    normalY: formData.get("normalY"),
    normalZ: formData.get("normalZ"),
    afeccion: formData.get("afeccion"),
    intensidadDolor: formData.get("intensidadDolor"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el hallazgo", seleccionId };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente.", seleccionId };

  const { data: atencion, error: errorAtencion } = await supabase.from("atencion")
    .select("id, ficha_clinica!inner(paciente_id)")
    .eq("id", parsed.data.atencionId)
    .eq("ficha_clinica.paciente_id", parsed.data.pacienteId)
    .maybeSingle();
  if (errorAtencion || !atencion) return { error: "La atención seleccionada no corresponde a esta ficha.", seleccionId };

  const { data: hallazgo, error } = await supabase.from("hallazgo_clinico").insert({
    atencion_id: parsed.data.atencionId,
    lado_pie: parsed.data.ladoPie,
    coordenada_x: parsed.data.x,
    coordenada_y: parsed.data.y,
    coordenada_z: parsed.data.z,
    normal_x: parsed.data.normalX,
    normal_y: parsed.data.normalY,
    normal_z: parsed.data.normalZ,
    modelo_version: MODELO_PIE_VERSION,
    afeccion: parsed.data.afeccion,
    intensidad_dolor: parsed.data.intensidadDolor,
    creado_por: user.id,
  }).select("id, atencion_id, lado_pie, coordenada_x, coordenada_y, coordenada_z, normal_x, normal_y, normal_z, modelo_version, afeccion, intensidad_dolor, created_at").single();

  if (error || !hallazgo) return { error: "No se pudo guardar el hallazgo. Actualiza la página e inténtalo nuevamente.", seleccionId };

  revalidatePath(`/patients/${parsed.data.pacienteId}`);
  return { hallazgo: hallazgo as HallazgoClinico, seleccionId: parsed.data.seleccionId };
}