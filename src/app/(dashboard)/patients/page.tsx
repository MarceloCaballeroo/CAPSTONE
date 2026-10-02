import Link from "next/link";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { createClient } from "@/lib/supabase/server";
import { formatearRut } from "@/lib/validations/patients";

const pacientesPorPagina = 10;

function etiquetaRiesgo(riesgo: string | undefined): string {
  return {
    muy_bajo: "Muy bajo",
    bajo: "Bajo",
    moderado: "Moderado",
    alto: "Alto",
  }[riesgo ?? ""] ?? "Sin atenciones";
}

function clasesRiesgo(riesgo: string | undefined): string {
  return {
    muy_bajo: "border-emerald-200 bg-emerald-50 text-emerald-800",
    bajo: "border-teal-200 bg-teal-50 text-teal-800",
    moderado: "border-amber-200 bg-amber-50 text-amber-800",
    alto: "border-red-200 bg-red-50 text-red-800",
  }[riesgo ?? ""] ?? "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const parametros = await searchParams;
  const busqueda = parametros.q?.trim() ?? "";
  const pagina = Math.max(Number(parametros.pagina ?? "1") || 1, 1);
  const desde = (pagina - 1) * pacientesPorPagina;
  const hasta = desde + pacientesPorPagina - 1;
  const supabase = await createClient();
  let consulta = supabase
    .from("paciente")
    .select("id, nombre, apellido_paterno, apellido_materno, rut, telefono, consentimiento, created_at", { count: "exact" })
    .order("apellido_paterno", { ascending: true })
    .range(desde, hasta);

  if (busqueda) {
    const termino = busqueda.replace(/[(),]/g, "");
    consulta = consulta.or(`nombre.ilike.%${termino}%,apellido_paterno.ilike.%${termino}%,rut.ilike.%${termino}%`);
  }

  const { data: pacientes, count, error } = await consulta;
  const pacientesData = pacientes ?? [];
  const pacienteIds = pacientesData.map((paciente) => paciente.id);
  const fichas = pacienteIds.length ? await supabase.from("ficha_clinica").select("id, paciente_id").in("paciente_id", pacienteIds) : { data: [], error: null };
  const fichaIds = fichas.data?.map((ficha) => ficha.id) ?? [];
  const atenciones = fichaIds.length ? await supabase.from("atencion").select("ficha_id, nivel_riesgo_iwgdf, created_at").in("ficha_id", fichaIds).order("created_at", { ascending: false }) : { data: [], error: null };
  const riesgoPorPaciente = new Map<string, string>();

  for (const atencion of atenciones.data ?? []) {
    const ficha = fichas.data?.find((item) => item.id === atencion.ficha_id);
    if (ficha && !riesgoPorPaciente.has(ficha.paciente_id)) riesgoPorPaciente.set(ficha.paciente_id, atencion.nivel_riesgo_iwgdf);
  }

  const totalPaginas = Math.max(Math.ceil((count ?? 0) / pacientesPorPagina), 1);

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-700">Gestión clínica <span className="text-slate-300">/</span> Directorio</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Pacientes</h1>
          <p className="mt-2 text-sm text-slate-500">Consulta datos de contacto y estado clínico reciente.</p>
        </div>
        <Link href="/patients/nuevo"><Button>Nuevo paciente</Button></Link>
      </header>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <form className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row" action="/patients" method="get">
            <label className="sr-only" htmlFor="q">Buscar paciente por nombre o RUT</label>
            <input id="q" name="q" defaultValue={busqueda} placeholder="Buscar por nombre o RUT" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
            <Button type="submit" variant="secondary">Buscar</Button>
          </form>
          <p className="shrink-0 text-sm text-slate-500"><span className="font-semibold text-slate-900">{count ?? 0}</span> {(count ?? 0) === 1 ? "paciente" : "pacientes"}</p>
        </div>
      </Card>

      <div className="mt-6">
        {error ? <Alert>No pudimos cargar los pacientes. Intenta nuevamente.</Alert> : pacientesData.length === 0 ? (
          <Card><p className="text-center text-slate-500">{busqueda ? "No encontramos pacientes con esa búsqueda." : "Todavía no hay pacientes registrados."}</p></Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-6 py-4 font-medium">Paciente</th><th className="px-6 py-4 font-medium">RUT</th><th className="px-6 py-4 font-medium">Riesgo IWGDF</th><th className="px-6 py-4 font-medium">Contacto</th><th className="px-6 py-4"><span className="sr-only">Acciones</span></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pacientesData.map((paciente) => (
                    <tr key={paciente.id} className="transition-colors hover:bg-teal-50/40">
                      <td className="px-6 py-4"><Link className="flex items-center gap-3 font-medium text-slate-900 hover:text-teal-800" href={`/patients/${paciente.id}`}><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-xs font-semibold text-teal-800">{`${paciente.nombre[0] ?? ""}${paciente.apellido_paterno[0] ?? ""}`.toUpperCase()}</span><span>{paciente.nombre} {paciente.apellido_paterno} {paciente.apellido_materno ?? ""}<span className="mt-0.5 block text-xs font-normal text-slate-500">{paciente.consentimiento ? "Consentimiento registrado" : "Consentimiento pendiente"}</span></span></Link></td>
                      <td className="px-6 py-4 text-slate-600">{formatearRut(paciente.rut)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${clasesRiesgo(riesgoPorPaciente.get(paciente.id))}`}>{etiquetaRiesgo(riesgoPorPaciente.get(paciente.id))}</span></td>
                      <td className="px-6 py-4 text-slate-600">{paciente.telefono ?? "Sin teléfono"}</td>
                      <td className="px-6 py-4 text-right"><Link className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-teal-800 transition-colors hover:border-teal-700 hover:bg-white" href={`/patients/${paciente.id}`}>Ver ficha <span aria-hidden="true" className="ml-1">→</span></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {totalPaginas > 1 && (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Paginación de pacientes">
          <span className="text-slate-500">Página {pagina} de {totalPaginas}</span>
          <div className="flex gap-2">
            {pagina > 1 && <Link href={`/patients?q=${encodeURIComponent(busqueda)}&pagina=${pagina - 1}`}><Button variant="secondary">Anterior</Button></Link>}
            {pagina < totalPaginas && <Link href={`/patients?q=${encodeURIComponent(busqueda)}&pagina=${pagina + 1}`}><Button variant="secondary">Siguiente</Button></Link>}
          </div>
        </nav>
      )}
    </>
  );
}