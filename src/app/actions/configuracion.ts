"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types/auth";
import { actualizarPasswordSchema } from "@/lib/validations/auth";
import { invitacionSchema, miembroSchema, organizacionSchema, perfilSchema } from "@/lib/validations/configuracion";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://podocare-six.vercel.app";
const sesionExpirada: FormState = { error: "Tu sesión expiró. Inicia sesión nuevamente." };

export async function actualizarPerfilAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = perfilSchema.safeParse({ nombre: formData.get("nombre"), email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa tus datos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return sesionExpirada;

  const { error } = await supabase.from("usuario").update({ nombre: parsed.data.nombre, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) return { error: "No pudimos guardar tu nombre. Inténtalo nuevamente." };

  if (parsed.data.email !== user.email) {
    const { error: errorCorreo } = await supabase.auth.updateUser({ email: parsed.data.email }, { emailRedirectTo: `${siteUrl}/auth/confirm?next=/configuracion` });
    if (errorCorreo) return { error: "Guardamos tu nombre, pero no pudimos cambiar el correo. Puede que ya esté en uso." };
    revalidatePath("/", "layout");
    return { success: true, mensaje: "Te enviamos un enlace al nuevo correo para confirmarlo." };
  }

  revalidatePath("/", "layout");
  return { success: true, mensaje: "Perfil actualizado." };
}

export async function cambiarPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = actualizarPasswordSchema.safeParse({ password: formData.get("password"), confirmarPassword: formData.get("confirmarPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa la contraseña" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return sesionExpirada;

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.code === "same_password" ? "La nueva contraseña debe ser distinta de la actual." : "No pudimos actualizar tu contraseña. Inténtalo nuevamente." };
  return { success: true, mensaje: "Contraseña actualizada." };
}

export async function cerrarTodasLasSesionesAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function actualizarOrganizacionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = organizacionSchema.safeParse({
    nombre: formData.get("nombre"),
    jornadaInicio: formData.get("jornadaInicio"),
    jornadaFin: formData.get("jornadaFin"),
    duracion: formData.get("duracion"),
    dias: formData.getAll("dias"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la organización" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return sesionExpirada;

  const { error } = await supabase.rpc("admin_actualizar_organizacion", {
    nuevo_nombre: parsed.data.nombre,
    inicio: parsed.data.jornadaInicio,
    fin: parsed.data.jornadaFin,
    duracion: parsed.data.duracion,
    dias: [...new Set(parsed.data.dias)].sort(),
  });
  if (error) return { error: "No pudimos guardar los cambios. Solo un administrador activo puede modificar la organización." };

  revalidatePath("/", "layout");
  return { success: true, mensaje: "Cambios guardados." };
}

export async function actualizarMiembroAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = miembroSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    rol: formData.get("rol") ?? undefined,
    activo: formData.get("activo") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return sesionExpirada;

  const { error } = await supabase.rpc("admin_actualizar_usuario", {
    objetivo: parsed.data.usuarioId,
    nuevo_rol: parsed.data.rol ?? null,
    nuevo_activo: parsed.data.activo ?? null,
  });
  if (error) return { error: "No pudimos actualizar a este profesional. Recarga la página e inténtalo nuevamente." };

  revalidatePath("/configuracion");
  return { success: true };
}

export async function invitarProfesionalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = invitacionSchema.safeParse({ nombre: formData.get("nombre"), email: formData.get("email"), rol: formData.get("rol") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la invitación" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return sesionExpirada;

  // Verificar que quien invita es admin activo en plan clínica antes de usar la clave de servicio.
  const { data: perfil } = await supabase.from("usuario").select("rol, activo, organizacion:organizacion_id(plan_tipo)").eq("id", user.id).maybeSingle();
  const plan = (perfil?.organizacion as { plan_tipo?: string } | null)?.plan_tipo;
  if (perfil?.rol !== "admin" || !perfil.activo) return { error: "Solo un administrador activo puede invitar profesionales." };
  if (plan !== "clinica") return { error: "El plan individual no permite agregar profesionales." };

  const admin = createAdminClient();
  if (!admin) return { error: "Las invitaciones no están configuradas en el servidor (falta SUPABASE_SERVICE_ROLE_KEY)." };

  const { data: invitado, error: errorInvitacion } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/update-password`,
    data: { nombre: parsed.data.nombre },
  });
  if (errorInvitacion || !invitado.user) {
    return { error: errorInvitacion?.code === "email_exists" ? "Ese correo ya tiene una cuenta en PodoCare." : "No pudimos enviar la invitación. Revisa el correo e inténtalo nuevamente." };
  }

  // La asociación a la organización la hace la función existente con la sesión del admin (respeta sus reglas).
  const { error: errorAsociacion } = await supabase.rpc("invitar_a_organizacion", {
    usuario_invitado: invitado.user.id,
    nombre_usuario: parsed.data.nombre,
    rol_asignado: parsed.data.rol,
  });
  if (errorAsociacion) {
    await admin.auth.admin.deleteUser(invitado.user.id); // la cuenta recién creada quedaría huérfana sin organización
    return { error: "No pudimos agregar al profesional a tu organización. Inténtalo nuevamente." };
  }

  revalidatePath("/configuracion");
  return { success: true, mensaje: `Invitación enviada a ${parsed.data.email}.` };
}
