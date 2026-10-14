"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { createClient } from "@/lib/supabase/client";

type Inscripcion = { factorId: string; qr: string; secreto: string };

export function DosPasos() {
  const router = useRouter();
  const [factorActivo, setFactorActivo] = useState<string | null | undefined>(undefined);
  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    createClient().auth.mfa.listFactors().then(({ data }) => setFactorActivo(data?.totp[0]?.id ?? null));
  }, []);

  async function activar() {
    setOcupado(true);
    setError("");
    const supabase = createClient();
    // Un intento anterior sin confirmar bloquea una nueva inscripción: se descarta primero.
    const { data: factores } = await supabase.auth.mfa.listFactors();
    for (const factor of factores?.all.filter((item) => item.status === "unverified") ?? []) await supabase.auth.mfa.unenroll({ factorId: factor.id });
    const { data, error: errorInscripcion } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "PodoCare" });
    setOcupado(false);
    if (errorInscripcion || !data) return setError("No pudimos iniciar la activación. Inténtalo nuevamente.");
    setInscripcion({ factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret });
  }

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!inscripcion) return;
    setOcupado(true);
    const { error: errorVerificacion } = await createClient().auth.mfa.challengeAndVerify({ factorId: inscripcion.factorId, code: codigo.trim() });
    setOcupado(false);
    if (errorVerificacion) return setError("El código no es válido o expiró. Revisa la hora de tu teléfono e inténtalo de nuevo.");
    setFactorActivo(inscripcion.factorId);
    setInscripcion(null);
    setCodigo("");
    router.refresh();
  }

  async function desactivar() {
    if (!factorActivo || !window.confirm("¿Desactivar la verificación en dos pasos? Tu cuenta quedará protegida solo con la contraseña.")) return;
    setOcupado(true);
    const { error: errorBaja } = await createClient().auth.mfa.unenroll({ factorId: factorActivo });
    setOcupado(false);
    if (errorBaja) return setError("No pudimos desactivarla. Cierra sesión, vuelve a entrar con tu código e inténtalo otra vez.");
    setFactorActivo(null);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="text-lg font-semibold text-slate-900">Verificación en dos pasos</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Además de tu contraseña, pide un código de una app como Google Authenticator o Microsoft Authenticator al iniciar sesión.</p>
          {factorActivo !== undefined && (
            <span className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${factorActivo ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {factorActivo ? "Activada" : "Desactivada · recomendada para datos clínicos"}
            </span>
          )}
        </div>
        {factorActivo === null && !inscripcion && <Button variant="secondary" onClick={activar} isLoading={ocupado}>Activar</Button>}
        {factorActivo && <Button variant="secondary" onClick={desactivar} isLoading={ocupado}>Desactivar</Button>}
      </div>

      {inscripcion && (
        <form onSubmit={confirmar} className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[auto_1fr] sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR en data URI generado por Supabase */}
          <img src={inscripcion.qr} alt="Código QR para tu app de autenticación" width={176} height={176} className="rounded-lg border border-slate-200 bg-white p-2" />
          <div className="grid gap-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Abre tu app de autenticación y escanea el código.</li>
              <li>Si no puedes escanear, ingresa esta clave: <code className="break-all rounded bg-white px-1.5 py-0.5 font-mono text-xs">{inscripcion.secreto}</code></li>
              <li>Escribe el código de 6 dígitos que muestra la app.</li>
            </ol>
            <Input id="codigoMfa" label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={codigo} onChange={(evento) => setCodigo(evento.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" isLoading={ocupado}>Confirmar y activar</Button>
              <Button type="button" variant="ghost" onClick={() => setInscripcion(null)}>Cancelar</Button>
            </div>
          </div>
        </form>
      )}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
