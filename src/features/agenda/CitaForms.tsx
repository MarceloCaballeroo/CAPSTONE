"use client";

import { useActionState } from "react";
import { actualizarEstadoCitaAction, crearCitaAction } from "@/app/actions/agenda";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import type { FormState } from "@/lib/types/auth";
import { estadoInfo, estadosCita } from "@/features/agenda/estados";

export type PacienteAgenda = {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
};

const estadoInicial: FormState = {};

export function NuevaCitaForm({ pacientes, fechaHoraMinima, pacienteInicial = "" }: { pacientes: PacienteAgenda[]; fechaHoraMinima: string; pacienteInicial?: string }) {
  const [state, formAction, isPending] = useActionState(crearCitaAction, estadoInicial);

  return (
    <form className="grid gap-4" action={formAction}>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="pacienteId">
        Paciente
        <select id="pacienteId" name="pacienteId" required defaultValue={pacientes.some((paciente) => paciente.id === pacienteInicial) ? pacienteInicial : ""} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
          <option value="" disabled>Selecciona un paciente</option>
          {pacientes.map((paciente) => (
            <option key={paciente.id} value={paciente.id}>
              {paciente.nombre} {paciente.apellido_paterno} {paciente.apellido_materno ?? ""}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="fechaHora">
        Fecha y hora
        <input id="fechaHora" name="fechaHora" type="datetime-local" min={fechaHoraMinima} required className="h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="motivo">
        Motivo de consulta
        <textarea id="motivo" name="motivo" rows={3} maxLength={300} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
      </label>
      {state.error && <Alert>{state.error}</Alert>}
      <Button type="submit" isLoading={isPending} disabled={pacientes.length === 0}>
        {isPending ? "Guardando..." : "Guardar cita"}
      </Button>
      {pacientes.length === 0 && <p className="text-sm text-slate-500">Registra un paciente antes de agendar una cita.</p>}
    </form>
  );
}

export function EstadoCitaForm({ citaId, estadoActual }: { citaId: string; estadoActual: string }) {
  const [state, formAction, isPending] = useActionState(actualizarEstadoCitaAction, estadoInicial);

  return (
    <form className="grid gap-2" action={formAction}>
      <input type="hidden" name="citaId" value={citaId} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actualizar estado</p>
      <div className="grid grid-cols-2 gap-1.5">
        {estadosCita.map((estado) => {
          const actual = estado === estadoActual;
          return (
            <button key={estado} type="submit" name="estado" value={estado} disabled={isPending} aria-pressed={actual}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors disabled:opacity-60 ${actual ? `border-2 font-semibold ${estadoInfo[estado].estilo}` : "border border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-400"}`}>
              <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${estadoInfo[estado].punto}`} />{estadoInfo[estado].accion}
            </button>
          );
        })}
      </div>
      {isPending && <p className="text-sm text-slate-500">Actualizando...</p>}
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert variant="success">Estado actualizado.</Alert>}
    </form>
  );
}