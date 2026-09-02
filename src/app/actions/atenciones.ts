'use server';

import { createClient } from '@/lib/supabase/server';
import { evaluarRiesgoYDerivacion } from '@/lib/clinical-rules';

export async function guardarAtencion(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const fichaId = formData.get('fichaId') as string;
  const diagnosticoCie10 = formData.get('diagnosticoCie10') as string;
  const monofilamento = formData.get('monofilamento') === 'on';
  const pulsos = formData.get('pulsos') === 'on';
  const deformidad = formData.get('deformidad') === 'on';
  const antecedentes = formData.get('antecedentesUlcera') === 'on';
  const infeccion = formData.get('signosInfeccion') === 'on';
  const dolorIsquemico = formData.get('dolorIsquemico') === 'on';

  // Evaluación en servidor sin intervención manual
  const evaluacion = evaluarRiesgoYDerivacion({
    monofilamentoSensible: monofilamento,
    pulsosPresentes: pulsos,
    deformidadPresente: deformidad,
    ulceraPreviaOAmputacion: antecedentes,
    signosInfeccion: infeccion,
    dolorIsquemico,
  });

  // Guardar atención clínica
  const { data: atencion, error: atencionError } = await supabase
    .from('atencion')
    .insert({
      ficha_id: fichaId,
      usuario_id: user.id,
      diagnostico_cie10: diagnosticoCie10,
      nivel_riesgo_iwgdf: evaluacion.nivelRiesgo,
      requiere_derivacion: evaluacion.requiereDerivacion,
      observaciones: formData.get('observaciones') as string,
    })
    .select()
    .single();

  if (atencionError) throw new Error(atencionError.message);

  // Si requiere derivación obligatoria, abrir registro automático
  if (evaluacion.requiereDerivacion) {
    await supabase.from('derivacion').insert({
      atencion_id: atencion.id,
      motivo: evaluacion.alertas.join(' | '),
      especialidad_destino: 'Medicina General / Cirugía Vascular',
      estado: 'pendiente',
    });
  }

  return { success: true, evaluacion };
}