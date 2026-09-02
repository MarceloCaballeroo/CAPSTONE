import type { PropsWithChildren } from "react";

export function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-6 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl bg-slate-900 p-5 text-white">
          <p className="text-sm font-semibold tracking-wide text-teal-300">PODOCARE</p>
          <nav className="mt-8 grid gap-3 text-sm text-slate-300">
            <span className="rounded-lg bg-white/10 px-3 py-2 text-white">Resumen</span>
            <span className="px-3 py-2">Pacientes</span>
            <span className="px-3 py-2">Agenda</span>
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </main>
  );
}