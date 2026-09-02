import { DashboardSummary } from "@/features/dashboard/DashboardSummary";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <header className="mb-8">
        <p className="text-sm font-medium text-teal-700">Panel clínico</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">Resumen de la consulta</h1>
      </header>
      <DashboardSummary />
    </DashboardLayout>
  );
}