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

  type FichaRow = { id: string; paciente_id: string };
  type AtencionRow = { id: string; ficha_id: string; nivel_riesgo_iwgdf: string; created_at: string };
  type DerivacionRow = { atencion_id: string; motivo: string | null };

  let fichas: FichaRow[] = [];
  let atenciones: AtencionRow[] = [];
  let derivaciones: DerivacionRow[] = [];

  if (!pacienteIds) {
    const [fichasRes, atencionesRes, derivacionesRes] = await Promise.all([
      supabase.from("ficha_clinica").select("id, paciente_id"),
      supabase.from("atencion").select("id, ficha_id, nivel_riesgo_iwgdf, created_at").order("created_at", { ascending: false }),
      supabase.from("derivacion").select("atencion_id, motivo").in("estado", estadosDerivacionAbierta),
    ]);

    if (fichasRes.error || atencionesRes.error || derivacionesRes.error) return null;
    fichas = (fichasRes.data as FichaRow[]) ?? [];
    if (!fichas.length) return estados;
    atenciones = (atencionesRes.data as AtencionRow[]) ?? [];
    derivaciones = (derivacionesRes.data as DerivacionRow[]) ?? [];
  } else {
    const { data: fichasData, error: errorFichas } = await supabase.from("ficha_clinica").select("id, paciente_id").in("paciente_id", pacienteIds);
    if (errorFichas) return null;
    fichas = (fichasData as FichaRow[]) ?? [];
    if (!fichas.length) return estados;

    const fichaIds = fichas.map((f) => f.id);
    const [atencionesRes, derivacionesRes] = await Promise.all([
      supabase.from("atencion").select("id, ficha_id, nivel_riesgo_iwgdf, created_at").in("ficha_id", fichaIds).order("created_at", { ascending: false }),
      supabase.from("derivacion").select("atencion_id, motivo").in("estado", estadosDerivacionAbierta),
    ]);
    if (atencionesRes.error || derivacionesRes.error) return null;
    atenciones = (atencionesRes.data as AtencionRow[]) ?? [];
    derivaciones = (derivacionesRes.data as DerivacionRow[]) ?? [];
  }

  const pacientePorFicha = new Map(fichas.map((ficha) => [ficha.id, ficha.paciente_id]));
  const pacientePorAtencion = new Map(atenciones.map((atencion) => [atencion.id, pacientePorFicha.get(atencion.ficha_id)]));

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
