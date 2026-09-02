import { ActualizarPasswordForm } from "@/features/auth/ActualizarPasswordForm";
import { AuthLayout } from "@/layouts/AuthLayout";

export function ActualizarPasswordPage() {
  return <AuthLayout><div className="w-full max-w-md"><p className="text-sm font-semibold tracking-[0.2em] text-teal-700">PODOCARE</p><h1 className="mt-4 text-3xl font-semibold text-slate-900">Elige una nueva contraseña</h1><p className="mb-8 mt-2 text-sm text-slate-500">Debe tener al menos 8 caracteres.</p><ActualizarPasswordForm /></div></AuthLayout>;
}

export default ActualizarPasswordPage;