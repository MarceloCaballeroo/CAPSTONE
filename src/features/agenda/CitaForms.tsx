"use client";

import { useActionState } from "react";
import { actualizarEstadoCitaAction, crearCitaAction } from "@/app/actions/agenda";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import type { FormState } from "@/lib/types/auth";

export type PacienteAgenda = {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
};

const estadoInicial: FormState = {};

export function NuevaCitaForm({ pacientes, fechaHoraMinima }: { pacientes: PacienteAgenda[]; fechaHoraMinima: string }) {
  const [state, formAction, isPending] = useActionState(crearCitaAction, estadoInicial);

  return (
    <form className="grid gap-4" action={formAction}>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="pacienteId">
        Paciente
        <select id="pacienteId" name="pacienteId" required defaultValue="" className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
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
    <form className="grid gap-3" action={formAction}>
      <input type="hidden" name="citaId" value={citaId} />
      <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="estado">
        Estado de la cita
        <select id="estado" name="estado" defaultValue={estadoActual} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
          <option value="agendada">Agendada</option>
          <option value="confirmada">Confirmada</option>
          <option value="en_espera">En espera</option>
          <option value="atendida">Atendida</option>
          <option value="cancelada">Cancelada</option>
          <option value="no_asiste">No asistió</option>
        </select>
      </label>
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert variant="success">Estado actualizado.</Alert>}
      <Button type="submit" variant="secondary" isLoading={isPending}>{isPending ? "Actualizando..." : "Actualizar estado"}</Button>
    </form>
  );
}