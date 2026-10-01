import Link from "next/link";
import { Alert } from "@/components/common/Alert";
import { Card } from "@/components/common/Card";
import { createClient } from "@/lib/supabase/server";
import { fechaClaveChile, fechaHoraActualChile, horaChile, obtenerDiasSemana, obtenerFechaInicioSemana, obtenerRangoSemanaUTC, zonaHorariaAgenda } from "@/lib/agenda";
import { EstadoCitaForm, NuevaCitaForm, type PacienteAgenda } from "@/features/agenda/CitaForms";

const estados = ["agendada", "confirmada", "en_espera", "atendida", "cancelada", "no_asiste"] as const;
type EstadoCita = (typeof estados)[number];

const estadoInfo: Record<EstadoCita, { nombre: string; estilo: string; punto: string }> = {
  agendada: { nombre: "Agendada", estilo: "border-sky-200 bg-sky-50 text-sky-900", punto: "bg-sky-500" },
  confirmada: { nombre: "Confirmada", estilo: "border-teal-200 bg-teal-50 text-teal-900", punto: "bg-teal-600" },
  en_espera: { nombre: "En espera", estilo: "border-amber-200 bg-amber-50 text-amber-900", punto: "bg-amber-500" },
  atendida: { nombre: "Atendida", estilo: "border-emerald-200 bg-emerald-50 text-emerald-900", punto: "bg-emerald-600" },
  cancelada: { nombre: "Cancelada", estilo: "border-slate-200 bg-slate-100 text-slate-600", punto: "bg-slate-400" },
  no_asiste: { nombre: "No asistió", estilo: "border-red-200 bg-red-50 text-red-900", punto: "bg-red-500" },
};

function avanzarFecha(fecha: string, dias: number): string {
  const nueva = new Date(`${fecha}T12:00:00Z`);
  nueva.setUTCDate(nueva.getUTCDate() + dias);
  return nueva.toISOString().slice(0, 10);
}

function enlaceAgenda(fecha: string, estado?: string, citaId?: string): string {
  const parametros = new URLSearchParams({ fecha });
  if (estado) parametros.set("estado", estado);
  if (citaId) parametros.set("cita", citaId);
  return `/agenda?${parametros.toString()}`;
}

function etiquetaRango(inicio: string, fin: string): string {
  const formatear = (fecha: string, incluirAnio: boolean) => new Intl.DateTimeFormat("es-CL", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(incluirAnio ? { year: "numeric" } : {}),
  }).format(new Date(`${fecha}T12:00:00Z`));
  return `${formatear(inicio, false)} – ${formatear(fin, true)}`;
}

