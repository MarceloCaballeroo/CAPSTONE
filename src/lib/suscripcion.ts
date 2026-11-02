export type EstadoSuscripcion = "activa" | "gracia" | "bloqueada";

export const DIAS_SUSCRIPCION = 30;
export const DIAS_GRACIA = 5;

// Fecha de hoy en Chile como YYYY-MM-DD, para comparar sin desfase de zona horaria.
export function hoyChile(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

export function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha.slice(0, 10)}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

// Días que faltan para el vencimiento: positivo si quedan, negativo si ya pasó.
export function diasHasta(hasta: string, hoy = hoyChile()): number {
  return Math.round((Date.parse(hasta.slice(0, 10)) - Date.parse(hoy)) / 86_400_000);
}

// Sin fecha se considera activa: son las organizaciones anteriores al cobro.
export function estadoSuscripcion(hasta: string | null | undefined, hoy = hoyChile()): EstadoSuscripcion {
  if (!hasta) return "activa";
  const vencidos = -diasHasta(hasta, hoy);
  if (vencidos <= 0) return "activa";
  return vencidos <= DIAS_GRACIA ? "gracia" : "bloqueada";
}

// Un pago nuevo suma 30 días desde el vencimiento vigente, no desde hoy:
// así pagar antes de tiempo no pierde los días que quedaban.
export function siguienteVencimiento(actual: string | null | undefined, hoy = hoyChile()): string {
  const base = actual && actual.slice(0, 10) > hoy ? actual.slice(0, 10) : hoy;
  return sumarDias(base, DIAS_SUSCRIPCION);
}
