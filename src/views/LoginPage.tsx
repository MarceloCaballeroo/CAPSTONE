import Link from "next/link";
import { LoginForm } from "@/features/auth/LoginForm";
import { AuthLayout } from "@/layouts/AuthLayout";

export function LoginPage() {
  return <AuthLayout><div className="w-full max-w-md"><p className="text-sm font-semibold tracking-[0.2em] text-teal-700">PODOCARE</p><h1 className="mt-4 text-3xl font-semibold text-slate-900">Iniciar sesión</h1><p className="mb-8 mt-2 text-sm text-slate-500">Accede al espacio clínico de tu consulta.</p><LoginForm /><p className="mt-8 text-sm text-slate-500">¿Aún no tienes cuenta? <Link href="/registro" className="text-teal-700 hover:text-teal-900">Crea una</Link></p></div></AuthLayout>;
}

export default LoginPage;