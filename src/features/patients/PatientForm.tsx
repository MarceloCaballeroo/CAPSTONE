"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import type { FormState } from "@/lib/types/auth";

type PacienteInicial = {
  id?: string;
  nombre?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  rut?: string | null;
  fecha_nacimiento?: string | null;
  sexo_biologico?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  comuna?: string | null;
  prevision?: string | null;
  centro_salud_origen?: string | null;
  contacto_emergencia_nombre?: string | null;
  contacto_emergencia_telefono?: string | null;
  contacto_emergencia_parentesco?: string | null;
};

type PacienteFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  paciente?: PacienteInicial;
};

const initialState: FormState = {};

export function PatientForm({ action, paciente }: PacienteFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [consentimiento, setConsentimiento] = useState(Boolean(paciente));

  return (
    <form className="grid gap-8" action={formAction}>
      {paciente?.id && <input type="hidden" name="pacienteId" value={paciente.id} />}
      <section className="grid gap-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Datos mínimos</h2>
          <p className="mt-1 text-sm text-slate-500">Lo necesario para registrar rápidamente a una persona.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Input id="nombre" name="nombre" label="Nombre" defaultValue={paciente?.nombre ?? ""} required />
          <Input id="apellidoPaterno" name="apellidoPaterno" label="Apellido paterno" defaultValue={paciente?.apellido_paterno ?? ""} required />
          <Input id="apellidoMaterno" name="apellidoMaterno" label="Apellido materno" defaultValue={paciente?.apellido_materno ?? ""} />
          <Input id="rut" name="rut" label="RUT" hint="Ejemplo: 12.345.678-5" defaultValue={paciente?.rut ?? ""} required />
        </div>
        {!paciente && (
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <input
              className="mt-0.5 h-4 w-4 accent-teal-700"
              type="checkbox"
              name="consentimiento"
              checked={consentimiento}
              onChange={(event) => setConsentimiento(event.target.checked)}
              required
            />
            <span>La persona autoriza el registro y tratamiento de sus datos clínicos conforme a la Ley N.º 19.628.</span>
          </label>
        )}
        {paciente && <input type="hidden" name="consentimiento" value="on" />}
      </section>

      <section className="grid gap-5 border-t border-slate-200 pt-7">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Información complementaria</h2>
          <p className="mt-1 text-sm text-slate-500">Puedes completarla ahora o durante la primera atención.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Input id="fechaNacimiento" name="fechaNacimiento" type="date" label="Fecha de nacimiento" defaultValue={paciente?.fecha_nacimiento ?? ""} />
          <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="sexoBiologico">
            Sexo biológico
            <select id="sexoBiologico" name="sexoBiologico" defaultValue={paciente?.sexo_biologico ?? ""} className="h-11 rounded-lg border border-slate-300 bg-transparent px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
              <option value="">Sin especificar</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="intersexual">Intersexual</option>
              <option value="no_especificado">No especificado</option>
            </select>
          </label>
          <Input id="telefono" name="telefono" type="tel" label="Teléfono" defaultValue={paciente?.telefono ?? ""} />
          <Input id="email" name="email" type="email" label="Correo electrónico" defaultValue={paciente?.email ?? ""} />
          <Input id="direccion" name="direccion" label="Dirección" defaultValue={paciente?.direccion ?? ""} />
          <Input id="comuna" name="comuna" label="Comuna" defaultValue={paciente?.comuna ?? ""} />
          <Input id="centroSaludOrigen" name="centroSaludOrigen" label="Centro de salud de origen" defaultValue={paciente?.centro_salud_origen ?? ""} />
          <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="prevision">
            Previsión de salud
            <select id="prevision" name="prevision" defaultValue={paciente?.prevision ?? ""} className="h-11 rounded-lg border border-slate-300 bg-transparent px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
              <option value="">Sin especificar</option>
              <option value="fonasa_a">Fonasa A</option>
              <option value="fonasa_b">Fonasa B</option>
              <option value="fonasa_c">Fonasa C</option>
              <option value="fonasa_d">Fonasa D</option>
              <option value="isapre">Isapre</option>
              <option value="dipreca_capredena">Dipreca / Capredena</option>
              <option value="particular">Particular</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-5 border-t border-slate-200 pt-7">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Contacto de emergencia</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Input id="contactoEmergenciaNombre" name="contactoEmergenciaNombre" label="Nombre" defaultValue={paciente?.contacto_emergencia_nombre ?? ""} />
          <Input id="contactoEmergenciaTelefono" name="contactoEmergenciaTelefono" type="tel" label="Teléfono" defaultValue={paciente?.contacto_emergencia_telefono ?? ""} />
          <Input id="contactoEmergenciaParentesco" name="contactoEmergenciaParentesco" label="Parentesco" defaultValue={paciente?.contacto_emergencia_parentesco ?? ""} />
        </div>
      </section>

      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert variant="success">Cambios guardados correctamente.</Alert>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="submit" isLoading={isPending} disabled={!paciente && !consentimiento}>
          {isPending ? "Guardando" : paciente ? "Guardar cambios" : "Registrar paciente"}
        </Button>
      </div>
    </form>
  );
}