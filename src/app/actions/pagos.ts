"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { montoClp } from "@/lib/planes";
import { crearTransaccion, type TransaccionCreada } from "@/lib/webpay";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://podocare-six.vercel.app";
const planSchema = z.object({ plan: z.enum(["individual", "clinica"], "Plan no válido.") });

type ErrorSupabase = { message: string; code?: string; details?: string; hint?: string };

function describirError(error: ErrorSupabase): string {
  return [error.message, error.code && `SQLSTATE ${error.code}`, error.details, error.hint].filter(Boolean).join(" · ");
}

export type EstadoPago = { error?: string; url?: string; token?: string };

export async function crearPagoAction(_prev: EstadoPago, formData: FormData): Promise<EstadoPago> {
  const parsed = planSchema.safeParse({ plan: formData.get("plan") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Plan no válido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  const { data: perfil, error: errorPerfil } = await supabase.from("usuario")
    .select("rol, activo, organizacion_id")
    .eq("id", user.id)
    .maybeSingle();
  if (errorPerfil) return { error: `No pudimos leer tu perfil: ${describirError(errorPerfil)}` };
  if (!perfil?.organizacion_id) return { error: "Tu cuenta no tiene una organización asociada." };
  if (perfil.rol !== "admin" || !perfil.activo) return { error: "Solo un administrador activo puede pagar la suscripción." };

  // El plan clínica cobra por podólogo activo; el monto se calcula siempre en el servidor.
  const { count, error: errorConteo } = await supabase.from("usuario")
    .select("id", { count: "exact", head: true })
    .eq("organizacion_id", perfil.organizacion_id)
    .eq("activo", true);
  if (errorConteo) return { error: `No pudimos contar al equipo: ${describirError(errorConteo)}` };

  const profesionales = Math.max(1, count ?? 1);
  if (parsed.data.plan === "individual" && profesionales > 1) {
    return { error: `Tu organización tiene ${profesionales} profesionales activos: corresponde el plan Clínica.` };
  }
  const monto = montoClp(parsed.data.plan, profesionales);
  // buy_order: único y de máximo 26 caracteres (límite de Webpay).
  const buyOrder = `PDC${perfil.organizacion_id.slice(0, 8)}${Date.now().toString(36)}`;
  const sessionId = crypto.randomUUID();

  // Se crea la transacción antes de insertar: así el token queda guardado en la misma fila
  // y no hace falta un UPDATE que RLS no permite.
  let transaccion: TransaccionCreada;
  try {
    transaccion = await crearTransaccion({
      buyOrder,
      sessionId,
      monto,
      returnUrl: `${siteUrl}/api/webpay/retorno`,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos iniciar el pago en Webpay." };
  }

  const { error: errorPago } = await supabase.from("pago").insert({
    organizacion_id: perfil.organizacion_id,
    buy_order: buyOrder,
    token: transaccion.token,
    monto_clp: monto,
    plan: parsed.data.plan,
    profesionales,
    estado: "pendiente",
  });
  if (errorPago) return { error: `No pudimos registrar el pago: ${describirError(errorPago)}` };

  return { url: transaccion.url, token: transaccion.token };
}
