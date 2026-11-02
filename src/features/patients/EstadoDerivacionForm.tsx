"use client";

import { useActionState } from "react";
import { actualizarEstadoDerivacionAction } from "@/app/actions/derivaciones";
import { Alert } from "@/components/common/Alert";
import type { FormState } from "@/lib/types/auth";
import { ESTADOS_DERIVACION, type EstadoDerivacion } from "@/lib/clinical-rules";

const estadoInicial: FormState = {};

const etiquetas: Record<EstadoDerivacion, string> = {
  pendiente: "Pendiente",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  completada: "Completada",
};

export function EstadoDerivacionForm({ derivacionId, pacienteId, estadoActual }: { derivacionId: string; pacienteId: string; estadoActual: string }) {
  const [state, formAction, isPending] = useActionState(actualizarEstadoDerivacionAction, estadoInicial);
  const selectId = `estado-derivacion-${derivacionId}`;

  return (
    <form className="print-hidden grid gap-2" action={formAction}>
      <input type="hidden" name="derivacionId" value={derivacionId} />
      <input type="hidden" name="pacienteId" value={pacienteId} />
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={selectId}>Estado de la derivación</label>
        <select id={selectId} name="estado" defaultValue={estadoActual} disabled={isPending}
          className="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:opacity-60">
          {ESTADOS_DERIVACION.map((estado) => <option key={estado} value={estado}>{etiquetas[estado]}</option>)}
        </select>
        <button type="submit" disabled={isPending}
          className="min-h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 disabled:opacity-60">
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert variant="success">Estado actualizado.</Alert>}
    </form>
  );
}
