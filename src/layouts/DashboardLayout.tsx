import type { PropsWithChildren } from "react";
import { cerrarSesionAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/common/DashboardNav";

export async function DashboardLayout({ children }: PropsWithChildren) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = user ? await supabase.from("usuario").select("nombre, rol, organizacion_id").eq("id", user.id).maybeSingle() : { data: null };
  const { data: organizacion } = perfil?.organizacion_id ? await supabase.from("organizacion").select("nombre, plan_tipo").eq("id", perfil.organizacion_id).maybeSingle() : { data: null };
  const nombreUsuario = perfil?.nombre || user?.user_metadata?.nombre || user?.email || "Usuario";
  const planTipo = organizacion?.plan_tipo || user?.user_metadata?.plan;
  const nombrePlan = planTipo === "clinica" ? "Plan clínica" : "Plan individual";
  const nombreOrganizacion = organizacion?.nombre || user?.user_metadata?.nombreOrganizacion || "Organización no asociada";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-6 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl bg-slate-900 p-5 text-white">
          <p className="text-sm font-semibold tracking-wide text-teal-300">PODOCARE</p>
          <div className="mt-8 border-y border-white/10 py-5">
            <p className="truncate font-medium text-white">{nombreUsuario}</p>
            <p className="mt-1 text-xs capitalize text-slate-400">{perfil?.rol || "Profesional"}</p>
            <p className="mt-3 text-xs text-teal-200">{nombrePlan}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{nombreOrganizacion}</p>
          </div>
          <DashboardNav />
          <form className="mt-8" action={cerrarSesionAction}>
            <button className="w-full rounded-lg border border-white/15 px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:border-red-300/60 hover:text-white" type="submit">Cerrar sesión</button>
          </form>
        </aside>
        <div>{children}</div>
      </div>
    </main>
  );
}