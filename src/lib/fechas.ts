// Fecha clínica en la zona de Chile: "2 de noviembre de 2026".
export function fechaClinica(fecha: string | null | undefined, incluirHora = false): string {
  if (!fecha) return "Sin registro";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(incluirHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(fecha));
}
