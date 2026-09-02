import Link from "next/link";
import { RecuperarForm } from "@/features/auth/RecuperarForm";
import { AuthLayout } from "@/layouts/AuthLayout";

export default function RecoverPasswordPage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-[0.2em] text-teal-700">PODOCARE</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Recuperar contraseña</h1>
        <p className="mb-8 mt-2 text-sm text-slate-500">Te enviaremos un enlace para restablecerla.</p>
        <RecuperarForm />
        <p className="mt-8 text-sm text-slate-500"><Link href="/login" className="text-teal-700 hover:text-teal-900">Volver a iniciar sesión</Link></p>
      </div>
    </AuthLayout>
  );
}