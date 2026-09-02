"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actualizarPasswordSchema, loginSchema, recuperarSchema, registroSchema } from "@/lib/validations/auth";
import type { FormState } from "@/lib/types/auth";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "No fue posible iniciar sesión. Revisa tus credenciales." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function registroAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registroSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmarPassword: formData.get("confirmarPassword"),
    plan: formData.get("plan"),
    nombreOrganizacion: formData.get("nombreOrganizacion") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { nombre, email, password, plan, nombreOrganizacion } = parsed.data;
  const nombreOrg = plan === "clinica" ? nombreOrganizacion! : `${nombre} - Podología`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, plan, nombreOrganizacion: nombreOrg } },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) return { error: "Ya existe una cuenta con ese correo." };
    return { error: "No fue posible crear la cuenta. Intenta nuevamente." };
  }

  if (data.session) {
    const { error: rpcError } = await supabase.rpc("crear_organizacion_inicial", {
      nombre_organizacion: nombreOrg,
      nombre_usuario: nombre,
      plan,
    });
    if (rpcError) return { error: "Tu cuenta se creó, pero no pudimos configurar tu organización." };
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  redirect("/register/confirm");
}

export async function recuperarPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = recuperarSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/update-password`,
  });
  return { success: true };
}

export async function actualizarPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = actualizarPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmarPassword: formData.get("confirmarPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "No fue posible actualizar tu contraseña. Solicita un nuevo enlace." };
  redirect("/dashboard");
}

export async function cerrarSesionAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}