import { AuthLayout } from "@/layouts/AuthLayout";

export default function ConfirmRegistrationPage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-[0.2em] text-teal-700">PODOCARE</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Revisa tu correo</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-500">Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta y configurar tu organización automáticamente.</p>
      </div>
    </AuthLayout>
  );
}