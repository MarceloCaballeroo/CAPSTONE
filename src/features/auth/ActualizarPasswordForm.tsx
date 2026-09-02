"use client";

import { useActionState } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { actualizarPasswordAction } from "@/app/actions/auth";
import type { FormState } from "@/lib/types/auth";

const initialState: FormState = {};

export function ActualizarPasswordForm() {
  const [state, formAction, isPending] = useActionState(actualizarPasswordAction, initialState);
  return (
    <form className="grid gap-5" action={formAction}>
      <Input id="password" name="password" type="password" label="Nueva contraseña" autoComplete="new-password" hint="Mínimo 8 caracteres." required />
      <Input id="confirmarPassword" name="confirmarPassword" type="password" label="Confirmar nueva contraseña" autoComplete="new-password" required />
      {state.error && <Alert>{state.error}</Alert>}
      <Button type="submit" isLoading={isPending}>{isPending ? "Guardando" : "Guardar contraseña"}</Button>
    </form>
  );
}