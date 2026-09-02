import { Card } from "@/components/common/Card";

const metrics = [
  ["Pacientes activos", "128"],
  ["Citas de hoy", "12"],
  ["Derivaciones pendientes", "3"],
];

export function DashboardSummary() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map(([label, value]) => (
        <Card key={label}>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </Card>
      ))}
    </div>
  );
}