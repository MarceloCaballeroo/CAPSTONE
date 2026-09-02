"use client";

type Plan = "individual" | "clinica";

const PLANES = [
  { id: "individual" as const, nombre: "Individual", precio: "USD 15/mes", detalle: "Tu propia consulta, administrada solo por ti." },
  { id: "clinica" as const, nombre: "Clínica", precio: "USD 18/mes por podólogo", detalle: "Varios profesionales comparten pacientes y agenda." },
];

export function PlanSelector({ value, onChange }: { value: Plan; onChange: (plan: Plan) => void }) {
  return (
    <div role="radiogroup" aria-label="Plan de suscripción" className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">Plan</span>
      <div className="grid grid-cols-2 gap-3">
        {PLANES.map((plan) => (
          <button key={plan.id} type="button" role="radio" aria-checked={value === plan.id} onClick={() => onChange(plan.id)} className={`border px-4 py-3 text-left transition-colors ${value === plan.id ? "border-teal-700 bg-teal-50" : "border-slate-300 hover:border-slate-500"}`}>
            <span className="block font-semibold text-slate-900">{plan.nombre}</span>
            <span className="block text-sm text-slate-600">{plan.precio}</span>
            <span className="mt-1 block text-xs leading-snug text-slate-500">{plan.detalle}</span>
          </button>
        ))}
      </div>
      <input type="hidden" name="plan" value={value} />
    </div>
  );
}