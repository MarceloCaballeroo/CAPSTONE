"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { convertirFechaHoraChileAISO } from "@/lib/agenda";
import type { FormState } from "@/lib/types/auth";
import { actualizarEstadoCitaSchema, crearCitaSchema } from "@/lib/validations/agenda";

export async function crearCitaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = crearCitaSchema.safeParse({
    pacienteId: formData.get("pacienteId"),
    fechaHora: formData.get("fechaHora"),
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la cita" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  const fechaHoraISO = convertirFechaHoraChileAISO(parsed.data.fechaHora);
  if (Date.parse(fechaHoraISO) < Date.now()) return { error: "La cita debe quedar en el presente o en el futuro." };

  const { data: cita, error } = await supabase.from("cita").insert({
    paciente_id: parsed.data.pacienteId,
    usuario_id: user.id,
    fecha_hora: fechaHoraISO,
    estado: "agendada",
    motivo_consulta: parsed.data.motivo || null,
  }).select("id").single();

  if (error || !cita) return { error: "No pudimos guardar la cita. Verifica el paciente y vuelve a intentarlo." };

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect(`/agenda?fecha=${parsed.data.fechaHora.slice(0, 10)}&cita=${cita.id}`);
}

export async function actualizarEstadoCitaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = actualizarEstadoCitaSchema.safeParse({
    citaId: formData.get("citaId"),
    estado: formData.get("estado"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el estado de la cita" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  const { data: cita, error } = await supabase.from("cita").update({ estado: parsed.data.estado })
    .eq("id", parsed.data.citaId).select("id").maybeSingle();
  if (error || !cita) return { error: "No pudimos actualizar la cita. Recarga la agenda e inténtalo nuevamente." };

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { success: true };
}