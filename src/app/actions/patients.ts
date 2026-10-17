"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { descomponerRut, erroresPorCampo, pacienteSchema, type PacienteFormData } from "@/lib/validations/patients";

const DATOS_INVALIDOS = "Revisa los campos marcados.";
import type { FormState } from "@/lib/types/auth";

function obtenerDatos(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    apellidoPaterno: formData.get("apellidoPaterno"),
    apellidoMaterno: formData.get("apellidoMaterno") || undefined,
    rut: formData.get("rut"),
    fechaNacimiento: formData.get("fechaNacimiento") || "",
    sexoBiologico: formData.get("sexoBiologico") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    direccion: formData.get("direccion") || undefined,
    comunaId: formData.get("comunaId") || undefined,
    prevision: formData.get("prevision") || "",
    centroSaludOrigen: formData.get("centroSaludOrigen") || undefined,
    contactoEmergenciaNombre: formData.get("contactoEmergenciaNombre") || undefined,
    contactoEmergenciaTelefono: formData.get("contactoEmergenciaTelefono") || undefined,
    contactoEmergenciaParentesco: formData.get("contactoEmergenciaParentesco") || undefined,
    consentimiento: formData.get("consentimiento") === "on",
  };
}

async function obtenerOrganizacionId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase.from("usuario").select("organizacion_id").eq("id", userId).single();
  if (error) return { organizacionId: null, error: describirError(error) };
  return { organizacionId: data?.organizacion_id ?? null, error: null };
}

type ErrorSupabase = { message: string; code?: string; details?: string; hint?: string };

// Devuelve el error tal cual lo entrega Supabase (mensaje, código, detalle y sugerencia) para poder diagnosticar.
function describirError(error: ErrorSupabase): string {
  return [error.message, error.code && `código ${error.code}`, error.details, error.hint].filter(Boolean).join(" · ");
}

function traducirErrorPaciente(error: ErrorSupabase): string {
  const detalle = describirError(error);
  if (/duplicate|unique/i.test(error.message)) return `Ya existe un paciente con ese RUT. · ${detalle}`;
  return detalle;
}

function mapearDatosPaciente(data: PacienteFormData) {
  const { rut_numero, rut_dv } = descomponerRut(data.rut);
  return {
    nombre: data.nombre,
    apellido_paterno: data.apellidoPaterno,
    apellido_materno: data.apellidoMaterno || null,
    rut_numero,
    rut_dv,
    fecha_nacimiento: data.fechaNacimiento,
    sexo_biologico: data.sexoBiologico ?? "no_especificado",
    telefono: data.telefono || null,
    email: data.email || null,
    direccion: data.direccion || null,
    comuna_id: data.comunaId ?? null,
    prevision: data.prevision,
    centro_salud_origen: data.centroSaludOrigen || null,
  };
}

// El contacto de emergencia vive en su propia tabla (contacto_emergencia), no en columnas de paciente.
function mapearContactoEmergencia(data: PacienteFormData) {
  if (!data.contactoEmergenciaNombre && !data.contactoEmergenciaTelefono && !data.contactoEmergenciaParentesco) return null;
  return {
    nombre: data.contactoEmergenciaNombre ?? null,
    telefono: data.contactoEmergenciaTelefono ?? null,
    parentesco: data.contactoEmergenciaParentesco ?? null,
  };
}

// El formulario maneja un solo contacto: actualiza el existente o lo crea si aún no hay.
async function guardarContactoEmergencia(supabase: Awaited<ReturnType<typeof createClient>>, pacienteId: string, contacto: ReturnType<typeof mapearContactoEmergencia>) {
  if (!contacto) return null;
  const { data: existente } = await supabase.from("contacto_emergencia").select("id").eq("paciente_id", pacienteId).order("id").limit(1).maybeSingle();
  const { error } = existente
    ? await supabase.from("contacto_emergencia").update(contacto).eq("id", existente.id)
    : await supabase.from("contacto_emergencia").insert({ paciente_id: pacienteId, ...contacto });
  return error;
}

export async function crearPacienteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = pacienteSchema.safeParse(obtenerDatos(formData));
  if (!parsed.success) return { error: DATOS_INVALIDOS, errores: erroresPorCampo(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  const organizacion = await obtenerOrganizacionId(supabase, user.id);
  if (organizacion.error) return { error: `No pudimos leer tu organización: ${organizacion.error}` };
  if (!organizacion.organizacionId) return { error: "No encontramos la organización de tu cuenta." };

  const { data: paciente, error } = await supabase.from("paciente").insert({
    ...mapearDatosPaciente(parsed.data),
    consentimiento: true,
    fecha_consentimiento: new Date().toISOString(),
    organizacion_id: organizacion.organizacionId,
    activo: true,
  }).select("id").single();

  if (error || !paciente) return { error: error ? traducirErrorPaciente(error) : "No pudimos crear el paciente." };
  const { error: fichaError } = await supabase.from("ficha_clinica").insert({ paciente_id: paciente.id });
  if (fichaError) return { error: `El paciente se creó, pero falló la ficha clínica: ${describirError(fichaError)}` };
  const errorContacto = await guardarContactoEmergencia(supabase, paciente.id, mapearContactoEmergencia(parsed.data));
  if (errorContacto) return { error: `El paciente se creó, pero falló el contacto de emergencia: ${describirError(errorContacto)}` };
  revalidatePath("/patients");
  redirect(`/patients/${paciente.id}`);
}

export async function actualizarPacienteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pacienteId = String(formData.get("pacienteId") ?? "");
  if (!pacienteId) return { error: "Paciente no encontrado." };
  const parsed = pacienteSchema.safeParse(obtenerDatos(formData));
  if (!parsed.success) return { error: DATOS_INVALIDOS, errores: erroresPorCampo(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  const { error } = await supabase.from("paciente").update({
    ...mapearDatosPaciente(parsed.data),
  }).eq("id", pacienteId);

  if (error) return { error: traducirErrorPaciente(error) };
  const errorContacto = await guardarContactoEmergencia(supabase, pacienteId, mapearContactoEmergencia(parsed.data));
  if (errorContacto) return { error: `No pudimos guardar el contacto de emergencia: ${describirError(errorContacto)}` };
  revalidatePath(`/patients/${pacienteId}`);
  return { success: true };
}