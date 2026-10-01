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
  const iniciales = nombreUsuario.split(/\s+/).filter(Boolean).slice(0, 2).map((parte: string) => parte[0]).join("").toUpperCase() || "US";
  const fechaActual = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased lg:flex-row">
      <aside className="sticky top-0 z-30 flex w-full shrink-0 flex-col border-b border-slate-800 bg-slate-900 text-slate-300 lg:h-dvh lg:min-h-dvh lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-16 shrink-0 items-center border-b border-slate-800 bg-slate-950/40 px-5">
            <div aria-hidden="true" className="mr-3 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-500/20 bg-teal-950/40 font-semibold text-teal-300">P</div>
            <div>
              <span className="block text-sm font-semibold tracking-[0.16em] text-white">PODOCARE</span>
              <span className="text-xs text-teal-400">Espacio clínico</span>
            </div>
          </div>
          <div className="hidden border-b border-slate-800/70 px-5 py-3 lg:block">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Organización activa</p>
            <p className="truncate text-xs font-medium text-slate-200" title={nombreOrganizacion}>{nombreOrganizacion}</p>
            <p className="mt-1 text-[10px] text-teal-300">{nombrePlan}</p>
          </div>
          <DashboardNav />
        </div>
        <div className="hidden shrink-0 border-t border-slate-800 bg-slate-950/50 p-4 lg:block">
          <form action={cerrarSesionAction}>
            <button className="mb-3 w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-300 hover:border-white/25 hover:text-white" type="submit">Cerrar sesión</button>
          </form>
          <p className="text-xs text-slate-400">Acceso clínico protegido</p>
          <p className="mt-1 text-[10px] text-slate-500">Cumplimiento Ley N.º 19.628</p>
        </div>
        <form className="shrink-0 px-3 pb-3 lg:hidden" action={cerrarSesionAction}>
          <button className="rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white" type="submit">Cerrar sesión</button>
        </form>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:px-3">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-teal-600" />
              <span className="truncate text-xs font-medium text-slate-700 sm:text-sm" title={nombreOrganizacion}>{nombreOrganizacion}</span>
            </div>
            <div className="hidden shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium capitalize text-slate-600 md:block">{fechaActual}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2 border-l border-slate-200 pl-3 sm:gap-3 sm:pl-4">
            <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-teal-50 text-xs font-semibold text-teal-800 ring-2 ring-teal-100">{iniciales}</div>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-44 truncate text-sm font-semibold text-slate-900">{nombreUsuario}</p>
              <p className="text-[11px] capitalize text-slate-500">{perfil?.rol || "Profesional"}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 md:py-7 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}