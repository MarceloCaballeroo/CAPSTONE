import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { ClickTooltip } from "@/components/common/ClickTooltip";
import { createClient } from "@/lib/supabase/server";
import { FootModelViewer, type AtencionLineaTiempo } from "@/features/patients/FootModelViewer";
import { PrintFichaButton } from "@/features/patients/PrintFichaButton";
import type { HallazgoClinico } from "@/lib/types/hallazgos";
import { formatearRut } from "@/lib/validations/patients";

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

type ComunaRelacion = {
  id: number;
  nombre: string;
  region?: { id: number; nombre: string; ordinal?: string | null } | { id: number; nombre: string; ordinal?: string | null }[] | null;
};

export default async function PacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: paciente, error: pacienteError } = await supabase
    .from("paciente")
    .select("*")
    .eq("id", id)
    .single();
  if (pacienteError && pacienteError.code === "PGRST116") notFound();

  if (pacienteError || !paciente) {
    if (pacienteError) console.error("Error al cargar paciente:", pacienteError);
    return <Alert>No pudimos cargar la ficha del paciente.</Alert>;
  }

  const { data: comunaData } = paciente.comuna_id
    ? await supabase.from("comuna").select("id, nombre, region ( id, nombre, ordinal )").eq("id", paciente.comuna_id).maybeSingle()
    : { data: null };

  const { data: contactoEmergencia } = await supabase.from("contacto_emergencia").select("nombre, telefono, parentesco").eq("paciente_id", id).order("id").limit(1).maybeSingle();

  const { data: ficha } = await supabase.from("ficha_clinica").select("id, antecedentes, updated_at").eq("paciente_id", id).maybeSingle();
  const { data: atenciones } = ficha ? await supabase.from("atencion").select("id, usuario_id, diagnostico_cie10, nivel_riesgo_iwgdf, requiere_derivacion, observaciones, created_at").eq("ficha_id", ficha.id).order("created_at", { ascending: false }) : { data: [] };
  const atencionIds = atenciones?.map((atencion) => atencion.id) ?? [];
  const { data: hallazgos, error: errorHallazgos } = atencionIds.length
    ? await supabase.from("hallazgo_clinico").select("id, atencion_id, corrige_hallazgo_id, lado_pie, coordenada_x, coordenada_y, coordenada_z, normal_x, normal_y, normal_z, modelo_version, afeccion, intensidad_dolor, created_at").in("atencion_id", atencionIds).order("created_at", { ascending: true })
    : { data: [], error: null };
  const { data: imagenes } = atencionIds.length ? await supabase.from("imagen_clinica").select("id, etiqueta, area_cm2, created_at").in("atencion_id", atencionIds).order("created_at", { ascending: false }) : { data: [] };
  const { data: derivaciones } = atencionIds.length ? await supabase.from("derivacion").select("id, motivo, especialidad_destino, estado, created_at, updated_at").in("atencion_id", atencionIds).order("created_at", { ascending: false }) : { data: [] };
  const usuarioIds = [...new Set((atenciones ?? []).map((atencion) => atencion.usuario_id).filter((usuarioId): usuarioId is string => Boolean(usuarioId)))];
  const { data: profesionales } = usuarioIds.length
    ? await supabase.from("usuario").select("id, nombre").in("id", usuarioIds)
    : { data: [] };
  const profesionalPorId = new Map((profesionales ?? []).map((profesional) => [profesional.id, profesional.nombre]));
  const atencionesLineaTiempo = (atenciones ?? []).map((atencion) => ({
    ...atencion,
    profesional: atencion.usuario_id ? profesionalPorId.get(atencion.usuario_id) ?? null : null,
  })) as AtencionLineaTiempo[];
  const atencionReciente = atenciones?.[0];
  const riesgo = atencionReciente?.nivel_riesgo_iwgdf;
  const nombreCompleto = `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno ?? ""}`.trim();
  const comunaObj = (Array.isArray(comunaData) ? comunaData[0] : comunaData) as ComunaRelacion | null;
  const regionObj = (Array.isArray(comunaObj?.region) ? comunaObj?.region[0] : comunaObj?.region) ?? null;
  const nombreComuna = comunaObj?.nombre ?? (typeof paciente.comuna === "string" ? paciente.comuna : null);
  const nombreRegion = regionObj?.nombre ?? null;
  const ordinalRegion = regionObj?.ordinal ?? null;
  const rutTexto = formatearRut(paciente.rut_numero ?? paciente.rut, paciente.rut_dv);

  return (
    <div className="patient-record grid gap-5">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <Link className="w-fit text-sm font-medium text-teal-800 hover:underline" href="/patients">← Volver a pacientes</Link>
        <div className="flex gap-2">
          <PrintFichaButton />
          <Link href={`/patients/${id}/editar`}><Button variant="secondary">Editar datos</Button></Link>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-teal-100 bg-teal-50 text-lg font-semibold text-teal-800">
              {inicialesPaciente(paciente.nombre, paciente.apellido_paterno)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-900">{nombreCompleto}</h1>
                <ClickTooltip content="La clasificación IWGDF se registra en una evaluación clínica cuando existe diabetes u otro factor de riesgo. Sin una clasificación guardada, el estado se muestra como no evaluado.">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riesgo === "alto" ? "border-red-200 bg-red-50 text-red-800" : riesgo === "moderado" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                    Riesgo de úlcera (IWGDF): {riesgo ? etiquetasRiesgo[riesgo] ?? riesgo : "No evaluado"}
                  </span>
                </ClickTooltip>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                <span>RUT <strong className="font-medium text-slate-900">{rutTexto}</strong></span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{paciente.sexo_biologico ? paciente.sexo_biologico.replaceAll("_", " ") : "Sexo no registrado"}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{paciente.prevision?.replaceAll("_", " ") ?? "Previsión no registrada"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {paciente.activo === false && (
                  <span className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                    Paciente inactivo
                  </span>
                )}
                <span className={`rounded-md border px-2.5 py-1 font-medium ${paciente.consentimiento ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                  {paciente.consentimiento ? `Consentimiento firmado${paciente.fecha_consentimiento ? ` · ${fechaClinica(paciente.fecha_consentimiento)}` : ""}` : "Consentimiento pendiente"}
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                  {atenciones?.length ?? 0} {(atenciones?.length ?? 0) === 1 ? "atención registrada" : "atenciones registradas"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)] print:grid-cols-1">
        <div className="print-hidden">
          <FootModelViewer
            key={id}
            pacienteId={id}
            atenciones={atencionesLineaTiempo}
            hallazgos={(hallazgos ?? []) as HallazgoClinico[]}
            persistenciaDisponible={!errorHallazgos}
          />
        </div>

        <aside className="grid content-start gap-5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Antecedentes clínicos</h2>
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
              <div><dt className="text-xs text-slate-500">Dirección</dt><dd className="mt-0.5 font-medium text-slate-800">{paciente.direccion || "Sin registro"}</dd></div>
              <div><dt className="text-xs text-slate-500">Comuna</dt><dd className="mt-0.5 font-medium text-slate-800">{nombreComuna || "Sin registro"}</dd></div>
              {nombreRegion && (
                <div><dt className="text-xs text-slate-500">Región</dt><dd className="mt-0.5 font-medium text-slate-800">{nombreRegion}{ordinalRegion ? ` (${ordinalRegion})` : ""}</dd></div>
              )}
              <div><dt className="text-xs text-slate-500">Centro de origen</dt><dd className="mt-0.5 font-medium text-slate-800">{paciente.centro_salud_origen || "Sin registro"}</dd></div>
              <div><dt className="text-xs text-slate-500">Contacto de emergencia</dt><dd className="mt-0.5 font-medium text-slate-800">{contactoEmergencia?.nombre ?? "Sin registro"}</dd>{contactoEmergencia?.telefono && <dd className="text-xs text-slate-500">{contactoEmergencia.telefono}{contactoEmergencia.parentesco ? ` · ${contactoEmergencia.parentesco}` : ""}</dd>}</div>
            </dl>
          </Card>
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
        </aside>
      </div>
    </div>
  );
}