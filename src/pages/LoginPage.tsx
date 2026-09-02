import { Card } from "@/components/common/Card";
import { LoginForm } from "@/features/auth/LoginForm";
import { AuthLayout } from "@/layouts/AuthLayout";

export function LoginPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-[0.2em] text-teal-700">PODOCARE</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="mb-8 mt-2 text-sm text-slate-500">Accede al espacio clínico de tu consulta.</p>
        <LoginForm />
      </Card>
    </AuthLayout>
  );
}

export default LoginPage;