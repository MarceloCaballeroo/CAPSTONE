"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const { error: authError } = await createClient().auth.signInWithPassword({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (authError) setError("No fue posible iniciar sesión. Revisa tus credenciales.");
    else router.push("/dashboard");
    setLoading(false);
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <Input id="email" name="email" type="email" label="Correo electrónico" required />
      <Input id="password" name="password" type="password" label="Contraseña" required minLength={6} />
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <Button disabled={loading} type="submit">{loading ? "Ingresando..." : "Ingresar"}</Button>
    </form>
  );
}