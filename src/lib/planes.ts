export type Plan = "individual" | "clinica";

// Fuente única de los planes: la usan el registro, la landing y el pago.
export const PLANES = [
  { id: "individual" as const, nombre: "Individual", precioUsd: 15, precio: "USD 15/mes", detalle: "Tu propia consulta, administrada solo por ti." },
  { id: "clinica" as const, nombre: "Clínica", precioUsd: 18, precio: "USD 18/mes por podólogo", detalle: "Varios profesionales comparten pacientes y agenda." },
];

// Webpay opera en pesos. ponytail: tasa fija; si el dólar se mueve, se ajusta acá
// o se reemplaza por una API de tipo de cambio cuando el cobro sea real.
export const CLP_POR_USD = 950;

export function montoClp(plan: Plan, profesionales = 1): number {
  const precio = PLANES.find((item) => item.id === plan)?.precioUsd ?? 0;
  const cantidad = plan === "clinica" ? Math.max(1, profesionales) : 1;
  return Math.round(precio * cantidad * CLP_POR_USD);
}
