import { NextResponse, type NextRequest } from "next/server";
import { enviarCorreo } from "@/lib/email";
import { DIAS_GRACIA, hoyChile, sumarDias } from "@/lib/suscripcion";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron diario: avisa a los admin desde el día de vencimiento hasta el último de gracia.
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const hoy = hoyChile();
  const { data: vencidas, error } = await admin.from("organizacion")
    .select("id, nombre, suscripcion_hasta")
    .lte("suscripcion_hasta", hoy)
    .gte("suscripcion_hasta", sumarDias(hoy, -DIAS_GRACIA))
    .or(`ultimo_aviso.is.null,ultimo_aviso.lt.${hoy}`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let enviados = 0;
  const errores: string[] = [];

  for (const organizacion of vencidas ?? []) {
    try {
      const { data: admins } = await admin.from("usuario")
        .select("id")
        .eq("organizacion_id", organizacion.id)
        .eq("rol", "admin")
        .eq("activo", true);
      if (!admins?.length) continue;

      const dias = Math.round((Date.parse(hoy) - Date.parse(organizacion.suscripcion_hasta)) / 86_400_000);
      const restantes = DIAS_GRACIA - dias;
      const asunto = dias === 0
        ? `La suscripción de ${organizacion.nombre} vence hoy`
        : `La suscripción de ${organizacion.nombre} está vencida`;
      const texto = [
        "Hola:",
        "",
        dias === 0
          ? `La suscripción de ${organizacion.nombre} vence hoy. Después de ${DIAS_GRACIA} días de gracia se bloquea el acceso.`
          : `La suscripción de ${organizacion.nombre} venció el ${organizacion.suscripcion_hasta}. Quedan ${restantes} ${restantes === 1 ? "día" : "días"} de acceso antes del bloqueo.`,
        "",
        "Para renovar, entra a Configuración → Organización y plan y paga con Webpay.",
        "",
        "PodoCare",
      ].join("\n");

      let alguno = false;
      for (const persona of admins) {
        const { data: cuenta } = await admin.auth.admin.getUserById(persona.id);
        const email = cuenta?.user?.email;
        if (!email) continue;
        await enviarCorreo({ para: email, asunto, texto });
        alguno = true;
      }
      if (alguno) {
        await admin.from("organizacion").update({ ultimo_aviso: hoy }).eq("id", organizacion.id);
        enviados += 1;
      }
    } catch (fallo) {
      errores.push(`${organizacion.nombre}: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
    }
  }

  return NextResponse.json({ ok: true, revisadas: vencidas?.length ?? 0, avisadas: enviados, errores });
}
