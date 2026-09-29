"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {});

  return (
    <form className="grid gap-5" action={formAction}>
      <Input id="email" name="email" type="email" label="Correo electrónico" required />
      <Input id="password" name="password" type="password" label="Contraseña" required minLength={6} />
      {state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <Button disabled={isPending} type="submit">{isPending ? "Ingresando..." : "Ingresar"}</Button>
    </form>
  );
}