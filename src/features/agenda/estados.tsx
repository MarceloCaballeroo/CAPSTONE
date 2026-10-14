export const estadosCita = ["agendada", "confirmada", "en_espera", "atendida", "cancelada", "no_asiste"] as const;
export type EstadoCita = (typeof estadosCita)[number];

// nombre: etiqueta corta; accion: texto del botón para cambiar a ese estado.
export const estadoInfo: Record<EstadoCita, { nombre: string; accion: string; estilo: string; punto: string }> = {
  agendada: { nombre: "Agendada", accion: "Agendada", estilo: "border-sky-200 bg-sky-50 text-sky-900", punto: "bg-sky-500" },
  confirmada: { nombre: "Confirmada", accion: "Confirmó asistencia", estilo: "border-teal-200 bg-teal-50 text-teal-900", punto: "bg-teal-600" },
  en_espera: { nombre: "En espera", accion: "Llegó · en espera", estilo: "border-amber-200 bg-amber-50 text-amber-900", punto: "bg-amber-500" },
  atendida: { nombre: "Atendida", accion: "Atendida", estilo: "border-emerald-200 bg-emerald-50 text-emerald-900", punto: "bg-emerald-600" },
  cancelada: { nombre: "Cancelada", accion: "Cancelada", estilo: "border-slate-200 bg-slate-100 text-slate-600", punto: "bg-slate-400" },
  no_asiste: { nombre: "No asistió", accion: "No asistió", estilo: "border-red-200 bg-red-50 text-red-900", punto: "bg-red-500" },
};

export function infoEstado(estado: string) {
  return estadoInfo[estado as EstadoCita] ?? estadoInfo.agendada;
}

export function EstadoChip({ estado }: { estado: string }) {
  const info = infoEstado(estado);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${info.estilo}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${info.punto}`} />{info.nombre}
    </span>
  );
}
