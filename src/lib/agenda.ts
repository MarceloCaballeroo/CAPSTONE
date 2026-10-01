export const zonaHorariaAgenda = "America/Santiago";

function fechaUTC(fecha: string): Date {
  return new Date(`${fecha}T12:00:00Z`);
}

function claveFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function fechaClaveChile(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHorariaAgenda,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function obtenerFechaInicioSemana(fechaSolicitada?: string, hoy = new Date()): string {
  const candidata = /^\d{4}-\d{2}-\d{2}$/.test(fechaSolicitada ?? "") ? fechaUTC(fechaSolicitada!) : new Date(NaN);
  const fecha = Number.isNaN(candidata.getTime()) || claveFecha(candidata) !== fechaSolicitada
    ? fechaUTC(fechaClaveChile(hoy))
    : candidata;
  fecha.setUTCDate(fecha.getUTCDate() - (fecha.getUTCDay() + 6) % 7);
  return claveFecha(fecha);
}

export function obtenerDiasSemana(inicioSemana: string) {
  return Array.from({ length: 7 }, (_, indice) => {
    const fecha = fechaUTC(inicioSemana);
    fecha.setUTCDate(fecha.getUTCDate() + indice);
    const clave = claveFecha(fecha);
    const partes = new Intl.DateTimeFormat("es-CL", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
    }).formatToParts(fecha);
    return {
      fecha: clave,
      dia: partes.find((parte) => parte.type === "weekday")?.value.replace(".", "") ?? "",
      numero: partes.find((parte) => parte.type === "day")?.value ?? "",
      esHoy: clave === fechaClaveChile(new Date()),
    };
  });
}

export function obtenerRangoSemanaUTC(inicioSemana: string): [string, string] {
  const inicio = Date.parse(`${inicioSemana}T00:00:00Z`);
  const margen = 12 * 60 * 60 * 1000;
  return [new Date(inicio - margen).toISOString(), new Date(inicio + 7 * 24 * 60 * 60 * 1000 + margen).toISOString()];
}

export function convertirFechaHoraChileAISO(fechaHora: string): string {
  const fecha = fechaHora.slice(0, 10);
  const referencia = new Date(`${fecha}T12:00:00Z`);
  const zona = new Intl.DateTimeFormat("en-US", {
    timeZone: zonaHorariaAgenda,
    timeZoneName: "longOffset",
  }).formatToParts(referencia).find((parte) => parte.type === "timeZoneName")?.value ?? "GMT+00:00";
  const coincidencia = /^GMT([+-])(\d{2}):(\d{2})$/.exec(zona);
  const minutos = coincidencia ? (Number(coincidencia[2]) * 60 + Number(coincidencia[3])) * (coincidencia[1] === "+" ? 1 : -1) : 0;
  return new Date(new Date(`${fechaHora}:00Z`).getTime() - minutos * 60_000).toISOString();
}

export function horaChile(fecha: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: zonaHorariaAgenda,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(fecha));
}

export function fechaHoraActualChile(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHorariaAgenda,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}T${valor("hour")}:${valor("minute")}`;
}