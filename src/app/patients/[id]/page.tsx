import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export default async function PacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: paciente, error: pacienteError } = await supabase.from("paciente").select("*").eq("id", id).single();
  if (pacienteError && pacienteError.code === "PGRST116") notFound();

  if (pacienteError || !paciente) {
    return <DashboardLayout><Alert>No pudimos cargar la ficha del paciente.</Alert></DashboardLayout>;
  }

  const { data: ficha } = await supabase.from("ficha_clinica").select("id, antecedentes, updated_at").eq("paciente_id", id).maybeSingle();
  const { data: atenciones } = ficha ? await supabase.from("atencion").select("id, diagnostico_cie10, nivel_riesgo_iwgdf, requiere_derivacion, observaciones, created_at").eq("ficha_id", ficha.id).order("created_at", { ascending: false }) : { data: [] };
  const atencionIds = atenciones?.map((atencion) => atencion.id) ?? [];
  const { data: imagenes } = atencionIds.length ? await supabase.from("imagen_clinica").select("id, etiqueta, area_cm2, created_at").in("atencion_id", atencionIds).order("created_at", { ascending: false }) : { data: [] };
  const { data: derivaciones } = atencionIds.length ? await supabase.from("derivacion").select("id, motivo, especialidad_destino, estado, created_at, updated_at").in("atencion_id", atencionIds).order("created_at", { ascending: false }) : { data: [] };

  return (
    <DashboardLayout>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link className="text-sm font-medium text-teal-700 hover:underline" href="/patients">← Volver a pacientes</Link>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">{paciente.nombre} {paciente.apellido_paterno}</h1>
          <p className="mt-2 text-slate-500">RUT {paciente.rut} · Consentimiento {paciente.consentimiento ? "registrado" : "pendiente"}</p>
        </div>
        <Link href={`/patients/${id}/editar`}><Button variant="secondary">Editar datos</Button></Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">Ficha clínica</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{ficha?.antecedentes || "No hay antecedentes registrados todavía."}</p>
          <p className="mt-5 text-xs text-slate-400">La edición de antecedentes estará disponible desde la ficha clínica.</p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">Datos de contacto</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Teléfono</dt><dd className="font-medium text-slate-900">{paciente.telefono || "Sin registrar"}</dd></div>
            <div><dt className="text-slate-500">Correo</dt><dd className="font-medium text-slate-900">{paciente.email || "Sin registrar"}</dd></div>
            <div><dt className="text-slate-500">Comuna</dt><dd className="font-medium text-slate-900">{paciente.comuna || "Sin registrar"}</dd></div>
            <div><dt className="text-slate-500">Fecha de consentimiento</dt><dd className="font-medium text-slate-900">{paciente.fecha_consentimiento ? new Date(paciente.fecha_consentimiento).toLocaleDateString("es-CL") : "Sin registrar"}</dd></div>
          </dl>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">Historial de atenciones</h2>
          {atenciones?.length ? <ul className="mt-5 divide-y divide-slate-100">{atenciones.map((atencion) => <li className="py-4 first:pt-0" key={atencion.id}><div className="flex justify-between gap-3"><p className="font-medium text-slate-900">{atencion.diagnostico_cie10 || "Atención clínica"}</p><span className={atencion.nivel_riesgo_iwgdf === "alto" ? "font-semibold text-red-700" : "text-slate-500"}>{atencion.nivel_riesgo_iwgdf}</span></div><p className="mt-1 text-sm text-slate-500">{new Date(atencion.created_at).toLocaleDateString("es-CL")}</p></li>)}</ul> : <p className="mt-5 text-sm text-slate-500">Todavía no hay atenciones registradas.</p>}
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">Derivaciones</h2>
          {derivaciones?.length ? <ul className="mt-5 divide-y divide-slate-100">{derivaciones.map((derivacion) => <li className="py-4 first:pt-0" key={derivacion.id}><div className="flex justify-between gap-3"><p className="font-medium text-slate-900">{derivacion.especialidad_destino}</p><span className="text-sm text-slate-500">{derivacion.estado}</span></div><p className="mt-1 text-sm text-slate-600">{derivacion.motivo}</p></li>)}</ul> : <p className="mt-5 text-sm text-slate-500">No hay derivaciones asociadas.</p>}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">Imágenes clínicas</h2>
          {imagenes?.length ? <p className="mt-5 text-sm text-slate-600">{imagenes.length} imagen(es) asociada(s) a sus atenciones.</p> : <p className="mt-5 text-sm text-slate-500">No hay imágenes clínicas asociadas.</p>}
        </Card>
      </div>
    </DashboardLayout>
  );
}