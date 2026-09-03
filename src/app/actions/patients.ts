"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatearRut, pacienteSchema } from "@/lib/validations/patients";
import type { FormState } from "@/lib/types/auth";

function obtenerDatos(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    apellidoPaterno: formData.get("apellidoPaterno"),
    apellidoMaterno: formData.get("apellidoMaterno") || undefined,
    rut: formData.get("rut"),
    fechaNacimiento: formData.get("fechaNacimiento") || undefined,
    sexoBiologico: formData.get("sexoBiologico") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    direccion: formData.get("direccion") || undefined,
    comuna: formData.get("comuna") || undefined,
    prevision: formData.get("prevision") || undefined,
    centroSaludOrigen: formData.get("centroSaludOrigen") || undefined,
    contactoEmergenciaNombre: formData.get("contactoEmergenciaNombre") || undefined,
    contactoEmergenciaTelefono: formData.get("contactoEmergenciaTelefono") || undefined,
    contactoEmergenciaParentesco: formData.get("contactoEmergenciaParentesco") || undefined,
    consentimiento: formData.get("consentimiento") === "on",
  };
}

async function obtenerOrganizacionId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase.from("usuario").select("organizacion_id").eq("id", userId).single();
  if (error || !data?.organizacion_id) return null;
  return data.organizacion_id;
}

function traducirErrorPaciente(message: string): string {
  if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) return "Ya existe un paciente con ese RUT.";
  return "No pudimos guardar los datos del paciente. Revisa la información e inténtalo nuevamente.";
}

export async function crearPacienteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = pacienteSchema.safeParse(obtenerDatos(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del paciente" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  const organizacionId = await obtenerOrganizacionId(supabase, user.id);
  if (!organizacionId) return { error: "No encontramos la organización de tu cuenta." };

  const { data: paciente, error } = await supabase.from("paciente").insert({
    nombre: parsed.data.nombre,
    apellido_paterno: parsed.data.apellidoPaterno,
    apellido_materno: parsed.data.apellidoMaterno || null,
    rut: formatearRut(parsed.data.rut),
    fecha_nacimiento: parsed.data.fechaNacimiento || null,
    sexo_biologico: parsed.data.sexoBiologico || null,
    telefono: parsed.data.telefono || null,
    email: parsed.data.email || null,
    direccion: parsed.data.direccion || null,
    comuna: parsed.data.comuna || null,
    prevision: parsed.data.prevision || null,
    centro_salud_origen: parsed.data.centroSaludOrigen || null,
    contacto_emergencia_nombre: parsed.data.contactoEmergenciaNombre || null,
    contacto_emergencia_telefono: parsed.data.contactoEmergenciaTelefono || null,
    contacto_emergencia_parentesco: parsed.data.contactoEmergenciaParentesco || null,
    consentimiento: true,
    fecha_consentimiento: new Date().toISOString(),
    organizacion_id: organizacionId,
  }).select("id").single();

  if (error || !paciente) return { error: traducirErrorPaciente(error?.message ?? "") };
  const { error: fichaError } = await supabase.from("ficha_clinica").insert({ paciente_id: paciente.id });
  if (fichaError) return { error: "El paciente se creó, pero no pudimos preparar su ficha clínica." };
  revalidatePath("/patients");
  redirect(`/patients/${paciente.id}`);
}

export async function actualizarPacienteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const parsed = pacienteSchema.safeParse(obtenerDatos(formData));
  if (!pacienteId || !parsed.success) return { error: parsed.success ? "Paciente no encontrado." : parsed.error.issues[0]?.message ?? "Revisa los datos del paciente" };

  const supabase = await createClient();
  const { error } = await supabase.from("paciente").update({
    nombre: parsed.data.nombre,
    apellido_paterno: parsed.data.apellidoPaterno,
    apellido_materno: parsed.data.apellidoMaterno || null,
    rut: formatearRut(parsed.data.rut),
    fecha_nacimiento: parsed.data.fechaNacimiento || null,
    sexo_biologico: parsed.data.sexoBiologico || null,
    telefono: parsed.data.telefono || null,
    email: parsed.data.email || null,
    direccion: parsed.data.direccion || null,
    comuna: parsed.data.comuna || null,
    prevision: parsed.data.prevision || null,
    centro_salud_origen: parsed.data.centroSaludOrigen || null,
    contacto_emergencia_nombre: parsed.data.contactoEmergenciaNombre || null,
    contacto_emergencia_telefono: parsed.data.contactoEmergenciaTelefono || null,
    contacto_emergencia_parentesco: parsed.data.contactoEmergenciaParentesco || null,
  }).eq("id", pacienteId);

  if (error) return { error: traducirErrorPaciente(error.message) };
  revalidatePath(`/patients/${pacienteId}`);
  return { success: true };
}