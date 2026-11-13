"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ESPECIALIDADES_DERIVACION, evaluarRiesgoYDerivacion } from "@/lib/clinical-rules";
import { atencionSchema, type EstadoAtencion } from "@/lib/validations/atenciones";

type ErrorSupabase = { message: string; code?: string; details?: string; hint?: string };

// Devuelve el error tal cual lo entrega Postgres (mensaje, SQLSTATE, detalle y sugerencia) para poder diagnosticar.
function describirError(error: ErrorSupabase): string {
  return [error.message, error.code && `SQLSTATE ${error.code}`, error.details, error.hint].filter(Boolean).join(" · ");
}

export async function guardarAtencion(_prev: EstadoAtencion, formData: FormData): Promise<EstadoAtencion> {
  const parsed = atencionSchema.safeParse({
    pacienteId: formData.get("pacienteId"),
    diagnosticoCie10: formData.get("diagnosticoCie10"),
    monofilamento: formData.get("monofilamento") === "on",
    pulsos: formData.get("pulsos") === "on",
    deformidad: formData.get("deformidad") === "on",
    antecedentesUlcera: formData.get("antecedentesUlcera") === "on",
    signosInfeccion: formData.get("signosInfeccion") === "on",
    dolorIsquemico: formData.get("dolorIsquemico") === "on",
    procedimientoInvasivo: formData.get("procedimientoInvasivo") === "on",
    especialidadDestino: formData.get("especialidadDestino") || undefined,
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la atención." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  // La ficha se crea si el paciente aún no tiene una (pacientes anteriores al alta automática).
  const { data: ficha, error: errorFicha } = await supabase
    .from("ficha_clinica")
    .select("id")
    .eq("paciente_id", parsed.data.pacienteId)
    .maybeSingle();
  if (errorFicha) return { error: `No pudimos leer la ficha clínica: ${describirError(errorFicha)}` };

  let fichaId = ficha?.id;
  if (!fichaId) {
    const { data: nuevaFicha, error: errorNuevaFicha } = await supabase
      .from("ficha_clinica")
      .insert({ paciente_id: parsed.data.pacienteId })
      .select("id")
      .single();
    if (errorNuevaFicha || !nuevaFicha) {
      return { error: `No pudimos crear la ficha clínica: ${errorNuevaFicha ? describirError(errorNuevaFicha) : "sin respuesta de la base"}` };
    }
    fichaId = nuevaFicha.id;
  }

  // Evaluación en servidor sin intervención manual: el cliente no puede alterar el nivel ni la derivación.
  const evaluacion = evaluarRiesgoYDerivacion({
    monofilamentoSensible: parsed.data.monofilamento,
    pulsosPresentes: parsed.data.pulsos,
    deformidadPresente: parsed.data.deformidad,
    ulceraPreviaOAmputacion: parsed.data.antecedentesUlcera,
    signosInfeccion: parsed.data.signosInfeccion,
    dolorIsquemico: parsed.data.dolorIsquemico,
  });

  const especialidadDestino = parsed.data.especialidadDestino;
  if (evaluacion.bloquearProcedimientoInvasivo && parsed.data.procedimientoInvasivo) {
    return { error: "No puedes realizar procedimientos invasivos con signos de infección o compromiso vascular. Guarda solo la evaluación para generar la interconsulta." };
  }
  if (evaluacion.requiereDerivacion && (!especialidadDestino || !(ESPECIALIDADES_DERIVACION as readonly string[]).includes(especialidadDestino))) {
    return { error: "Selecciona la especialidad de destino para la derivación." };
  }

  const { data: atencion, error: errorAtencion } = await supabase
    .from("atencion")
    .insert({
      ficha_id: fichaId,
      usuario_id: user.id,
      diagnostico_cie10: parsed.data.diagnosticoCie10,
      nivel_riesgo_iwgdf: evaluacion.nivelRiesgo,
      observaciones: parsed.data.observaciones || null,
    })
    .select("id")
    .single();

  if (errorAtencion || !atencion) {
    return { error: `No pudimos guardar la atención: ${errorAtencion ? describirError(errorAtencion) : "sin respuesta de la base"}` };
  }

  // La derivación es la fuente de verdad del badge: sin fila no hay derivación pendiente.
  if (evaluacion.requiereDerivacion) {
    const { error: errorDerivacion } = await supabase.from("derivacion").insert({
      atencion_id: atencion.id,
      motivo: evaluacion.alertas.join(" | ") || "Riesgo IWGDF alto: úlcera previa o amputación.",
      especialidad_destino: especialidadDestino!,
      estado: "pendiente",
    });
    if (errorDerivacion) {
      revalidatePath(`/patients/${parsed.data.pacienteId}`);
      return { atencionId: atencion.id, error: `La atención quedó registrada, pero no pudimos crear la derivación: ${describirError(errorDerivacion)}` };
    }
  }

  revalidatePath("/patients/[id]", "page");
  return { success: true, evaluacion, atencionId: atencion.id };
}
