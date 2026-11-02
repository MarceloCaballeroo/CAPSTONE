export type NivelRiesgo = 'muy_bajo' | 'bajo' | 'moderado' | 'alto';

export const ALERTA_INFECCION = 'Signos clínicos de infección activa detectados.';
export const ALERTA_VASCULAR = 'Compromiso vascular periférico / sospecha de isquemia crítica.';
const ALERTAS_BLOQUEANTES = [ALERTA_INFECCION, ALERTA_VASCULAR];

// Especialidades a las que puede derivar el podólogo. La elige él; la regla solo sugiere el motivo.
export const ESPECIALIDADES_DERIVACION = [
  'Medicina General',
  'Cirugía Vascular',
  'Medicina General / Cirugía Vascular',
] as const;

export type EspecialidadDerivacion = (typeof ESPECIALIDADES_DERIVACION)[number];

// Estados de la derivación. Solo pendiente, enviada y aceptada cuentan como abiertas.
export const ESTADOS_DERIVACION = ['pendiente', 'enviada', 'aceptada', 'rechazada', 'completada'] as const;
export type EstadoDerivacion = (typeof ESTADOS_DERIVACION)[number];
export const ESTADOS_DERIVACION_ABIERTA = ['pendiente', 'enviada', 'aceptada'] as const;

// Grupos IWGDF y frecuencia de control sugerida (meses: [mínimo, máximo]).
export const GRUPOS_IWGDF: Record<NivelRiesgo, { grupo: number; nombre: string; define: string; controlMeses: [number, number] }> = {
  muy_bajo: { grupo: 0, nombre: 'Muy bajo', define: 'Sensibilidad conservada y sin signos de enfermedad arterial periférica.', controlMeses: [12, 12] },
  bajo: { grupo: 1, nombre: 'Bajo', define: 'Pérdida de sensibilidad protectora o enfermedad arterial periférica.', controlMeses: [6, 12] },
  moderado: { grupo: 2, nombre: 'Moderado', define: 'Pérdida de sensibilidad junto con enfermedad arterial o deformidad del pie.', controlMeses: [3, 6] },
  alto: { grupo: 3, nombre: 'Alto', define: 'Pérdida de sensibilidad protectora o enfermedad arterial periférica, junto con antecedente de úlcera o amputación de extremidad inferior.', controlMeses: [1, 3] },
};

export function textoControlSugerido(nivel: NivelRiesgo): string {
  const [min, max] = GRUPOS_IWGDF[nivel].controlMeses;
  return min === max ? `cada ${max} meses` : `cada ${min}–${max} meses`;
}

// Fecha límite del próximo control: última atención + máximo de meses del grupo.
export function fechaLimiteControl(nivel: NivelRiesgo, ultimaAtencion: Date): Date {
  const limite = new Date(ultimaAtencion);
  limite.setMonth(limite.getMonth() + GRUPOS_IWGDF[nivel].controlMeses[1]);
  return limite;
}

// Alertas que impiden procedimientos invasivos, leídas del motivo de una derivación (alertas unidas por " | ").
export function alertasBloqueantes(motivoDerivacion: string | null | undefined): string[] {
  return (motivoDerivacion ?? '').split(' | ').filter((alerta) => ALERTAS_BLOQUEANTES.includes(alerta));
}

interface EvaluacionClinicaParams {
  monofilamentoSensible: boolean;   // false = neuropatía
  pulsosPresentes: boolean;         // false = posible EAP
  deformidadPresente: boolean;
  ulceraPreviaOAmputacion: boolean;
  signosInfeccion: boolean;
  dolorIsquemico: boolean;
}

export interface ResultadoEvaluacion {
  nivelRiesgo: NivelRiesgo;
  requiereDerivacion: boolean;
  bloquearProcedimientoInvasivo: boolean;
  alertas: string[];
}

export function evaluarRiesgoYDerivacion(params: EvaluacionClinicaParams): ResultadoEvaluacion {
  const alertas: string[] = [];
  let requiereDerivacion = false;
  let bloquearProcedimientoInvasivo = false;

  // 1. Signos de alarma (Límite legal del podólogo)
  if (params.signosInfeccion) {
    alertas.push(ALERTA_INFECCION);
    requiereDerivacion = true;
    bloquearProcedimientoInvasivo = true;
  }

  if (!params.pulsosPresentes || params.dolorIsquemico) {
    alertas.push(ALERTA_VASCULAR);
    requiereDerivacion = true;
    bloquearProcedimientoInvasivo = true;
  }

  // 2. Clasificación IWGDF
  const psp = !params.monofilamentoSensible; // pérdida de sensibilidad protectora
  const eap = !params.pulsosPresentes;       // enfermedad arterial periférica
  let nivelRiesgo: NivelRiesgo = 'muy_bajo';

  if (params.ulceraPreviaOAmputacion) {
    // ponytail: IWGDF exige PSP o EAP para el grupo 3; con úlcera previa sin PSP/EAP se mantiene
    // "alto" por criterio conservador. Falta enfermedad renal terminal (requiere campo y migración nuevos).
    nivelRiesgo = 'alto'; // Grupo 3
    requiereDerivacion = true;
  } else if ((psp && eap) || (psp && params.deformidadPresente) || (eap && params.deformidadPresente)) {
    nivelRiesgo = 'moderado'; // Grupo 2
  } else if (psp || eap) {
    nivelRiesgo = 'bajo'; // Grupo 1
  }

  return {
    nivelRiesgo,
    requiereDerivacion,
    bloquearProcedimientoInvasivo,
    alertas,
  };
}