function etiquetaFechaCompleta(fecha: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: zonaHorariaAgenda,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(fecha));
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ fecha?: string; cita?: string; estado?: string }> }) {
  const parametros = await searchParams;
  const inicioSemana = obtenerFechaInicioSemana(parametros.fecha);
  const dias = obtenerDiasSemana(inicioSemana);
  const finSemana = dias[6].fecha;
  const [desde, hasta] = obtenerRangoSemanaUTC(inicioSemana);
  const estadoSeleccionado = estados.includes(parametros.estado as EstadoCita) ? parametros.estado as EstadoCita : "";
  const supabase = await createClient();

  const [{ data: citasDb, error: errorCitas }, { data: pacientesOpciones, error: errorPacientes }] = await Promise.all([
    supabase.from("cita").select("id, paciente_id, usuario_id, fecha_hora, estado, motivo_consulta")
      .gte("fecha_hora", desde).lt("fecha_hora", hasta).order("fecha_hora"),
    supabase.from("paciente").select("id, nombre, apellido_paterno, apellido_materno")
      .order("apellido_paterno").order("nombre").limit(1000),
  ]);

  const citasSemana = (citasDb ?? []).filter((cita) => {
    const fechaCita = fechaClaveChile(new Date(cita.fecha_hora));
    return fechaCita >= inicioSemana && fechaCita <= finSemana;
  });
  const pacienteIds = [...new Set(citasSemana.map((cita) => cita.paciente_id))];
  const usuarioIds = [...new Set(citasSemana.map((cita) => cita.usuario_id).filter((id): id is string => Boolean(id)))];
  const [{ data: pacientesCita }, { data: usuariosCita }] = await Promise.all([
    pacienteIds.length
      ? supabase.from("paciente").select("id, nombre, apellido_paterno, apellido_materno").in("id", pacienteIds)
      : Promise.resolve({ data: [] as PacienteAgenda[] }),
    usuarioIds.length
      ? supabase.from("usuario").select("id, nombre").in("id", usuarioIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);

  const pacientePorId = new Map((pacientesCita ?? []).map((paciente) => [paciente.id, paciente]));
  const profesionalPorId = new Map((usuariosCita ?? []).map((usuario) => [usuario.id, usuario.nombre]));
  const citasVisibles = estadoSeleccionado ? citasSemana.filter((cita) => cita.estado === estadoSeleccionado) : citasSemana;
  const citaSeleccionada = citasSemana.find((cita) => cita.id === parametros.cita) ?? citasVisibles[0] ?? null;
  const citaSeleccionadaPaciente = citaSeleccionada ? pacientePorId.get(citaSeleccionada.paciente_id) : null;
  const pacientes = (pacientesOpciones ?? []) as PacienteAgenda[];
  const citasFueraHorario = citasVisibles.filter((cita) => {
    const hora = Number(horaChile(cita.fecha_hora).slice(0, 2));
    return hora < 8 || hora > 18;
  });
  const horas = Array.from({ length: 11 }, (_, indice) => indice + 8);
  const hoy = fechaClaveChile(new Date());
  const filtros = ["todas", ...estados] as const;

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-700">Organización clínica</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Agenda clínica</h1>
          <p className="mt-1 text-sm text-slate-500">{etiquetaRango(inicioSemana, finSemana)} · {citasSemana.length} {citasSemana.length === 1 ? "cita" : "citas"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Navegación semanal" className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
            <Link className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100" href={enlaceAgenda(avanzarFecha(inicioSemana, -7), estadoSeleccionado)} aria-label="Semana anterior">‹</Link>
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href={enlaceAgenda(hoy, estadoSeleccionado)}>Hoy</Link>
            <Link className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100" href={enlaceAgenda(avanzarFecha(inicioSemana, 7), estadoSeleccionado)} aria-label="Semana siguiente">›</Link>
          </nav>
          <details className="relative">
            <summary className="flex h-11 cursor-pointer list-none items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">
              <span aria-hidden="true" className="mr-2 text-lg leading-none">+</span>Nueva cita
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Agendar paciente</h2>
              {errorPacientes ? <Alert>No pudimos cargar pacientes para agendar.</Alert> : <NuevaCitaForm pacientes={pacientes} fechaHoraMinima={fechaHoraActualChile()} />}
            </div>
          </details>
        </div>
      </header>

      <Card className="p-3">
        <nav aria-label="Filtrar citas por estado" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase text-slate-500">Estado</span>
          {filtros.map((estado) => {
            const activo = estado === "todas" ? !estadoSeleccionado : estadoSeleccionado === estado;
            const nombre = estado === "todas" ? "Todas" : estadoInfo[estado].nombre;
            return (
              <Link key={estado} href={enlaceAgenda(inicioSemana, estado === "todas" ? undefined : estado)} aria-current={activo ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activo ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>
                {estado !== "todas" && <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${estadoInfo[estado].punto}`} />}{nombre}
              </Link>
            );
          })}
          <span className="ml-auto text-xs text-slate-500">Zona horaria: Santiago</span>
        </nav>
      </Card>

      {errorCitas && <Alert>No pudimos cargar la agenda. Verifica tu conexión e inténtalo nuevamente.</Alert>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <Card className="min-w-0 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-16 px-3 py-3 text-[10px] font-semibold uppercase text-slate-400">Hora</th>
                  {dias.map((dia) => (
                    <th key={dia.fecha} className={`px-2 py-3 text-center ${dia.esHoy ? "bg-teal-50" : ""}`}>
                      <span className="block text-[10px] font-semibold uppercase text-slate-500">{dia.dia}</span>
                      <span className={`mt-1 inline-grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${dia.esHoy ? "bg-teal-700 text-white" : "text-slate-800"}`}>{dia.numero}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horas.map((hora) => (
                  <tr key={hora} className="h-[76px] border-b border-slate-100 last:border-0">
                    <th className="align-top px-3 pt-2 text-[10px] font-medium text-slate-400">{String(hora).padStart(2, "0")}:00</th>
                    {dias.map((dia) => {
                      const citasCelda = citasVisibles.filter((cita) => fechaClaveChile(new Date(cita.fecha_hora)) === dia.fecha && Number(horaChile(cita.fecha_hora).slice(0, 2)) === hora);
                      return (
                        <td key={dia.fecha} className={`border-l border-slate-100 p-1 align-top ${dia.esHoy ? "bg-teal-50/40" : ""}`}>
                          <div className="grid gap-1">
                            {citasCelda.map((cita) => {
                              const paciente = pacientePorId.get(cita.paciente_id);
                              const estado = estadoInfo[cita.estado as EstadoCita] ?? estadoInfo.agendada;
                              const seleccionado = citaSeleccionada?.id === cita.id;
                              return (
                                <Link key={cita.id} href={enlaceAgenda(inicioSemana, estadoSeleccionado || undefined, cita.id)}
                                  aria-current={seleccionado ? "true" : undefined}
                                  className={`block rounded-md border px-2 py-1.5 text-left leading-tight hover:brightness-[0.98] ${estado.estilo} ${seleccionado ? "ring-2 ring-teal-700 ring-offset-1" : ""}`}>
                                  <span className="block font-semibold">{horaChile(cita.fecha_hora)} · {paciente?.nombre ?? "Paciente"}</span>
                                  <span className="mt-0.5 block truncate text-[10px]">{paciente?.apellido_paterno ?? ""} · {estado.nombre}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {citasFueraHorario.length > 0 && (
            <div className="border-t border-slate-200 px-4 py-3">
              <h2 className="text-xs font-semibold text-slate-600">Fuera del horario visible</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {citasFueraHorario.map((cita) => {
                  const paciente = pacientePorId.get(cita.paciente_id);
                  return <li key={cita.id}><Link className="text-xs font-medium text-teal-800 hover:underline" href={enlaceAgenda(inicioSemana, estadoSeleccionado || undefined, cita.id)}>{etiquetaFechaCompleta(cita.fecha_hora)} · {horaChile(cita.fecha_hora)} · {paciente?.nombre ?? "Paciente"} {paciente?.apellido_paterno ?? ""}</Link></li>;
                })}
              </ul>
            </div>
          )}
          {citasVisibles.length === 0 && !errorCitas && <p className="border-t border-slate-100 px-4 py-5 text-center text-sm text-slate-500">No hay citas para este período y estado.</p>}
        </Card>

        <aside aria-label="Detalle de cita" className="grid gap-4">
          {citaSeleccionada && citaSeleccionadaPaciente ? (
            <Card className="grid gap-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">Cita seleccionada</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{citaSeleccionadaPaciente.nombre} {citaSeleccionadaPaciente.apellido_paterno}</h2>
                <p className="mt-1 text-sm text-slate-500">{citaSeleccionadaPaciente.apellido_materno ?? ""}</p>
              </div>
              <div className="grid gap-2 border-y border-slate-100 py-4 text-sm">
                <p className="font-medium text-slate-800">{etiquetaFechaCompleta(citaSeleccionada.fecha_hora)}</p>
                <p className="text-slate-600">{horaChile(citaSeleccionada.fecha_hora)}</p>
                <p className="text-slate-600">Profesional: {profesionalPorId.get(citaSeleccionada.usuario_id ?? "") ?? "Sin asignar"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Motivo de consulta</p>
                <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{citaSeleccionada.motivo_consulta || "Sin motivo registrado"}</p>
              </div>
              <EstadoCitaForm citaId={citaSeleccionada.id} estadoActual={citaSeleccionada.estado} />
              <Link className="text-center text-sm font-medium text-teal-800 hover:underline" href={`/patients/${citaSeleccionada.paciente_id}`}>Abrir ficha del paciente</Link>
            </Card>
          ) : (
            <Card className="grid min-h-52 place-items-center text-center">
              <div>
                <p className="font-semibold text-slate-800">Sin cita seleccionada</p>
                <p className="mt-2 text-sm text-slate-500">Selecciona una cita del calendario para revisar sus detalles.</p>
              </div>
            </Card>
          )}
          <Card className="grid gap-2 text-sm">
            <p className="font-semibold text-slate-800">Resumen de la semana</p>
            <p className="text-slate-500">{citasSemana.length} citas en total</p>
            <p className="text-slate-500">{citasSemana.filter((cita) => cita.estado === "confirmada").length} confirmadas</p>
            <p className="text-slate-500">{citasSemana.filter((cita) => cita.estado === "en_espera").length} en espera</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}