import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (!tokenHash || !type) redirect("/login?error=enlace_invalido");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) redirect("/login?error=enlace_expirado");

  if (type === "signup") {
    const { data: existingUser } = await supabase.from("usuario").select("id").eq("id", data.user.id).maybeSingle();
    if (!existingUser) {
      const metadata = data.user.user_metadata as { nombre?: string; plan?: string; nombreOrganizacion?: string };
      await supabase.rpc("crear_organizacion_inicial", {
        nombre_organizacion: metadata.nombreOrganizacion ?? "Mi consulta",
        nombre_usuario: metadata.nombre ?? "Profesional",
        plan: metadata.plan ?? "individual",
      });
    }
  }
  redirect(next);
}