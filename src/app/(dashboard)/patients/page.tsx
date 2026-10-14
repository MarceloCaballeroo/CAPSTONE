import Link from "next/link";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Icono } from "@/components/common/Icono";
import { RiesgoBadge, estilosRiesgo, etiquetaRiesgo } from "@/components/common/RiesgoBadge";
import { fechaCortaChile } from "@/lib/agenda";
import { GRUPOS_IWGDF, textoControlSugerido, type NivelRiesgo } from "@/lib/clinical-rules";
import { obtenerEstadoClinico, type EstadoClinico } from "@/lib/estado-clinico";
import { createClient } from "@/lib/supabase/server";
import { formatearRut } from "@/lib/validations/patients";

const pacientesPorPagina = 10;
const niveles = (Object.keys(GRUPOS_IWGDF) as NivelRiesgo[]).reverse();
const filtros = ["todos", "alertas", "vencido", ...niveles, "sin"] as const;
type Filtro = (typeof filtros)[number];

const tieneAlertas = (estado: EstadoClinico) => estado.derivacionAbierta || estado.alertasBloqueantes.length > 0;
const cumpleFiltro: Record<Exclude<Filtro, "todos" | "sin">, (estado: EstadoClinico) => boolean> = {
  alertas: tieneAlertas,
  vencido: (estado) => estado.controlVencido,
  alto: (estado) => estado.nivel === "alto",
  moderado: (estado) => estado.nivel === "moderado",
  bajo: (estado) => estado.nivel === "bajo",
  muy_bajo: (estado) => estado.nivel === "muy_bajo",
};

const tiempoRelativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function proximoControl(estado: EstadoClinico | undefined): { texto: string; clase: string } {
  if (!estado) return { texto: "Primera evaluación pendiente", clase: "text-slate-600" };
  const dias = Math.round((estado.limiteControl.getTime() - Date.now()) / 86_400_000);
  if (dias < 0) {
    const semanas = Math.round(-dias / 7);
    return { texto: `Vencido ${semanas >= 2 ? tiempoRelativo.format(-semanas, "week") : tiempoRelativo.format(dias, "day")}`, clase: "font-semibold text-red-700" };
  }
  return { texto: `Antes del ${fechaCortaChile(estado.limiteControl)}`, clase: dias <= 30 ? "font-medium text-amber-800" : "text-slate-700" };
}

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string; filtro?: string }> }) {
  const parametros = await searchParams;
  const busqueda = parametros.q?.trim() ?? "";
  const filtro: Filtro = filtros.includes(parametros.filtro as Filtro) ? parametros.filtro as Filtro : "todos";
  const pagina = Math.max(Number(parametros.pagina ?? "1") || 1, 1);
  const desde = (pagina - 1) * pacientesPorPagina;
  const supabase = await createClient();

  const [estados, { count: totalPacientes }] = await Promise.all([
    obtenerEstadoClinico(supabase),
    supabase.from("paciente").select("id", { count: "exact", head: true }),
  ]);
  const listaEstados = [...(estados ?? [])];
  const conteo = (clave: Filtro) => clave === "todos" ? totalPacientes ?? 0
    : clave === "sin" ? Math.max((totalPacientes ?? 0) - listaEstados.length, 0)
    : listaEstados.filter(([, estado]) => cumpleFiltro[clave](estado)).length;

  // ponytail: el filtro clínico se resuelve con la lista de ids en la URL de la consulta; sirve hasta unos cientos de
  // pacientes por filtro. Con más volumen, filtrar en una vista SQL de estado clínico.
  const idsFiltro = filtro === "todos" || filtro === "sin" ? null : listaEstados.filter(([, estado]) => cumpleFiltro[filtro](estado)).map(([id]) => id);
  const filtroNoDisponible = filtro !== "todos" && !estados;

  let pacientesData: { id: string; nombre: string; apellido_paterno: string; apellido_materno: string | null; rut: string; telefono: string | null; consentimiento: boolean }[] = [];
  let count = 0;
  let error = false;
  if (!filtroNoDisponible && idsFiltro?.length !== 0) {
    let consulta = supabase
      .from("paciente")
      .select("id, nombre, apellido_paterno, apellido_materno, rut, telefono, consentimiento", { count: "exact" })
      .order("apellido_paterno", { ascending: true })
      .range(desde, desde + pacientesPorPagina - 1);
    if (busqueda) {
      const termino = busqueda.replace(/[(),]/g, "");
      consulta = consulta.or(`nombre.ilike.%${termino}%,apellido_paterno.ilike.%${termino}%,rut.ilike.%${termino}%`);
    }
    if (idsFiltro) consulta = consulta.in("id", idsFiltro);
    if (filtro === "sin" && listaEstados.length) consulta = consulta.not("id", "in", `(${listaEstados.map(([id]) => id).join(",")})`);
    const resultado = await consulta;
    pacientesData = resultado.data ?? [];
    count = resultado.count ?? 0;
    error = Boolean(resultado.error);
  }

  const totalPaginas = Math.max(Math.ceil(count / pacientesPorPagina), 1);
  const enlace = (cambios: { filtro?: Filtro; pagina?: number }) => {
    const nuevos = new URLSearchParams();
    if (busqueda) nuevos.set("q", busqueda);
    const filtroEnlace = cambios.filtro ?? filtro;
    if (filtroEnlace !== "todos") nuevos.set("filtro", filtroEnlace);
    if (cambios.pagina && cambios.pagina > 1) nuevos.set("pagina", String(cambios.pagina));
    return `/patients${nuevos.size ? `?${nuevos}` : ""}`;
  };
  const nombreFiltro = (clave: Filtro) => ({ todos: "Todos", alertas: "Con alertas", vencido: "Control vencido", sin: "Sin evaluación" } as Record<string, string>)[clave] ?? etiquetaRiesgo(clave as NivelRiesgo);
  const puntoFiltro = (clave: Filtro) => clave === "alertas" ? "bg-red-600" : clave === "vencido" ? "bg-amber-500" : clave === "sin" ? "bg-slate-400" : clave === "todos" ? "" : estilosRiesgo[clave].barra;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-700">Gestión clínica <span className="text-slate-300">/</span> Directorio</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Pacientes</h1>
          <p className="mt-2 text-base text-slate-600">{totalPacientes ?? 0} pacientes. Revisa primero quienes tienen <b className="text-red-700">alertas</b> o el <b className="text-amber-800">control vencido</b>.</p>
        </div>
        <Link href="/patients/nuevo"><Button><Icono nombre="pacientes" className="h-4 w-4" />Registrar paciente</Button></Link>
      </header>

      <Card className="grid gap-4 p-4 sm:p-5">
        <form className="grid gap-1.5" action="/patients" method="get">
          <label className="text-sm font-medium text-slate-700" htmlFor="q">Buscar paciente</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 text-slate-500 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-100">
              <Icono nombre="buscar" className="h-4 w-4" />
              <input id="q" name="q" defaultValue={busqueda} placeholder="Nombre, apellido o RUT (ej.: 12.345.678-5)" className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none" />
            </div>
            {filtro !== "todos" && <input type="hidden" name="filtro" value={filtro} />}
            <Button type="submit" variant="secondary">Buscar</Button>
          </div>
        </form>
        <div className="grid gap-2">
          <p className="text-sm font-medium text-slate-700">Mostrar</p>
          <nav aria-label="Filtrar pacientes" className="flex flex-wrap gap-2">
            {filtros.map((clave) => {
              const activo = clave === filtro;
              return (
                <Link key={clave} href={enlace({ filtro: clave })} aria-current={activo ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${activo ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>
                  {puntoFiltro(clave) && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${puntoFiltro(clave)}`} />}
                  {nombreFiltro(clave)}
                  {(estados || clave === "todos") && <span className="opacity-70">{conteo(clave)}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
        <span className="inline-flex items-center gap-1.5 font-semibold"><Icono nombre="info" className="h-4 w-4" />Cómo leer el riesgo IWGDF</span>
        {[...niveles].reverse().map((nivel) => (
          <span key={nivel}><b>G{GRUPOS_IWGDF[nivel].grupo}</b> {GRUPOS_IWGDF[nivel].define.replace(/\.$/, "").toLowerCase()} · control {textoControlSugerido(nivel)}</span>
        ))}
      </div>

      <div className="mt-4">
        {filtroNoDisponible ? <Alert>No pudimos consultar el estado clínico para aplicar este filtro. Intenta nuevamente.</Alert>
          : error ? <Alert>No pudimos cargar los pacientes. Intenta nuevamente.</Alert>
          : pacientesData.length === 0 ? (
            <Card><p className="text-center text-slate-500">{busqueda || filtro !== "todos" ? "No encontramos pacientes con esa búsqueda o filtro." : "Todavía no hay pacientes registrados."}</p></Card>
          ) : (
            <Card className="overflow-hidden p-0">
              {!estados && <div className="p-4"><Alert>No pudimos consultar el riesgo y las alertas. Revisa la ficha de cada paciente.</Alert></div>}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-6 py-4 font-semibold">Paciente</th><th className="px-4 py-4 font-semibold">Riesgo IWGDF</th><th className="px-4 py-4 font-semibold">Próximo control</th><th className="px-4 py-4 font-semibold">Alertas</th><th className="px-6 py-4 text-right font-semibold">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pacientesData.map((paciente) => {
                      const estado = estados?.get(paciente.id);
                      const control = proximoControl(estado);
                      const sinAlertas = !estado?.alertasBloqueantes.length && !estado?.derivacionAbierta && paciente.consentimiento;
                      return (
                        <tr key={paciente.id} className="transition-colors hover:bg-teal-50/40">
                          <td className="px-6 py-4">
                            <Link className="flex items-center gap-3 text-slate-900 hover:text-teal-800" href={`/patients/${paciente.id}`}>
                              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-50 text-xs font-semibold text-teal-800">{`${paciente.nombre[0] ?? ""}${paciente.apellido_paterno[0] ?? ""}`.toUpperCase()}</span>
                              <span>
                                <span className="font-semibold">{paciente.nombre} {paciente.apellido_paterno} {paciente.apellido_materno ?? ""}</span>
                                <span className="mt-0.5 block font-mono text-xs text-slate-500">{formatearRut(paciente.rut)} · {paciente.telefono ?? "Sin teléfono"}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-4">{estados && <RiesgoBadge nivel={estado?.nivel} escala />}</td>
                          <td className="px-4 py-4">
                            {estados && <>
                              <span className={`block ${control.clase}`}>{control.texto}</span>
                              {estado && <span className="mt-0.5 block text-xs text-slate-500">Última atención: {fechaCortaChile(estado.ultimaAtencion)}</span>}
                            </>}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex max-w-60 flex-wrap gap-1">
                              {estado?.alertasBloqueantes.map((alerta) => <span key={alerta} title={alerta} className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">No invasivo</span>)}
                              {estado?.derivacionAbierta && <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Derivación pendiente</span>}
                              {!paciente.consentimiento && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Consentimiento pendiente</span>}
                              {sinAlertas && estados && <span className="text-xs text-slate-400">Sin alertas</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <Link className="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:border-slate-400" href={`/agenda?nuevo=${paciente.id}`}>Agendar</Link>
                              <Link className="inline-flex min-h-9 items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 hover:border-teal-700" href={`/patients/${paciente.id}`}>Ver ficha<Icono nombre="flecha" className="h-3.5 w-3.5" /></Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
            {pagina > 1 && <Link href={enlace({ pagina: pagina - 1 })}><Button variant="secondary">← Anterior</Button></Link>}
            {pagina < totalPaginas && <Link href={enlace({ pagina: pagina + 1 })}><Button variant="secondary">Siguiente →</Button></Link>}
          </div>
        </nav>
      )}
    </>
  );
}
