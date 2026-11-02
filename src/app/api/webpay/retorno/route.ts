import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmarTransaccion } from "@/lib/webpay";
import { siguienteVencimiento } from "@/lib/suscripcion";

export const runtime = "nodejs";

type DatosRetorno = { token?: string; abortado: boolean; orden?: string };

async function leerRetorno(request: NextRequest): Promise<DatosRetorno> {
  const params = request.nextUrl.searchParams;
  let token = params.get("token_ws") ?? undefined;
  let abortado = Boolean(params.get("TBK_TOKEN"));
  let orden = params.get("TBK_ORDEN_COMPRA") ?? undefined;

  if (request.method === "POST") {
    const formulario = await request.formData();
    const tokenPost = formulario.get("token_ws");
    if (typeof tokenPost === "string" && tokenPost) token = tokenPost;
    if (formulario.get("TBK_TOKEN")) abortado = true;
    const ordenPost = formulario.get("TBK_ORDEN_COMPRA");
    if (typeof ordenPost === "string" && ordenPost) orden = ordenPost;
  }
  return { token, abortado, orden };
}

function volver(request: NextRequest, resultado: string) {
  return NextResponse.redirect(new URL(`/configuracion?seccion=organizacion&pago=${resultado}`, request.url));
}

async function manejar(request: NextRequest) {
  const { token, abortado, orden } = await leerRetorno(request);

  const admin = createAdminClient();
  if (!admin) return volver(request, "error_config");

  if (abortado || !token) {
    if (orden) await admin.from("pago").update({ estado: "abortado" }).eq("buy_order", orden).eq("estado", "pendiente");
    return volver(request, "abortado");
  }

  const { data: pago, error: errorPago } = await admin.from("pago")
    .select("id, organizacion_id, buy_order, monto_clp, plan, estado")
    .eq("token", token)
    .maybeSingle();
  if (errorPago || !pago) return volver(request, "error_pago");
  if (pago.estado === "pagado") return volver(request, "ok");

  let confirmacion;
  try {
    confirmacion = await confirmarTransaccion(token);
  } catch {
    return volver(request, "error_webpay");
  }

  const aprobado = confirmacion.response_code === 0
    && confirmacion.status === "AUTHORIZED"
    && confirmacion.amount === pago.monto_clp
    && confirmacion.buy_order === pago.buy_order;

  if (!aprobado) {
    await admin.from("pago").update({ estado: "rechazado", autorizacion: confirmacion.authorization_code ?? null }).eq("id", pago.id);
    return volver(request, "rechazado");
  }

  // Primero la organización: si falla, el pago queda pendiente y el retorno se puede repetir.
  // ponytail: si dos pagos se confirman a la vez, ambos leen el mismo vencimiento y uno pisa al
  // otro (se pierde una extensión). Poco probable; se resuelve con un RPC atómico si molesta.
  const { data: actual } = await admin.from("organizacion")
    .select("suscripcion_hasta")
    .eq("id", pago.organizacion_id)
    .maybeSingle();
  const hasta = siguienteVencimiento(actual?.suscripcion_hasta);
  const { error: errorOrganizacion } = await admin.from("organizacion").update({
    plan_tipo: pago.plan,
    estado_suscripcion: "activo",
    suscripcion_hasta: hasta,
  }).eq("id", pago.organizacion_id);
  if (errorOrganizacion) return volver(request, "error_org");

  const { error: errorConfirmacion } = await admin.from("pago").update({
    estado: "pagado",
    autorizacion: confirmacion.authorization_code ?? null,
    fecha_pago: new Date().toISOString(),
  }).eq("id", pago.id).eq("estado", "pendiente");
  if (errorConfirmacion) return volver(request, "error_pago");

  return volver(request, "ok");
}

export async function GET(request: NextRequest) {
  return manejar(request);
}

export async function POST(request: NextRequest) {
  return manejar(request);
}
