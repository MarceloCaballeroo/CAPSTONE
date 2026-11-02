"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { RiesgoBadge } from "@/components/common/RiesgoBadge";
import { ESPECIALIDADES_DERIVACION, evaluarRiesgoYDerivacion, textoControlSugerido } from "@/lib/clinical-rules";
import type { EstadoAtencion } from "@/lib/validations/atenciones";

export type Cie10Opcion = { codigo: string; nombre_diagnostico: string; categoria: string };

type AtencionFormProps = {
  action: (state: EstadoAtencion, formData: FormData) => Promise<EstadoAtencion>;
  pacienteId: string;
  catalogo: Cie10Opcion[];
};

const initialState: EstadoAtencion = {};

// Los dos primeros se marcan cuando la exploración está conservada; el resto, cuando el hallazgo está presente.
const SIGNOS = [
  { campo: "monofilamento", etiqueta: "Sensibilidad conservada (monofilamento 10 g)", ayuda: "Marcar si percibe el filamento." },
  { campo: "pulsos", etiqueta: "Pulsos pedios presentes", ayuda: "Marcar si se palpan ambos pulsos." },
  { campo: "deformidad", etiqueta: "Deformidad del pie", ayuda: "Hallux valgus, dedos en martillo, pie plano." },
  { campo: "antecedentesUlcera", etiqueta: "Úlcera previa o amputación", ayuda: "Antecedente de úlcera o amputación de extremidad inferior." },
  { campo: "signosInfeccion", etiqueta: "Signos de infección", ayuda: "Eritema, calor, edema o secreción." },
  { campo: "dolorIsquemico", etiqueta: "Dolor isquémico", ayuda: "Dolor en reposo o claudicación intermitente." },
] as const;

const estiloSelect = "h-11 rounded-lg border border-slate-300 bg-transparent px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

