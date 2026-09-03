import Link from "next/link";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PatientForm } from "@/features/patients/PatientForm";
import { crearPacienteAction } from "@/app/actions/patients";

export default function NuevoPacientePage() {
  return (
    <DashboardLayout>
      <header className="mb-8">
        <Link className="text-sm font-medium text-teal-700 hover:underline" href="/patients">← Volver a pacientes</Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">Nuevo paciente</h1>
        <p className="mt-2 text-slate-500">Registra primero lo esencial. El resto puede completarse después.</p>
      </header>
      <div className="max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <PatientForm action={crearPacienteAction} />
      </div>
    </DashboardLayout>
  );
}