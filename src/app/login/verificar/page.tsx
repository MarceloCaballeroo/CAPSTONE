"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cerrarSesionAction } from "@/app/actions/auth";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { AuthLayout } from "@/layouts/AuthLayout";
import { createClient } from "@/lib/supabase/client";

export default function VerificarPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function verificar(evento: React.FormEvent) {
    evento.preventDefault();
    setOcupado(true);
    setError("");
    const supabase = createClient();
    const { data: factores } = await supabase.auth.mfa.listFactors();
    const factor = factores?.totp[0];
    const { error: errorVerificacion } = factor
      ? await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: codigo.trim() })
      : { error: new Error("sin factor") };
    if (errorVerificacion) {
      setOcupado(false);
      return setError("El código no es válido o expiró. Inténtalo nuevamente.");
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-[0.2em] text-teal-700">PODOCARE</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Verificación en dos pasos</h1>
        <p className="mb-8 mt-2 text-sm text-slate-500">Abre tu app de autenticación e ingresa el código de 6 dígitos.</p>
        <form onSubmit={verificar} className="grid gap-4">
          <Input id="codigo" label="Código" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus value={codigo} onChange={(evento) => setCodigo(evento.target.value)} />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" isLoading={ocupado}>Verificar</Button>
        </form>
        <form action={cerrarSesionAction} className="mt-6">
          <button type="submit" className="text-sm text-teal-700 hover:text-teal-900">Usar otra cuenta</button>
        </form>
      </div>
    </AuthLayout>
  );
}
