export type NivelRiesgo = 'muy_bajo' | 'bajo' | 'moderado' | 'alto';

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
    alertas.push('Signos clínicos de infección activa detectados.');
    requiereDerivacion = true;
    bloquearProcedimientoInvasivo = true;
  }

  if (!params.pulsosPresentes || params.dolorIsquemico) {
    alertas.push('Compromiso vascular periférico / sospecha de isquemia crítica.');
    requiereDerivacion = true;
    bloquearProcedimientoInvasivo = true;
  }

  // 2. Clasificación IWGDF
  let nivelRiesgo: NivelRiesgo = 'muy_bajo';

  if (params.ulceraPreviaOAmputacion) {
    nivelRiesgo = 'alto'; // Grupo 3
    requiereDerivacion = true;
  } else if (!params.monofilamentoSensible && (!params.pulsosPresentes || params.deformidadPresente)) {
    nivelRiesgo = 'moderado'; // Grupo 2
  } else if (!params.monofilamentoSensible || !params.pulsosPresentes) {
    nivelRiesgo = 'bajo'; // Grupo 1
  }

  return {
    nivelRiesgo,
    requiereDerivacion,
    bloquearProcedimientoInvasivo,
    alertas,
  };
}