"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import type { FormState } from "@/lib/types/auth";
import { formatearRut, formatearRutEnVivo } from "@/lib/validations/patients";

type PacienteInicial = {
  id?: string;
  nombre?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  rut?: string | null;
  rut_numero?: number | null;
  rut_dv?: string | null;
  fecha_nacimiento?: string | null;
  sexo_biologico?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  comuna_id?: number | null;
  prevision?: string | null;
  centro_salud_origen?: string | null;
};

export type RegionOpcion = { id: number; nombre: string; ordinal?: string | null };
export type ComunaOpcion = { id: number; nombre: string; region_id: number };
export type ContactoEmergencia = { nombre: string | null; telefono: string | null; parentesco: string | null };

type PacienteFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  paciente?: PacienteInicial;
  regiones?: RegionOpcion[];
  comunas?: ComunaOpcion[];
  contacto?: ContactoEmergencia | null;
};

const initialState: FormState = {};

export function PatientForm({ action, paciente, regiones = [], comunas = [], contacto }: PacienteFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [consentimiento, setConsentimiento] = useState(Boolean(paciente));
  const [regionId, setRegionId] = useState<number | "">(comunas.find((comuna) => comuna.id === paciente?.comuna_id)?.region_id ?? "");
  const [comunaId, setComunaId] = useState<number | "">(paciente?.comuna_id ?? "");
  const [rut, setRut] = useState(() => (paciente?.rut_numero ? formatearRut(paciente.rut_numero, paciente.rut_dv) : paciente?.rut ?? ""));
  const comunasVisibles = regionId === "" ? comunas : comunas.filter((comuna) => comuna.region_id === regionId);
  const errores = state.errores ?? {};

  // La región solo filtra las comunas: no se guarda (paciente solo tiene comuna_id).
  const cambiarRegion = (valor: string) => {
    const region = valor === "" ? "" : Number(valor);
    setRegionId(region);
    if (region !== "" && comunas.find((comuna) => comuna.id === comunaId)?.region_id !== region) setComunaId("");
  };

  return (
    <form className="grid gap-8" action={formAction}>
      {paciente?.id && <input type="hidden" name="pacienteId" value={paciente.id} />}
      <section className="grid gap-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Datos mínimos</h2>
          <p className="mt-1 text-sm text-slate-500">Lo necesario para registrar rápidamente a una persona.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Input id="nombre" name="nombre" label="Nombre" defaultValue={paciente?.nombre ?? ""} error={errores.nombre} required />
          <Input id="apellidoPaterno" name="apellidoPaterno" label="Apellido paterno" defaultValue={paciente?.apellido_paterno ?? ""} error={errores.apellidoPaterno} required />
          <Input id="apellidoMaterno" name="apellidoMaterno" label="Apellido materno" defaultValue={paciente?.apellido_materno ?? ""} error={errores.apellidoMaterno} />
          <Input
            id="rut"
            name="rut"
            label="RUT"
            hint="Ejemplo: 12.345.678-5"
            value={rut}
            onChange={(evento) => setRut(formatearRutEnVivo(evento.target.value))}
            error={errores.rut}
            required
          />
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
          <p className="mt-1 text-sm text-slate-500">La fecha de nacimiento y la previsión son obligatorias; el resto puedes completarlo durante la primera atención.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Input id="fechaNacimiento" name="fechaNacimiento" type="date" label="Fecha de nacimiento" defaultValue={paciente?.fecha_nacimiento ?? ""} error={errores.fechaNacimiento} required />
          <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="sexoBiologico">
            Sexo biológico
            <select id="sexoBiologico" name="sexoBiologico" defaultValue={paciente?.sexo_biologico ?? "no_especificado"} className="h-11 rounded-lg border border-slate-300 bg-transparent px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
              <option value="no_especificado">Sin especificar</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="intersexual">Intersexual</option>
            </select>
          </label>
          <Input id="telefono" name="telefono" type="tel" label="Teléfono" defaultValue={paciente?.telefono ?? ""} error={errores.telefono} />
          <Input id="email" name="email" type="email" label="Correo electrónico" defaultValue={paciente?.email ?? ""} error={errores.email} />
          <Input id="direccion" name="direccion" label="Dirección" defaultValue={paciente?.direccion ?? ""} error={errores.direccion} />
          <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="regionId">
            Región
            <select id="regionId" value={regionId} onChange={(evento) => cambiarRegion(evento.target.value)} className="h-11 rounded-lg border border-slate-300 bg-transparent px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
              <option value="">Todas</option>
              {regiones.map((region) => (
                <option key={region.id} value={region.id}>{region.nombre}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="comunaId">
            Comuna
            <select id="comunaId" name="comunaId" value={comunaId} onChange={(evento) => setComunaId(evento.target.value === "" ? "" : Number(evento.target.value))} className="h-11 rounded-lg border border-slate-300 bg-transparent px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
              <option value="">Sin especificar</option>
              {comunasVisibles.map((comuna) => (
                <option key={comuna.id} value={comuna.id}>{comuna.nombre}</option>
              ))}
            </select>
          </label>
          <Input id="centroSaludOrigen" name="centroSaludOrigen" label="Centro de salud de origen" defaultValue={paciente?.centro_salud_origen ?? ""} error={errores.centroSaludOrigen} />
          <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="prevision">
            Previsión de salud
            <select id="prevision" name="prevision" defaultValue={paciente?.prevision ?? ""} required className="h-11 rounded-lg border border-slate-300 bg-transparent px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
              <option value="" disabled>Selecciona una previsión</option>
              <option value="fonasa_a">Fonasa A</option>
              <option value="fonasa_b">Fonasa B</option>
              <option value="fonasa_c">Fonasa C</option>
              <option value="fonasa_d">Fonasa D</option>
              <option value="isapre">Isapre</option>
              <option value="dipreca_capredena">Dipreca / Capredena</option>
              <option value="particular">Particular</option>
            </select>
            {errores.prevision && <p role="alert" className="text-sm font-normal text-red-700">{errores.prevision}</p>}
          </label>
        </div>
      </section>

      <section className="grid gap-5 border-t border-slate-200 pt-7">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Contacto de emergencia</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Input id="contactoEmergenciaNombre" name="contactoEmergenciaNombre" label="Nombre" defaultValue={contacto?.nombre ?? ""} error={errores.contactoEmergenciaNombre} />
          <Input id="contactoEmergenciaTelefono" name="contactoEmergenciaTelefono" type="tel" label="Teléfono" defaultValue={contacto?.telefono ?? ""} error={errores.contactoEmergenciaTelefono} />
          <Input id="contactoEmergenciaParentesco" name="contactoEmergenciaParentesco" label="Parentesco" defaultValue={contacto?.parentesco ?? ""} error={errores.contactoEmergenciaParentesco} />
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