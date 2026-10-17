import Link from "next/link";
import { PatientForm } from "@/features/patients/PatientForm";
import { crearPacienteAction } from "@/app/actions/patients";
import { createClient } from "@/lib/supabase/server";

export default async function NuevoPacientePage() {
  const supabase = await createClient();
  const [{ data: regiones }, { data: comunas }] = await Promise.all([
    supabase.from("region").select("id, nombre, ordinal").order("id"),
    supabase.from("comuna").select("id, nombre, region_id").order("nombre"),
  ]);

  return (
    <>
      <header className="mb-8">
        <Link className="text-sm font-medium text-teal-700 hover:underline" href="/patients">← Volver a pacientes</Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">Nuevo paciente</h1>
        <p className="mt-2 text-slate-500">Registra primero lo esencial. El resto puede completarse después.</p>
      </header>
      <div className="max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <PatientForm action={crearPacienteAction} regiones={regiones ?? []} comunas={comunas ?? []} />
      </div>
    </>
  );
}