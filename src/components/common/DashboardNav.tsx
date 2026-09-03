"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardNav() {
  const pathname = usePathname();
  const resumenActivo = pathname === "/dashboard";
  const pacientesActivo = pathname.startsWith("/patients");

  return (
    <nav className="mt-8 grid gap-3 text-sm text-slate-300">
      <Link className={resumenActivo ? "rounded-lg bg-white/10 px-3 py-2 text-white" : "px-3 py-2 hover:text-white"} href="/dashboard">Resumen</Link>
      <Link className={pacientesActivo ? "rounded-lg bg-white/10 px-3 py-2 text-white" : "px-3 py-2 hover:text-white"} href="/patients">Pacientes</Link>
      <span className="px-3 py-2 text-slate-500" aria-disabled="true">Agenda</span>
    </nav>
  );
}