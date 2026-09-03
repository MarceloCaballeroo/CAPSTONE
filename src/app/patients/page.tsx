import Link from "next/link";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/layouts/DashboardLayout";
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
    <DashboardLayout>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-700">Gestión clínica</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">Pacientes</h1>
          <p className="mt-2 text-slate-500">Busca y revisa las fichas de tu organización.</p>
        </div>
        <Link href="/patients/nuevo"><Button>Nuevo paciente</Button></Link>
      </header>

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" action="/patients" method="get">
          <label className="sr-only" htmlFor="q">Buscar paciente por nombre o RUT</label>
          <input id="q" name="q" defaultValue={busqueda} placeholder="Buscar por nombre o RUT" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
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
                    <tr key={paciente.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4"><Link className="font-medium text-teal-800 hover:underline" href={`/patients/${paciente.id}`}>{paciente.nombre} {paciente.apellido_paterno} {paciente.apellido_materno ?? ""}</Link></td>
                      <td className="px-6 py-4 text-slate-600">{formatearRut(paciente.rut)}</td>
                      <td className="px-6 py-4"><span className={riesgoPorPaciente.get(paciente.id) === "alto" ? "font-semibold text-red-700" : "text-slate-600"}>{etiquetaRiesgo(riesgoPorPaciente.get(paciente.id))}</span></td>
                      <td className="px-6 py-4 text-slate-600">{paciente.telefono ?? "Sin teléfono"}</td>
                      <td className="px-6 py-4 text-right"><Link className="font-medium text-teal-800 hover:underline" href={`/patients/${paciente.id}`}>Ver ficha</Link></td>
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
    </DashboardLayout>
  );
}