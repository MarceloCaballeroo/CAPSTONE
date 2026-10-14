"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, type NombreIcono } from "@/components/common/Icono";

export function DashboardNav() {
  const pathname = usePathname();
  const enlaces: { href: string; nombre: string; detalle: string; icono: NombreIcono; activo: boolean }[] = [
    { href: "/dashboard", nombre: "Resumen", detalle: "Tu jornada de hoy", icono: "inicio", activo: pathname === "/dashboard" },
    { href: "/patients", nombre: "Pacientes", detalle: "Fichas y riesgo", icono: "pacientes", activo: pathname.startsWith("/patients") },
    { href: "/agenda", nombre: "Agenda", detalle: "Citas de la semana", icono: "agenda", activo: pathname.startsWith("/agenda") },
    { href: "/configuracion", nombre: "Configuración", detalle: "Cuenta y organización", icono: "ajustes", activo: pathname.startsWith("/configuracion") },
  ];

  return (
    <nav aria-label="Navegación principal" className="flex min-w-0 gap-1 overflow-x-auto p-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:p-3">
      {enlaces.map((enlace) => (
        <Link key={enlace.href} aria-current={enlace.activo ? "page" : undefined}
          className={`${enlace.href === "/configuracion" ? "lg:mt-4 " : ""}flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors lg:border-b-0 lg:border-l-4 ${enlace.activo ? "border-teal-400 bg-slate-800 font-semibold text-teal-300 lg:pl-2.5" : "border-transparent text-slate-300 hover:bg-slate-800 hover:text-white"}`}
          href={enlace.href}>
          <Icono nombre={enlace.icono} />
          <span>
            {enlace.nombre}
            <span className="hidden text-xs font-normal text-slate-400 lg:block">{enlace.detalle}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
