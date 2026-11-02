import "server-only";

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://podocare-six.vercel.app").replace(/\/+$/, "");
// El sello vive en un bucket público de Supabase: así Gmail lo carga sin depender
// de que el sitio esté desplegado y sin enviarlo adjunto (Brevo no soporta CID).
const SUPABASE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const LOGO = SUPABASE ? `${SUPABASE}/storage/v1/object/public/branding/podocare-sello.png` : `${SITIO}/podocare-sello.png`;

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Correo con la identidad de PodoCare: sello, barra teal y botón al plan.
// Tablas y estilos en línea porque los clientes de correo no cargan CSS externo.
function plantilla(asunto: string, texto: string): string {
  const parrafos = texto
    .split(/\n{2,}/)
    .map((parrafo) => parrafo.trim())
    .filter((parrafo) => parrafo && parrafo !== "PodoCare")
    .map((parrafo) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">${escapar(parrafo).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(asunto)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
<tr><td style="height:6px;background:#0f766e;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:28px 28px 4px;">
<img src="${LOGO}" width="76" height="76" alt="PodoCare" style="display:block;border:0;outline:none;text-decoration:none;">
<p style="margin:10px 0 0;font-size:12px;letter-spacing:.22em;color:#0f766e;font-weight:700;">PODOCARE</p>
</td></tr>
<tr><td style="padding:10px 32px 0;">
<h1 style="margin:0;font-size:21px;line-height:1.35;color:#0f172a;font-weight:700;">${escapar(asunto)}</h1>
</td></tr>
<tr><td style="padding:16px 32px 0;">${parrafos}</td></tr>
<tr><td align="center" style="padding:10px 32px 26px;">
<a href="${SITIO}/configuracion?seccion=organizacion" style="display:inline-block;background:#0f766e;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 26px;border-radius:9px;">Ver mi plan</a>
</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">Recibes este correo porque eres administrador de una organización en PodoCare. Es un aviso automático de la suscripción; no necesitas responder.</p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">PodoCare · Ficha clínica y riesgo de pie diabético</p>
</td></tr>
</table>
</body>
</html>`;
}

// Envío por Brevo (API HTTP, sin dependencias). Sin BREVO_API_KEY el correo
// se escribe en consola: sirve para probar el flujo sin cuenta.
export async function enviarCorreo({ para, asunto, texto }: { para: string; asunto: string; texto: string }): Promise<"enviado" | "consola"> {
  const llave = process.env.BREVO_API_KEY;
  const desde = process.env.EMAIL_FROM;
  if (!llave || !desde) {
    console.log(`[correo] ${asunto} → ${para}\n${texto}`);
    return "consola";
  }

  const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": llave, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: desde, name: "PodoCare" },
      to: [{ email: para }],
      subject: asunto,
      htmlContent: plantilla(asunto, texto),
      textContent: texto,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`Brevo: HTTP ${respuesta.status} · ${(await respuesta.text()).slice(0, 300)}`);
  }
  return "enviado";
}
