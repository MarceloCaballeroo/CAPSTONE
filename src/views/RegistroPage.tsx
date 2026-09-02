import Link from "next/link";
import { RegistroForm } from "@/features/auth/RegistroForm";
import { AuthLayout } from "@/layouts/AuthLayout";

export function RegistroPage() {
  return <AuthLayout><div className="w-full max-w-md"><p className="text-sm font-semibold tracking-[0.2em] text-teal-700">PODOCARE</p><h1 className="mt-4 text-3xl font-semibold text-slate-900">Crear cuenta</h1><p className="mb-8 mt-2 text-sm text-slate-500">Empieza a digitalizar tu consulta hoy.</p><RegistroForm /><p className="mt-8 text-sm text-slate-500">¿Ya tienes cuenta? <Link href="/login" className="text-teal-700 hover:text-teal-900">Inicia sesión</Link></p></div></AuthLayout>;
}

export default RegistroPage;