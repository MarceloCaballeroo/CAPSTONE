import { alertasBloqueantes, fechaLimiteControl, GRUPOS_IWGDF, type NivelRiesgo } from "@/lib/clinical-rules";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const estadosDerivacionAbierta = ["pendiente", "enviada", "aceptada"];

export type EstadoClinico = {
  nivel: NivelRiesgo;
  ultimaAtencion: string;
  limiteControl: Date;
  controlVencido: boolean;
  derivacionAbierta: boolean;
  alertasBloqueantes: string[];
};

// Estado clínico por paciente según su última atención y sus derivaciones abiertas. Devuelve null si falla una consulta,
// para que la UI avise en vez de mostrar "sin alertas" por error.
// ponytail: sin pacienteIds trae toda la organización (RLS) y resuelve la última atención en memoria; sirve hasta unos
// cientos de pacientes. Con más volumen, reemplazar por una vista SQL de última atención por paciente.
export async function obtenerEstadoClinico(supabase: Supabase, pacienteIds?: string[]): Promise<Map<string, EstadoClinico> | null> {
  const estados = new Map<string, EstadoClinico>();
  if (pacienteIds?.length === 0) return estados;

  let consultaFichas = supabase.from("ficha_clinica").select("id, paciente_id");
  if (pacienteIds) consultaFichas = consultaFichas.in("paciente_id", pacienteIds);
  const { data: fichas, error: errorFichas } = await consultaFichas;
  if (errorFichas) return null;
  if (!fichas.length) return estados;
  const pacientePorFicha = new Map(fichas.map((ficha) => [ficha.id as string, ficha.paciente_id as string]));

  let consultaAtenciones = supabase.from("atencion").select("id, ficha_id, nivel_riesgo_iwgdf, created_at").order("created_at", { ascending: false });
  if (pacienteIds) consultaAtenciones = consultaAtenciones.in("ficha_id", [...pacientePorFicha.keys()]);
  const { data: atenciones, error: errorAtenciones } = await consultaAtenciones;
  if (errorAtenciones) return null;
  if (!atenciones.length) return estados;
  const pacientePorAtencion = new Map(atenciones.map((atencion) => [atencion.id as string, pacientePorFicha.get(atencion.ficha_id)]));

  let consultaDerivaciones = supabase.from("derivacion").select("atencion_id, motivo").in("estado", estadosDerivacionAbierta);
  if (pacienteIds) consultaDerivaciones = consultaDerivaciones.in("atencion_id", [...pacientePorAtencion.keys()]);
  const { data: derivaciones, error: errorDerivaciones } = await consultaDerivaciones;
  if (errorDerivaciones) return null;

  const ahora = new Date();
  for (const atencion of atenciones) {
    const pacienteId = pacientePorFicha.get(atencion.ficha_id);
    const nivel = atencion.nivel_riesgo_iwgdf as NivelRiesgo;
    if (!pacienteId || estados.has(pacienteId) || !(nivel in GRUPOS_IWGDF)) continue;
    const limiteControl = fechaLimiteControl(nivel, new Date(atencion.created_at));
    estados.set(pacienteId, { nivel, ultimaAtencion: atencion.created_at, limiteControl, controlVencido: limiteControl < ahora, derivacionAbierta: false, alertasBloqueantes: [] });
  }

  for (const derivacion of derivaciones) {
    const estado = estados.get(pacientePorAtencion.get(derivacion.atencion_id) ?? "");
    if (!estado) continue;
    estado.derivacionAbierta = true;
    for (const alerta of alertasBloqueantes(derivacion.motivo)) if (!estado.alertasBloqueantes.includes(alerta)) estado.alertasBloqueantes.push(alerta);
  }

  return estados;
}