export function AtencionForm({ action, pacienteId, catalogo }: AtencionFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [bloqueado, setBloqueado] = useState(() =>
    evaluarRiesgoYDerivacion({
      monofilamentoSensible: false,
      pulsosPresentes: false,
      deformidadPresente: false,
      ulceraPreviaOAmputacion: false,
      signosInfeccion: false,
      dolorIsquemico: false,
    }).bloquearProcedimientoInvasivo,
  );
  const [procedimientoInvasivo, setProcedimientoInvasivo] = useState(false);

  function actualizarEvaluacion(evento: FormEvent<HTMLFormElement>) {
    const datos = new FormData(evento.currentTarget);
    const evaluacion = evaluarRiesgoYDerivacion({
      monofilamentoSensible: datos.get("monofilamento") === "on",
      pulsosPresentes: datos.get("pulsos") === "on",
      deformidadPresente: datos.get("deformidad") === "on",
      ulceraPreviaOAmputacion: datos.get("antecedentesUlcera") === "on",
      signosInfeccion: datos.get("signosInfeccion") === "on",
      dolorIsquemico: datos.get("dolorIsquemico") === "on",
    });
    setBloqueado(evaluacion.bloquearProcedimientoInvasivo);
    if (evaluacion.bloquearProcedimientoInvasivo) setProcedimientoInvasivo(false);
  }

  const grupos = catalogo.reduce<Record<string, Cie10Opcion[]>>((acumulado, opcion) => {
    (acumulado[opcion.categoria] ??= []).push(opcion);
    return acumulado;
  }, {});

  return (
    <form className="grid gap-8" action={formAction} onChange={actualizarEvaluacion}>
      <input type="hidden" name="pacienteId" value={pacienteId} />

      <section className="grid gap-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Diagnóstico</h2>
          <p className="mt-1 text-sm text-slate-500">El catálogo se agrupa por categoría clínica.</p>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="diagnosticoCie10">
          Diagnóstico CIE-10
          <select id="diagnosticoCie10" name="diagnosticoCie10" required defaultValue="" className={estiloSelect}>
            <option value="" disabled>Selecciona un diagnóstico</option>
            {Object.entries(grupos).map(([categoria, opciones]) => (
              <optgroup key={categoria} label={categoria}>
                {opciones.map((opcion) => (
                  <option key={opcion.codigo} value={opcion.codigo}>{opcion.codigo} · {opcion.nombre_diagnostico}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-5 border-t border-slate-200 pt-7">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Exploración del pie</h2>
          <p className="mt-1 text-sm text-slate-500">Los dos primeros se marcan cuando la exploración es normal; el resto, cuando el hallazgo está presente. Si no marcás los dos primeros, el sistema asume pérdida de sensibilidad y pulsos ausentes.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {SIGNOS.map((signo) => (
            <label key={signo.campo} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input className="mt-0.5 h-4 w-4 shrink-0 accent-teal-700" type="checkbox" name={signo.campo} />
              <span>
                <span className="font-medium text-slate-900">{signo.etiqueta}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{signo.ayuda}</span>
              </span>
            </label>
          ))}
        </div>

        {bloqueado && (
          <Alert>
            Hay signos de infección o compromiso vascular. No puedes realizar procedimientos invasivos; guarda solo la evaluación para generar la interconsulta.
          </Alert>
        )}

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <input
            className="mt-0.5 h-4 w-4 shrink-0 accent-teal-700 disabled:opacity-50"
            type="checkbox"
            name="procedimientoInvasivo"
            checked={procedimientoInvasivo}
            onChange={(evento) => setProcedimientoInvasivo(evento.target.checked)}
            disabled={bloqueado}
          />
          <span>
            <span className="font-medium text-slate-900">Realicé un procedimiento invasivo</span>
            <span className="mt-0.5 block text-xs text-slate-500">Corte, drenaje, curetaje o avulsión.</span>
          </span>
        </label>
      </section>

      <section className="grid gap-5 border-t border-slate-200 pt-7">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Derivación</h2>
          <p className="mt-1 text-sm text-slate-500">Si la evaluación requiere derivación, elige la especialidad de destino.</p>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="especialidadDestino">
          Especialidad de destino
          <select id="especialidadDestino" name="especialidadDestino" defaultValue="" className={estiloSelect}>
            <option value="">Selecciona una especialidad</option>
            {ESPECIALIDADES_DERIVACION.map((especialidad) => (
              <option key={especialidad} value={especialidad}>{especialidad}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-5 border-t border-slate-200 pt-7">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="observaciones">
          Observaciones
          <textarea id="observaciones" name="observaciones" rows={4} maxLength={2000} className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100" placeholder="Hallazgos, tratamiento realizado o indicaciones." />
        </label>
        <p className="text-sm text-slate-500">El grupo de riesgo IWGDF y la derivación se calculan en el servidor al guardar.</p>
      </section>

      {state.error && <Alert>{state.error}</Alert>}
      {state.success && state.evaluacion && (
        <div className="grid gap-3 border-l-2 border-teal-700/40 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium">Atención registrada.</span>
            <RiesgoBadge nivel={state.evaluacion.nivelRiesgo} />
          </div>
          <p>Control sugerido: {textoControlSugerido(state.evaluacion.nivelRiesgo)}.</p>
          {state.evaluacion.alertas.length > 0 && (
            <ul className="list-disc pl-5">
              {state.evaluacion.alertas.map((alerta) => <li key={alerta}>{alerta}</li>)}
            </ul>
          )}
          {state.evaluacion.requiereDerivacion && <p>Se generó una derivación automática.</p>}
          <Link className="font-medium underline underline-offset-4" href={`/patients/${pacienteId}`}>Volver a la ficha del paciente</Link>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Link href={`/patients/${pacienteId}`}><Button variant="secondary" type="button">Cancelar</Button></Link>
        <Button type="submit" isLoading={isPending}>{isPending ? "Guardando" : "Guardar atención"}</Button>
      </div>
    </form>
  );
}
