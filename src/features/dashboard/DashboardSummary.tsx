import Link from "next/link";
import { Alert } from "@/components/common/Alert";
import { Card } from "@/components/common/Card";
import { Icono, type NombreIcono } from "@/components/common/Icono";
import { RiesgoBadge, etiquetaRiesgo, estilosRiesgo } from "@/components/common/RiesgoBadge";
import { EstadoChip } from "@/features/agenda/estados";
import { avanzarFecha, convertirFechaHoraChileAISO, fechaClaveChile, fechaCortaChile, horaChile, zonaHorariaAgenda } from "@/lib/agenda";
import { GRUPOS_IWGDF, textoControlSugerido, type NivelRiesgo } from "@/lib/clinical-rules";
import { obtenerEstadoClinico } from "@/lib/estado-clinico";
import { createClient } from "@/lib/supabase/server";

const estadosDerivacionAbierta = ["pendiente", "enviada", "aceptada"] as const;
const niveles = Object.keys(GRUPOS_IWGDF) as NivelRiesgo[];

function saludo(): string {
  const hora = Number(new Intl.DateTimeFormat("es-CL", { timeZone: zonaHorariaAgenda, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
}

const esFutura = (fecha: string) => Date.parse(fecha) >= Date.now();

export async function DashboardSummary() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hoy = fechaClaveChile(new Date());

  const [perfil, pacientes, citasHoy, derivaciones, estados] = await Promise.all([
    user ? supabase.from("usuario").select("nombre").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("paciente").select("id", { count: "exact", head: true }),
    supabase.from("cita").select("id, paciente_id, fecha_hora, estado, motivo_consulta")
      .gte("fecha_hora", convertirFechaHoraChileAISO(`${hoy}T00:00`))
      .lt("fecha_hora", convertirFechaHoraChileAISO(`${avanzarFecha(hoy, 1)}T00:00`))
      .order("fecha_hora"),
    supabase.from("derivacion").select("id", { count: "exact", head: true }).in("estado", estadosDerivacionAbierta),
    obtenerEstadoClinico(supabase),
  ]);

  const citas = (citasHoy.data ?? []).filter((cita) => cita.estado !== "cancelada");
  const prioridad = [...(estados ?? [])]
    .filter(([, estado]) => estado.nivel === "alto" || estado.derivacionAbierta || estado.alertasBloqueantes.length)
    .sort(([, a], [, b]) => b.alertasBloqueantes.length - a.alertasBloqueantes.length || GRUPOS_IWGDF[b.nivel].grupo - GRUPOS_IWGDF[a.nivel].grupo)
    .slice(0, 6);
  const idsConNombre = [...new Set([...citas.map((cita) => cita.paciente_id), ...prioridad.map(([id]) => id)])];
  const { data: nombres } = idsConNombre.length
    ? await supabase.from("paciente").select("id, nombre, apellido_paterno, apellido_materno").in("id", idsConNombre)
    : { data: [] };
  const pacientePorId = new Map((nombres ?? []).map((paciente) => [paciente.id, paciente]));
  const nombreDe = (id: string) => {
    const paciente = pacientePorId.get(id);
    return paciente ? `${paciente.nombre} ${paciente.apellido_paterno}` : "Paciente";
  };

  const enEspera = citas.find((cita) => cita.estado === "en_espera");
  const destacada = enEspera ?? citas.find((cita) => ["agendada", "confirmada"].includes(cita.estado) && esFutura(cita.fecha_hora));
  const estadoDestacada = destacada ? estados?.get(destacada.paciente_id) : undefined;
  const citasConBloqueo = citas.filter((cita) => !["atendida", "no_asiste"].includes(cita.estado) && estados?.get(cita.paciente_id)?.alertasBloqueantes.length);
  const atendidas = citas.filter((cita) => cita.estado === "atendida").length;
  const controlesVencidos = [...(estados?.values() ?? [])].filter((estado) => estado.controlVencido).length;
  const conteoPorNivel = Object.fromEntries(niveles.map((nivel) => [nivel, [...(estados?.values() ?? [])].filter((estado) => estado.nivel === nivel).length])) as Record<NivelRiesgo, number>;
  const evaluados = estados?.size ?? 0;
  const nombreUsuario = (perfil.data?.nombre || user?.user_metadata?.nombre || "").split(/\s+/)[0];

  const indicadores: { icono: NombreIcono; valor: number; etiqueta: string; detalle: string; href?: string }[] = [
    { icono: "agenda", valor: citas.length, etiqueta: citas.length === 1 ? "cita hoy" : "citas hoy", detalle: `${atendidas} atendidas · ${citas.length - atendidas} por atender` },
    { icono: "derivacion", valor: derivaciones.count ?? 0, etiqueta: "derivaciones abiertas", detalle: "Pendientes, enviadas o aceptadas" },
    { icono: "pacientes", valor: pacientes.count ?? 0, etiqueta: "pacientes", detalle: `${controlesVencidos} con control vencido →`, href: "/patients?filtro=vencido" },
  ];

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-700">Panel clínico</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{saludo()}{nombreUsuario ? `, ${nombreUsuario}` : ""}</h1>
          <p className="mt-2 text-base text-slate-600">
            Hoy tienes <b className="text-slate-900">{citas.length} {citas.length === 1 ? "paciente" : "pacientes"}</b>.
            {citasConBloqueo.length > 0 && <> {citasConBloqueo.length === 1 ? "Uno" : citasConBloqueo.length} <b className="text-red-700">no debe{citasConBloqueo.length === 1 ? "" : "n"} recibir procedimientos invasivos</b>.</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/patients/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:border-teal-700 hover:text-teal-700"><Icono nombre="pacientes" className="h-4 w-4" />Registrar paciente</Link>
          <Link href="/agenda" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"><Icono nombre="mas" className="h-4 w-4" />Agendar cita</Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {destacada ? (
          <section aria-label={enEspera ? "Paciente en sala de espera" : "Próximo paciente"} className="grid gap-5 rounded-xl bg-teal-900 p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-200">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${enEspera ? "bg-amber-400" : "bg-teal-300"}`} />{enEspera ? "En sala de espera ahora" : "Próximo paciente"}
              </p>
              <p className="font-mono text-sm text-teal-100">Citada {horaChile(destacada.fecha_hora)}</p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{nombreDe(destacada.paciente_id)} {pacientePorId.get(destacada.paciente_id)?.apellido_materno ?? ""}</h2>
              <p className="mt-1 text-teal-100">{destacada.motivo_consulta || "Sin motivo registrado"}</p>
            </div>
            <dl className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-teal-950/40 px-4 py-3"><dt className="text-xs text-teal-200">Riesgo IWGDF</dt><dd className="mt-1 font-semibold">{estadoDestacada ? etiquetaRiesgo(estadoDestacada.nivel) : "Sin evaluación"}</dd></div>
              <div className="rounded-lg bg-teal-950/40 px-4 py-3"><dt className="text-xs text-teal-200">Control sugerido</dt><dd className="mt-1 font-semibold">{estadoDestacada ? textoControlSugerido(estadoDestacada.nivel) : "Evaluar en esta cita"}</dd></div>
              <div className="rounded-lg bg-teal-950/40 px-4 py-3"><dt className="text-xs text-teal-200">Alertas clínicas</dt><dd className={`mt-1 font-semibold ${estadoDestacada?.alertasBloqueantes.length ? "text-red-200" : ""}`}>{estadoDestacada?.alertasBloqueantes.length ? "No realizar procedimientos invasivos" : estadoDestacada?.derivacionAbierta ? "Derivación pendiente" : "Ninguna activa"}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Link href={`/patients/${destacada.paciente_id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-teal-900 hover:bg-teal-50">Abrir ficha<Icono nombre="flecha" className="h-4 w-4" /></Link>
              <Link href={`/agenda?cita=${destacada.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-teal-400 px-4 text-sm font-medium text-white hover:bg-teal-800">Ver en la agenda</Link>
            </div>
          </section>
        ) : (
          <Card className="grid place-items-center text-center">
            <div>
              <p className="font-semibold text-slate-800">No quedan pacientes por atender hoy</p>
              <p className="mt-1 text-sm text-slate-500">Las citas en espera o próximas aparecerán aquí.</p>
            </div>
          </Card>
        )}

        <div className="grid gap-3">
          {indicadores.map((indicador) => (
            <Card key={indicador.etiqueta} className="flex items-center gap-4 px-5 py-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"><Icono nombre={indicador.icono} /></span>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{indicador.valor} <span className="text-sm font-medium text-slate-600">{indicador.etiqueta}</span></p>
                {indicador.href ? <Link href={indicador.href} className="text-sm font-medium text-teal-700 hover:text-teal-900">{indicador.detalle}</Link> : <p className="text-sm text-slate-500">{indicador.detalle}</p>}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-red-700">Seguimiento prioritario</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Revisar antes de atender</h2>
              <p className="mt-1 text-sm text-slate-500">Riesgo alto, derivación abierta o signos de alarma en la última evaluación.</p>
            </div>
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">{prioridad.length}</span>
          </div>
          {!estados ? (
            <div className="mt-5"><Alert>No pudimos consultar el estado clínico. Revisa las alertas en la ficha de cada paciente.</Alert></div>
          ) : prioridad.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">No hay pacientes que requieran seguimiento prioritario.</p>
          ) : (
            <ul className="mt-5 grid gap-2.5">
              {prioridad.map(([pacienteId, estado]) => (
                <li key={pacienteId} className="grid gap-2.5 rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Link href={`/patients/${pacienteId}`} className="font-semibold text-slate-900 hover:text-teal-800">{nombreDe(pacienteId)}</Link>
                      <p className="text-sm text-slate-500">Última evaluación: {fechaCortaChile(estado.ultimaAtencion)}</p>
                    </div>
                    <RiesgoBadge nivel={estado.nivel} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {estado.alertasBloqueantes.map((alerta) => <span key={alerta} className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800"><Icono nombre="alerta" className="h-3.5 w-3.5" />No invasivo · {alerta}</span>)}
                    {estado.derivacionAbierta && <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"><Icono nombre="derivacion" className="h-3.5 w-3.5" />Derivación pendiente</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">Agenda</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Pacientes de hoy</h2>
            </div>
            <Link href="/agenda" className="text-sm font-medium text-teal-700 hover:text-teal-900">Ver semana →</Link>
          </div>
          {citasHoy.error ? (
            <div className="mt-5"><Alert>No pudimos cargar las citas de hoy.</Alert></div>
          ) : citas.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">No hay citas agendadas para hoy.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {citas.map((cita) => (
                <li key={cita.id}>
                  <Link href={`/agenda?cita=${cita.id}`} className={`flex items-center gap-4 rounded-lg px-2 py-3 hover:bg-slate-50 ${cita.estado === "atendida" ? "opacity-60" : ""} ${cita.estado === "en_espera" ? "bg-amber-50" : ""}`}>
                    <span className="w-12 shrink-0 font-mono text-sm font-semibold text-slate-700">{horaChile(cita.fecha_hora)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                        {nombreDe(cita.paciente_id)}
                        {estados?.get(cita.paciente_id)?.alertasBloqueantes.length ? <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Sin procedimiento invasivo</span> : null}
                      </span>
                      <span className="block truncate text-sm text-slate-500">{cita.motivo_consulta || "Sin motivo registrado"}</span>
                    </span>
                    <EstadoChip estado={cita.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"><Icono nombre="pie" className="h-6 w-6" /></span>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Riesgo de pie diabético (IWGDF)</h2>
              <p className="text-sm text-slate-500">Cómo se clasifica a tus pacientes y cada cuánto controlarlos.</p>
            </div>
          </div>
          {estados && <p className="text-sm text-slate-500"><b className="text-slate-900">{evaluados}</b> evaluados · <b className="text-slate-900">{Math.max((pacientes.count ?? 0) - evaluados, 0)}</b> sin evaluación</p>}
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {niveles.map((nivel) => (
            <li key={nivel} className="grid content-start gap-3 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${estilosRiesgo[nivel].badge}`}>{etiquetaRiesgo(nivel)}</span>
                {estados && <Link href={`/patients?filtro=${nivel}`} className="text-2xl font-semibold text-slate-900 hover:text-teal-700" aria-label={`${conteoPorNivel[nivel]} pacientes en ${etiquetaRiesgo(nivel)}`}>{conteoPorNivel[nivel]}</Link>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qué lo define</p>
                <p className="mt-1 text-sm leading-6 text-slate-800">{GRUPOS_IWGDF[nivel].define}</p>
              </div>
              <p className="flex items-center gap-2 border-t border-slate-200 pt-3 text-sm text-slate-700"><Icono nombre="reloj" className="h-4 w-4" />Control sugerido: <b>{textoControlSugerido(nivel)}</b></p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-500">Signos de infección, pulsos ausentes o dolor isquémico generan derivación y bloquean procedimientos invasivos, sin importar el grupo.</p>
      </Card>
    </div>
  );
}
