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
    corrigeHallazgoId: formData.get("corrigeHallazgoId") || undefined,
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

  if (parsed.data.corrigeHallazgoId) {
    const { data: hallazgoAnterior, error: errorHallazgoAnterior } = await supabase.from("hallazgo_clinico")
      .select("id")
      .eq("id", parsed.data.corrigeHallazgoId)
      .eq("atencion_id", parsed.data.atencionId)
      .maybeSingle();
    if (errorHallazgoAnterior || !hallazgoAnterior) {
      return { error: "La marca a corregir no pertenece a la atención seleccionada.", seleccionId };
    }
  }

  const { data: hallazgo, error } = await supabase.from("hallazgo_clinico").insert({
    atencion_id: parsed.data.atencionId,
    corrige_hallazgo_id: parsed.data.corrigeHallazgoId ?? null,
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
  }).select("id, atencion_id, corrige_hallazgo_id, lado_pie, coordenada_x, coordenada_y, coordenada_z, normal_x, normal_y, normal_z, modelo_version, afeccion, intensidad_dolor, created_at").single();

  if (error || !hallazgo) {
    if (error) {
      console.error("No se pudo insertar hallazgo clínico", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    const mensaje = error?.code === "23505"
      ? "Esta marca ya tiene una corrección. Actualiza la ficha y corrige la marca vigente."
      : error?.code === "23503"
        ? "La marca a corregir no pertenece a la misma atención. Actualiza la ficha y vuelve a intentarlo."
        : error?.code === "PGRST204" || error?.code === "42703"
          ? "Supabase aún no reconoce el vínculo de corrección. Recarga la ficha e intenta nuevamente."
          : error?.code === "42501"
            ? "No tienes permiso para guardar esta corrección en la ficha seleccionada."
            : "No se pudo guardar el hallazgo. Actualiza la página e inténtalo nuevamente.";
    return { error: mensaje, seleccionId };
  }

  revalidatePath(`/patients/${parsed.data.pacienteId}`);
  return { hallazgo: hallazgo as HallazgoClinico, seleccionId: parsed.data.seleccionId };
}