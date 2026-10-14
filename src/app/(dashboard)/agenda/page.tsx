import Link from "next/link";
import { Alert } from "@/components/common/Alert";
import { Card } from "@/components/common/Card";
import { Icono } from "@/components/common/Icono";
import { RiesgoBadge } from "@/components/common/RiesgoBadge";
import { avanzarFecha, fechaClaveChile, fechaCortaChile, fechaHoraActualChile, horaChile, obtenerDiasSemana, obtenerFechaInicioSemana, obtenerRangoSemanaUTC, zonaHorariaAgenda } from "@/lib/agenda";
import { textoControlSugerido } from "@/lib/clinical-rules";
import { obtenerEstadoClinico } from "@/lib/estado-clinico";
import { createClient } from "@/lib/supabase/server";
import { EstadoCitaForm, NuevaCitaForm, type PacienteAgenda } from "@/features/agenda/CitaForms";
import { EstadoChip, estadoInfo, estadosCita, infoEstado, type EstadoCita } from "@/features/agenda/estados";

const altoHora = 72;

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
  }).format(new Date(fecha));
}

function minutosDesdeInicio(fecha: string, horaInicio: number): number {
  const [hora, minuto] = horaChile(fecha).split(":").map(Number);
  return (hora - horaInicio) * 60 + minuto;
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ fecha?: string; cita?: string; estado?: string; nuevo?: string }> }) {
  const parametros = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfilOrganizacion } = user
    ? await supabase.from("usuario").select("organizacion:organizacion_id(jornada_inicio, jornada_fin, dias_atencion)").eq("id", user.id).maybeSingle()
    : { data: null };
  const preferencias = perfilOrganizacion?.organizacion as unknown as { jornada_inicio: number; jornada_fin: number; dias_atencion: number[] } | null;
  const horaInicio = preferencias?.jornada_inicio ?? 8;
  const horaFin = preferencias?.jornada_fin ?? 19;
  const diasAtencion = preferencias?.dias_atencion ?? [1, 2, 3, 4, 5, 6, 7];
  const citaSolicitada = parametros.cita
    ? (await supabase.from("cita").select("fecha_hora").eq("id", parametros.cita).maybeSingle()).data
    : null;
  const inicioSemana = obtenerFechaInicioSemana(parametros.fecha ?? (citaSolicitada ? fechaClaveChile(new Date(citaSolicitada.fecha_hora)) : undefined));
  const semana = obtenerDiasSemana(inicioSemana);
  const finSemana = semana[6].fecha;
  const [desde, hasta] = obtenerRangoSemanaUTC(inicioSemana);
  const estadoSeleccionado = estadosCita.includes(parametros.estado as EstadoCita) ? parametros.estado as EstadoCita : "";

  const [{ data: citasDb, error: errorCitas }, { data: pacientesOpciones, error: errorPacientes }] = await Promise.all([
    supabase.from("cita").select("id, paciente_id, usuario_id, fecha_hora, fecha_hora_fin, estado, motivo_consulta")
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
  const [{ data: pacientesCita }, { data: usuariosCita }, estados] = await Promise.all([
    pacienteIds.length
      ? supabase.from("paciente").select("id, nombre, apellido_paterno, apellido_materno, consentimiento").in("id", pacienteIds)
      : Promise.resolve({ data: [] as (PacienteAgenda & { consentimiento: boolean })[] }),
    usuarioIds.length
      ? supabase.from("usuario").select("id, nombre").in("id", usuarioIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    obtenerEstadoClinico(supabase, pacienteIds),
  ]);

  const pacientePorId = new Map((pacientesCita ?? []).map((paciente) => [paciente.id, paciente]));
  const profesionalPorId = new Map((usuariosCita ?? []).map((usuario) => [usuario.id, usuario.nombre]));
  const citasVisibles = estadoSeleccionado ? citasSemana.filter((cita) => cita.estado === estadoSeleccionado) : citasSemana;
  const citaSeleccionada = citasSemana.find((cita) => cita.id === parametros.cita) ?? citasVisibles[0] ?? null;
  const citaSeleccionadaPaciente = citaSeleccionada ? pacientePorId.get(citaSeleccionada.paciente_id) : null;
  const estadoClinicoSeleccionado = citaSeleccionada ? estados?.get(citaSeleccionada.paciente_id) : undefined;
  const pacientes = (pacientesOpciones ?? []) as PacienteAgenda[];
  const citasFueraHorario = citasVisibles.filter((cita) => {
    const minutos = minutosDesdeInicio(cita.fecha_hora, horaInicio);
    return minutos < 0 || minutos >= (horaFin - horaInicio) * 60;
  });
  const horas = Array.from({ length: horaFin - horaInicio }, (_, indice) => indice + horaInicio);
  const hoy = fechaClaveChile(new Date());
  const minutosAhora = minutosDesdeInicio(new Date().toISOString(), horaInicio);
  // Solo días de atención, salvo que un día no laboral tenga citas (para no ocultarlas).
  const dias = semana.filter((dia, indice) => diasAtencion.includes(indice + 1) || citasVisibles.some((cita) => fechaClaveChile(new Date(cita.fecha_hora)) === dia.fecha));
  const columnas = { gridTemplateColumns: `60px repeat(${dias.length}, minmax(0, 1fr))` };
  const filtros = ["todas", ...estadosCita] as const;
  const conteo = (estado: string) => estado === "todas" ? citasSemana.length : citasSemana.filter((cita) => cita.estado === estado).length;

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-700">Organización clínica</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Agenda clínica</h1>
          <p className="mt-2 text-base text-slate-600">{etiquetaRango(inicioSemana, finSemana)} · {citasSemana.length} {citasSemana.length === 1 ? "cita" : "citas"} · toca una cita para ver qué revisar antes de atender.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Navegación semanal" className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
            <Link className="flex h-10 items-center rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100" href={enlaceAgenda(avanzarFecha(inicioSemana, -7), estadoSeleccionado)}>‹ Semana anterior</Link>
            <Link className="flex h-10 items-center rounded-md bg-slate-100 px-3 text-sm font-semibold text-slate-900 hover:bg-slate-200" href={enlaceAgenda(hoy, estadoSeleccionado)}>Hoy</Link>
            <Link className="flex h-10 items-center rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100" href={enlaceAgenda(avanzarFecha(inicioSemana, 7), estadoSeleccionado)}>Semana siguiente ›</Link>
          </nav>
          <details className="relative" open={Boolean(parametros.nuevo)}>
            <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800">
              <Icono nombre="mas" className="h-4 w-4" />Agendar paciente
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Agendar paciente</h2>
              {errorPacientes ? <Alert>No pudimos cargar pacientes para agendar.</Alert> : <NuevaCitaForm pacientes={pacientes} fechaHoraMinima={fechaHoraActualChile()} pacienteInicial={parametros.nuevo} />}
            </div>
          </details>
        </div>
      </header>

      <Card className="p-3">
        <nav aria-label="Filtrar citas por estado" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span>
          {filtros.map((estado) => {
            const activo = estado === "todas" ? !estadoSeleccionado : estadoSeleccionado === estado;
            return (
              <Link key={estado} href={enlaceAgenda(inicioSemana, estado === "todas" ? undefined : estado)} aria-current={activo ? "page" : undefined}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${activo ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>
                {estado !== "todas" && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${estadoInfo[estado].punto}`} />}
                {estado === "todas" ? "Todas" : estadoInfo[estado].nombre}
                <span className="opacity-70">{conteo(estado)}</span>
              </Link>
            );
          })}
          <span className="ml-auto text-xs text-slate-500">Hora de Santiago</span>
        </nav>
      </Card>

      {errorCitas && <Alert>No pudimos cargar la agenda. Verifica tu conexión e inténtalo nuevamente.</Alert>}
      {!estados && <Alert>No pudimos consultar el riesgo y las alertas clínicas de los pacientes. Revisa la ficha antes de atender.</Alert>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="min-w-0 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[840px]">
              <div className="grid border-b border-slate-200 bg-slate-50" style={columnas}>
                <span />
                {dias.map((dia) => (
                  <div key={dia.fecha} className={`flex flex-col items-center gap-1 border-l border-slate-100 py-2.5 ${dia.esHoy ? "bg-teal-50" : ""}`}>
                    <span className="text-xs font-semibold uppercase text-slate-500">{dia.dia}</span>
                    <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${dia.esHoy ? "bg-teal-700 text-white" : "text-slate-800"}`}>{dia.numero}</span>
                  </div>
                ))}
              </div>
              <div className="grid" style={columnas}>
                <div>
                  {horas.map((hora) => <div key={hora} style={{ height: altoHora }} className="pr-2 pt-1.5 text-right font-mono text-xs text-slate-500">{String(hora).padStart(2, "0")}:00</div>)}
                </div>
                {dias.map((dia) => (
                  <div key={dia.fecha} className={`relative border-l border-slate-100 ${dia.esHoy ? "bg-teal-50/40" : ""}`}
                    style={{ height: altoHora * horas.length, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${altoHora - 1}px, #f1f5f9 ${altoHora - 1}px, #f1f5f9 ${altoHora}px)` }}>
                    {dia.esHoy && minutosAhora >= 0 && minutosAhora < horas.length * 60 && (
                      <div aria-hidden="true" className="absolute inset-x-0 z-20 h-0.5 bg-red-600" style={{ top: (minutosAhora * altoHora) / 60 }}>
                        <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-600" />
                      </div>
                    )}
                    {/* ponytail: citas simultáneas de distintos profesionales (plan clínica) se dibujan superpuestas; si pasa seguido, repartir el ancho del día entre citas que se solapan. */}
                    {citasVisibles.filter((cita) => fechaClaveChile(new Date(cita.fecha_hora)) === dia.fecha && !citasFueraHorario.includes(cita)).map((cita) => {
                      const paciente = pacientePorId.get(cita.paciente_id);
                      const estado = infoEstado(cita.estado);
                      const estadoClinico = estados?.get(cita.paciente_id);
                      const seleccionado = citaSeleccionada?.id === cita.id;
                      const inicio = minutosDesdeInicio(cita.fecha_hora, horaInicio);
                      const duracion = Math.max((Date.parse(cita.fecha_hora_fin) - Date.parse(cita.fecha_hora)) / 60_000, 30);
                      return (
                        <Link key={cita.id} href={enlaceAgenda(inicioSemana, estadoSeleccionado || undefined, cita.id)}
                          aria-current={seleccionado ? "true" : undefined}
                          aria-label={`${horaChile(cita.fecha_hora)} ${paciente?.nombre ?? "Paciente"} ${paciente?.apellido_paterno ?? ""}, ${estado.nombre}${estadoClinico?.alertasBloqueantes.length ? ", no realizar procedimientos invasivos" : ""}`}
                          style={{ top: (inicio * altoHora) / 60 + 2, height: (duracion * altoHora) / 60 - 4 }}
                          className={`absolute inset-x-1 flex flex-col gap-0.5 overflow-hidden rounded-md border px-2 py-1.5 text-xs leading-tight hover:brightness-[0.98] ${estado.estilo} ${cita.estado === "cancelada" ? "line-through" : ""} ${seleccionado ? "z-10 ring-2 ring-teal-700 ring-offset-2" : ""}`}>
                          <span className="flex items-center justify-between gap-1">
                            <span className="truncate font-semibold">{horaChile(cita.fecha_hora)} {paciente?.nombre ?? "Paciente"} {paciente?.apellido_paterno?.[0] ?? ""}.</span>
                            <RiesgoBadge nivel={estadoClinico?.nivel} corto />
                          </span>
                          <span className="flex items-center gap-1 truncate text-[11px]">
                            {estadoClinico?.alertasBloqueantes.length ? <span className="text-red-700"><Icono nombre="alerta" className="h-3 w-3" /></span> : null}
                            {estado.nombre}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5"><span className="rounded border border-red-200 bg-red-50 px-1 text-[10px] font-bold text-red-800">G3</span>Grupo de riesgo IWGDF</span>
            <span className="flex items-center gap-1.5 text-red-700"><Icono nombre="alerta" className="h-3.5 w-3.5" /><span className="text-slate-600">Sin procedimiento invasivo</span></span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 bg-red-600" />Hora actual</span>
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
              <div className="grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Cita seleccionada</p>
                <h2 className="text-xl font-semibold text-slate-900">{citaSeleccionadaPaciente.nombre} {citaSeleccionadaPaciente.apellido_paterno} {citaSeleccionadaPaciente.apellido_materno ?? ""}</h2>
                <p className="text-sm capitalize text-slate-600">{etiquetaFechaCompleta(citaSeleccionada.fecha_hora)} · <span className="font-mono">{horaChile(citaSeleccionada.fecha_hora)} – {horaChile(citaSeleccionada.fecha_hora_fin)}</span></p>
                <p className="text-sm text-slate-600">Profesional: {profesionalPorId.get(citaSeleccionada.usuario_id ?? "") ?? "Sin asignar"}</p>
                <EstadoChip estado={citaSeleccionada.estado} />
              </div>

              {estadoClinicoSeleccionado?.alertasBloqueantes.length ? (
                <div role="alert" className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-red-900">
                  <Icono nombre="alerta" className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-semibold">No realizar procedimientos invasivos</p>
                    <ul className="mt-1 text-sm leading-5">{estadoClinicoSeleccionado.alertasBloqueantes.map((alerta) => <li key={alerta}>{alerta}</li>)}</ul>
                    <p className="mt-1 text-sm">Derivar a evaluación médica.</p>
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Antes de atender</p>
                <dl className="mt-1 divide-y divide-slate-100 text-sm">
                  <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-slate-600">Riesgo IWGDF</dt><dd>{estados ? <RiesgoBadge nivel={estadoClinicoSeleccionado?.nivel} /> : "No disponible"}</dd></div>
                  <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-slate-600">Control sugerido</dt><dd className="font-semibold text-slate-900">{estadoClinicoSeleccionado ? textoControlSugerido(estadoClinicoSeleccionado.nivel) : "Evaluar en esta cita"}</dd></div>
                  <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-slate-600">Última atención</dt><dd className="font-semibold text-slate-900">{estadoClinicoSeleccionado ? fechaCortaChile(estadoClinicoSeleccionado.ultimaAtencion) : "Primera consulta"}</dd></div>
                  {estadoClinicoSeleccionado?.derivacionAbierta && <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-slate-600">Derivación</dt><dd className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Pendiente de respuesta</dd></div>}
                  <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-slate-600">Consentimiento</dt><dd>{citaSeleccionadaPaciente.consentimiento ? <span className="font-semibold text-emerald-800">Registrado</span> : <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Pendiente: pedir firma</span>}</dd></div>
                </dl>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motivo de consulta</p>
                <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{citaSeleccionada.motivo_consulta || "Sin motivo registrado"}</p>
              </div>
              <EstadoCitaForm key={`${citaSeleccionada.id}-${citaSeleccionada.estado}`} citaId={citaSeleccionada.id} estadoActual={citaSeleccionada.estado} />
              <Link className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 text-sm font-medium text-white hover:bg-teal-800" href={`/patients/${citaSeleccionada.paciente_id}`}>Abrir ficha del paciente<Icono nombre="flecha" className="h-4 w-4" /></Link>
            </Card>
          ) : (
            <Card className="grid min-h-52 place-items-center text-center">
              <div>
                <p className="font-semibold text-slate-800">Sin cita seleccionada</p>
                <p className="mt-2 text-sm text-slate-500">Selecciona una cita del calendario para revisar sus detalles.</p>
              </div>
            </Card>
          )}
          <Card className="grid gap-3">
            <p className="font-semibold text-slate-800">Resumen de la semana</p>
            <div className="grid grid-cols-2 gap-2">
              {([["Citas", citasSemana.length], ["Confirmadas", conteo("confirmada")], ["Atendidas", conteo("atendida")], ["No asistieron", conteo("no_asiste")]] as const).map(([etiqueta, valor]) => (
                <div key={etiqueta} className="rounded-lg bg-slate-50 p-3"><p className="text-2xl font-semibold text-slate-900">{valor}</p><p className="text-sm text-slate-500">{etiqueta}</p></div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
