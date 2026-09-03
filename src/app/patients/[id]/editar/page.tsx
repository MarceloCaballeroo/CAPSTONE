import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/common/Alert";
import { actualizarPacienteAction } from "@/app/actions/patients";
import { PatientForm } from "@/features/patients/PatientForm";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export default async function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: paciente, error } = await supabase.from("paciente").select("*").eq("id", id).single();
  if (error?.code === "PGRST116") notFound();
  if (error || !paciente) return <DashboardLayout><Alert>No pudimos cargar los datos del paciente.</Alert></DashboardLayout>;

  return (
    <DashboardLayout>
      <header className="mb-8"><Link className="text-sm font-medium text-teal-700 hover:underline" href={`/patients/${id}`}>← Volver a la ficha</Link><h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">Editar paciente</h1></header>
      <div className="max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><PatientForm action={actualizarPacienteAction} paciente={paciente} /></div>
    </DashboardLayout>
  );
}