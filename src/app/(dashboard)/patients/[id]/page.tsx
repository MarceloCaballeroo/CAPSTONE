import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { createClient } from "@/lib/supabase/server";
import { FootModelViewer } from "@/features/patients/FootModelViewer";

const etiquetasRiesgo: Record<string, string> = {
  muy_bajo: "Muy bajo",
  bajo: "Bajo",
  moderado: "Moderado",
  alto: "Alto",
};

function fechaClinica(fecha: string | null | undefined, incluirHora = false): string {
  if (!fecha) return "Sin registro";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(incluirHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(fecha));
}

function inicialesPaciente(nombre: string, apellido: string): string {
  return `${nombre.trim()[0] ?? ""}${apellido.trim()[0] ?? ""}`.toUpperCase();
}

export default async function PacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: paciente, error: pacienteError } = await supabase.from("paciente").select("*").eq("id", id).single();
  if (pacienteError && pacienteError.code === "PGRST116") notFound();

  if (pacienteError || !paciente) {
    return <Alert>No pudimos cargar la ficha del paciente.</Alert>;
  }

  const { data: ficha } = await supabase.from("ficha_clinica").select("id, antecedentes, updated_at").eq("paciente_id", id).maybeSingle();
  const { data: atenciones } = ficha ? await supabase.from("atencion").select("id, usuario_id, diagnostico_cie10, nivel_riesgo_iwgdf, requiere_derivacion, observaciones, created_at").eq("ficha_id", ficha.id).order("created_at", { ascending: false }) : { data: [] };
  const atencionIds = atenciones?.map((atencion) => atencion.id) ?? [];
  const { data: imagenes } = atencionIds.length ? await supabase.from("imagen_clinica").select("id, etiqueta, area_cm2, created_at").in("atencion_id", atencionIds).order("created_at", { ascending: false }) : { data: [] };
  const { data: derivaciones } = atencionIds.length ? await supabase.from("derivacion").select("id, motivo, especialidad_destino, estado, created_at, updated_at").in("atencion_id", atencionIds).order("created_at", { ascending: false }) : { data: [] };
  const usuarioIds = [...new Set((atenciones ?? []).map((atencion) => atencion.usuario_id).filter((usuarioId): usuarioId is string => Boolean(usuarioId)))];
  const { data: profesionales } = usuarioIds.length
    ? await supabase.from("usuario").select("id, nombre").in("id", usuarioIds)
    : { data: [] };
  const profesionalPorId = new Map((profesionales ?? []).map((profesional) => [profesional.id, profesional.nombre]));
  const atencionReciente = atenciones?.[0];
  const riesgo = atencionReciente?.nivel_riesgo_iwgdf;
  const nombreCompleto = `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno ?? ""}`.trim();

  return (
    <div className="grid gap-5">
      <Link className="w-fit text-sm font-medium text-teal-800 hover:underline" href="/patients">← Volver a pacientes</Link>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-teal-100 bg-teal-50 text-lg font-semibold text-teal-800">
              {inicialesPaciente(paciente.nombre, paciente.apellido_paterno)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-900">{nombreCompleto}</h1>
                {riesgo && <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riesgo === "alto" ? "border-red-200 bg-red-50 text-red-800" : riesgo === "moderado" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-teal-200 bg-teal-50 text-teal-800"}`}>IWGDF: {etiquetasRiesgo[riesgo] ?? riesgo}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                <span>RUT <strong className="font-medium text-slate-900">{paciente.rut}</strong></span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{paciente.sexo_biologico ? paciente.sexo_biologico.replaceAll("_", " ") : "Sexo no registrado"}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{paciente.prevision?.replaceAll("_", " ") ?? "Previsión no registrada"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-md border px-2.5 py-1 font-medium ${paciente.consentimiento ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                  Consentimiento {paciente.consentimiento ? "registrado" : "pendiente"}
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                  {atenciones?.length ?? 0} {(atenciones?.length ?? 0) === 1 ? "atención registrada" : "atenciones registradas"}
                </span>
              </div>
            </div>
          </div>
          <Link className="shrink-0" href={`/patients/${id}/editar`}><Button variant="secondary">Editar datos</Button></Link>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <FootModelViewer />

        <div className="grid gap-5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Antecedentes clínicos</h2>
              <span className="text-xs text-slate-400">Ficha basal</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{ficha?.antecedentes || "No hay antecedentes registrados."}</p>
            {ficha?.updated_at && <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">Actualizado el {fechaClinica(ficha.updated_at)}</p>}
          </Card>

          <Card>
            <h2 className="font-semibold text-slate-900">Datos relevantes</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div><dt className="text-xs text-slate-500">Fecha de nacimiento</dt><dd className="mt-0.5 font-medium text-slate-800">{paciente.fecha_nacimiento ? fechaClinica(paciente.fecha_nacimiento) : "Sin registro"}</dd></div>
              <div><dt className="text-xs text-slate-500">Teléfono</dt><dd className="mt-0.5 font-medium text-slate-800">{paciente.telefono || "Sin registro"}</dd></div>
              <div><dt className="text-xs text-slate-500">Correo</dt><dd className="mt-0.5 break-all font-medium text-slate-800">{paciente.email || "Sin registro"}</dd></div>
              <div><dt className="text-xs text-slate-500">Dirección</dt><dd className="mt-0.5 font-medium text-slate-800">{[paciente.direccion, paciente.comuna].filter(Boolean).join(", ") || "Sin registro"}</dd></div>
              <div><dt className="text-xs text-slate-500">Centro de origen</dt><dd className="mt-0.5 font-medium text-slate-800">{paciente.centro_salud_origen || "Sin registro"}</dd></div>
              <div><dt className="text-xs text-slate-500">Contacto de emergencia</dt><dd className="mt-0.5 font-medium text-slate-800">{paciente.contacto_emergencia_nombre || "Sin registro"}</dd>{paciente.contacto_emergencia_telefono && <dd className="text-xs text-slate-500">{paciente.contacto_emergencia_telefono}</dd>}</div>
              <div><dt className="text-xs text-slate-500">Consentimiento</dt><dd className="mt-0.5 font-medium text-slate-800">{paciente.fecha_consentimiento ? fechaClinica(paciente.fecha_consentimiento) : paciente.consentimiento ? "Registrado, sin fecha" : "Pendiente"}</dd></div>
            </dl>
          </Card>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Evolución clínica</h2>
              <p className="mt-1 text-sm text-slate-500">Historial cronológico de atenciones</p>
            </div>
            <span className="text-xs text-slate-500">{atenciones?.length ?? 0} registros</span>
          </div>
          {atenciones?.length ? (
            <ol className="divide-y divide-slate-100">
              {atenciones.map((atencion) => (
                <li className="py-5 last:pb-0" key={atencion.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{atencion.diagnostico_cie10 || "Atención clínica"}</p>
                      <p className="mt-1 text-xs text-slate-500">{fechaClinica(atencion.created_at, true)}{atencion.usuario_id && profesionalPorId.get(atencion.usuario_id) ? ` · ${profesionalPorId.get(atencion.usuario_id)}` : ""}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-md border px-2 py-1 text-xs font-medium ${atencion.nivel_riesgo_iwgdf === "alto" ? "border-red-200 bg-red-50 text-red-800" : atencion.nivel_riesgo_iwgdf === "moderado" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-teal-200 bg-teal-50 text-teal-800"}`}>Riesgo {etiquetasRiesgo[atencion.nivel_riesgo_iwgdf] ?? atencion.nivel_riesgo_iwgdf}</span>
                      {atencion.requiere_derivacion && <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800">Requiere derivación</span>}
                    </div>
                  </div>
                  {atencion.observaciones && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{atencion.observaciones}</p>}
                </li>
              ))}
            </ol>
          ) : <p className="pt-5 text-sm text-slate-500">Todavía no hay atenciones registradas.</p>}
        </Card>

        <div className="grid content-start gap-5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Derivaciones</h2>
              <span className="text-xs text-slate-500">{derivaciones?.length ?? 0}</span>
            </div>
            {derivaciones?.length ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {derivaciones.map((derivacion) => (
                  <li className="py-4 first:pt-0 last:pb-0" key={derivacion.id}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">{derivacion.especialidad_destino}</p>
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{derivacion.estado}</span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-slate-600">{derivacion.motivo}</p>
                    <p className="mt-2 text-xs text-slate-400">{fechaClinica(derivacion.created_at)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 text-sm text-slate-500">No hay derivaciones registradas.</p>}
          </Card>

          <Card>
            <h2 className="font-semibold text-slate-900">Imágenes clínicas</h2>
            {imagenes?.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {imagenes.map((imagen) => <li className="flex items-center justify-between gap-3 py-3 text-sm" key={imagen.id}><span className="min-w-0 truncate text-slate-700">{imagen.etiqueta || "Imagen clínica"}</span><span className="shrink-0 text-xs text-slate-400">{fechaClinica(imagen.created_at)}</span></li>)}
              </ul>
            ) : <p className="mt-3 text-sm text-slate-500">No hay imágenes asociadas a las atenciones.</p>}
          </Card>
        </div>
      </section>
    </div>
  );
}