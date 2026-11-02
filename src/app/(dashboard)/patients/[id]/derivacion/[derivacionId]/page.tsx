import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/common/Alert";
import { PrintFichaButton } from "@/features/patients/PrintFichaButton";
import { textoCartaDerivacion } from "@/lib/derivacion";
import { fechaClinica } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import { formatearRut } from "@/lib/validations/patients";

export default async function CartaDerivacionPage({ params }: { params: Promise<{ id: string; derivacionId: string }> }) {
  const { id, derivacionId } = await params;
  const supabase = await createClient();

  const { data: derivacion, error: errorDerivacion } = await supabase
    .from("derivacion")
    .select("id, atencion_id, motivo, especialidad_destino, estado, created_at")
    .eq("id", derivacionId)
    .maybeSingle();
  if (errorDerivacion) return <Alert>No pudimos cargar la derivación.</Alert>;
  if (!derivacion) notFound();

  const { data: atencion } = await supabase
    .from("atencion")
    .select("id, ficha_id, usuario_id, diagnostico_cie10, observaciones, nivel_riesgo_iwgdf, created_at")
    .eq("id", derivacion.atencion_id)
    .maybeSingle();
  if (!atencion) notFound();

  const { data: ficha } = await supabase.from("ficha_clinica").select("paciente_id").eq("id", atencion.ficha_id).maybeSingle();
  if (!ficha || ficha.paciente_id !== id) notFound();

  const { data: paciente } = await supabase
    .from("paciente")
    .select("nombre, apellido_paterno, apellido_materno, rut_numero, rut_dv, organizacion_id")
    .eq("id", id)
    .maybeSingle();
  if (!paciente) notFound();

  const { data: profesional } = atencion.usuario_id
    ? await supabase.from("usuario").select("nombre").eq("id", atencion.usuario_id).maybeSingle()
    : { data: null };

  const { data: diagnostico } = atencion.diagnostico_cie10
    ? await supabase.from("catalogo_cie10").select("codigo, nombre_diagnostico").eq("codigo", atencion.diagnostico_cie10).maybeSingle()
    : { data: null };

  const { data: organizacion } = paciente.organizacion_id
    ? await supabase.from("organizacion").select("nombre").eq("id", paciente.organizacion_id).maybeSingle()
    : { data: null };

  const carta = textoCartaDerivacion({
    paciente: {
      nombre: paciente.nombre,
      apellidoPaterno: paciente.apellido_paterno,
      apellidoMaterno: paciente.apellido_materno,
      rut: formatearRut(paciente.rut_numero, paciente.rut_dv),
    },
    profesional: profesional?.nombre ?? "Profesional de PodoCare",
    organizacion: organizacion?.nombre ?? "PodoCare",
    especialidad: derivacion.especialidad_destino,
    motivo: derivacion.motivo,
    diagnostico: diagnostico ? { codigo: diagnostico.codigo, nombre: diagnostico.nombre_diagnostico } : null,
  });

  return (
    <div className="mx-auto max-w-3xl print:max-w-none">
      <div className="print-hidden mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-medium text-teal-800 hover:underline" href={`/patients/${id}`}>← Volver a la ficha</Link>
        <PrintFichaButton />
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-teal-700">PODOCARE</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Carta de derivación</h1>
            <p className="mt-1 text-sm text-slate-500">{organizacion?.nombre ?? "PodoCare"}</p>
          </div>
          <Image src="/podocare-sello.png" alt="" width={56} height={56} className="h-14 w-14 shrink-0" />
        </header>

        <p className="mt-6 text-sm text-slate-500">{fechaClinica(derivacion.created_at)}</p>

        <p className="mt-6 text-sm font-medium text-slate-900">A quien corresponda</p>

        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
          {carta.cuerpo.map((parrafo) => <p key={parrafo}>{parrafo}</p>)}
          {carta.diagnostico && <p><span className="font-medium text-slate-900">Diagnóstico CIE-10:</span> {carta.diagnostico}</p>}
          {atencion.observaciones && <p><span className="font-medium text-slate-900">Observaciones:</span> {atencion.observaciones}</p>}
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-700">Sin otro particular, saluda atentamente,</p>
          <p className="mt-8 whitespace-pre-line text-sm font-semibold text-slate-900">{carta.firma}</p>
        </footer>
      </article>
    </div>
  );
}
