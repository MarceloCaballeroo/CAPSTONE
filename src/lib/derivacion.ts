export type DatosCartaDerivacion = {
  paciente: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno?: string | null;
    rut: string;
  };
  profesional: string;
  organizacion: string;
  especialidad: string;
  motivo: string;
  diagnostico?: { codigo: string; nombre: string } | null;
};

export type CartaDerivacion = {
  nombrePaciente: string;
  cuerpo: string[];
  diagnostico: string | null;
  firma: string;
};

// La derivación guarda las alertas unidas por " | "; la carta las muestra como motivos separados.
export function textoCartaDerivacion(datos: DatosCartaDerivacion): CartaDerivacion {
  const nombrePaciente = [datos.paciente.nombre, datos.paciente.apellidoPaterno, datos.paciente.apellidoMaterno]
    .filter(Boolean)
    .join(" ")
    .trim();

  const motivos = datos.motivo
    .split(" | ")
    .map((motivo) => motivo.trim())
    .filter(Boolean);

  return {
    nombrePaciente,
    cuerpo: [
      `Por medio de la presente, derivo a ${nombrePaciente}, RUT ${datos.paciente.rut}, al servicio de ${datos.especialidad}.`,
      ...motivos.map((motivo) => `Motivo: ${motivo}`),
    ],
    diagnostico: datos.diagnostico ? `${datos.diagnostico.codigo} — ${datos.diagnostico.nombre}` : null,
    firma: `${datos.profesional}\n${datos.organizacion}`,
  };
}
