"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types/auth";
import { actualizarEstadoDerivacionSchema } from "@/lib/validations/derivaciones";

type ErrorSupabase = { message: string; code?: string; details?: string; hint?: string };

// Devuelve el error tal cual lo entrega Postgres (mensaje, SQLSTATE, detalle y sugerencia) para poder diagnosticar.
function describirError(error: ErrorSupabase): string {
  return [error.message, error.code && `SQLSTATE ${error.code}`, error.details, error.hint].filter(Boolean).join(" · ");
}

export async function actualizarEstadoDerivacionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = actualizarEstadoDerivacionSchema.safeParse({
    derivacionId: formData.get("derivacionId"),
    pacienteId: formData.get("pacienteId"),
    estado: formData.get("estado"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el estado de la derivación." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  const { data: derivacion, error } = await supabase.from("derivacion").update({ estado: parsed.data.estado })
    .eq("id", parsed.data.derivacionId).select("id").maybeSingle();
  if (error) return { error: `No pudimos actualizar la derivación: ${describirError(error)}` };
  if (!derivacion) return { error: "No encontramos la derivación o no tienes permiso para actualizarla. Recarga la ficha e inténtalo nuevamente." };

  revalidatePath(`/patients/${parsed.data.pacienteId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
