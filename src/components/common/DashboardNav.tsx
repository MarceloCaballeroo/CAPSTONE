"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardNav() {
  const pathname = usePathname();
  const enlaces = [
    { href: "/dashboard", nombre: "Resumen", activo: pathname === "/dashboard" },
    { href: "/patients", nombre: "Pacientes", activo: pathname.startsWith("/patients") },
    { href: "/agenda", nombre: "Agenda", activo: pathname.startsWith("/agenda") },
  ];

  return (
    <nav aria-label="Navegación principal" className="flex min-w-0 gap-1 overflow-x-auto p-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:p-3">
      {enlaces.map((enlace) => (
        <Link key={enlace.href} aria-current={enlace.activo ? "page" : undefined}
          className={`shrink-0 whitespace-nowrap rounded-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors lg:border-b-0 lg:border-l-4 ${enlace.activo ? "border-teal-400 bg-slate-800 font-semibold text-teal-300 lg:pl-2.5" : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          href={enlace.href}>
          {enlace.nombre}
        </Link>
      ))}
    </nav>
  );
}