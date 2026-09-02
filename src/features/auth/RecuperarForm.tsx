"use client";

import { useActionState } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { recuperarPasswordAction } from "@/app/actions/auth";
import type { FormState } from "@/lib/types/auth";

const initialState: FormState = {};

export function RecuperarForm() {
  const [state, formAction, isPending] = useActionState(recuperarPasswordAction, initialState);
  if (state.success) return <Alert variant="success">Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.</Alert>;
  return (
    <form className="grid gap-5" action={formAction}>
      <Input id="email" name="email" type="email" label="Correo electrónico" autoComplete="email" required />
      {state.error && <Alert>{state.error}</Alert>}
      <Button type="submit" isLoading={isPending}>{isPending ? "Enviando" : "Enviar enlace de recuperación"}</Button>
    </form>
  );
}