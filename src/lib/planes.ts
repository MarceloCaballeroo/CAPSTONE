export type Plan = "individual" | "clinica";

// Fuente única de los planes: la usan el registro y la landing.
export const PLANES = [
  { id: "individual" as const, nombre: "Individual", precio: "USD 15/mes", detalle: "Tu propia consulta, administrada solo por ti." },
  { id: "clinica" as const, nombre: "Clínica", precio: "USD 18/mes por podólogo", detalle: "Varios profesionales comparten pacientes y agenda." },
];
