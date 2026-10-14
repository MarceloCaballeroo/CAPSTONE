import { GRUPOS_IWGDF, type NivelRiesgo } from "@/lib/clinical-rules";

export const estilosRiesgo: Record<NivelRiesgo, { badge: string; barra: string }> = {
  muy_bajo: { badge: "border-emerald-200 bg-emerald-50 text-emerald-800", barra: "bg-emerald-600" },
  bajo: { badge: "border-teal-200 bg-teal-50 text-teal-800", barra: "bg-teal-600" },
  moderado: { badge: "border-amber-200 bg-amber-50 text-amber-800", barra: "bg-amber-500" },
  alto: { badge: "border-red-200 bg-red-50 text-red-800", barra: "bg-red-600" },
};

export function etiquetaRiesgo(nivel: NivelRiesgo): string {
  return `Grupo ${GRUPOS_IWGDF[nivel].grupo} · ${GRUPOS_IWGDF[nivel].nombre}`;
}

export function RiesgoBadge({ nivel, escala = false, corto = false }: { nivel?: NivelRiesgo | null; escala?: boolean; corto?: boolean }) {
  if (!nivel) {
    return corto ? null : <span className="inline-flex w-fit whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">Sin evaluación</span>;
  }
  const { badge, barra } = estilosRiesgo[nivel];
  if (corto) return <span title={etiquetaRiesgo(nivel)} className={`shrink-0 rounded border px-1 text-[10px] font-bold ${badge}`}>G{GRUPOS_IWGDF[nivel].grupo}</span>;

  return (
    <span className="inline-flex flex-col gap-1.5">
      <span className={`inline-flex w-fit whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-semibold ${badge}`}>{etiquetaRiesgo(nivel)}</span>
      {escala && (
        <span aria-hidden="true" className="flex w-28 gap-0.5">
          {[0, 1, 2, 3].map((paso) => <span key={paso} className={`h-1.5 flex-1 rounded-sm ${paso <= GRUPOS_IWGDF[nivel].grupo ? barra : "bg-slate-200"}`} />)}
        </span>
      )}
    </span>
  );
}
