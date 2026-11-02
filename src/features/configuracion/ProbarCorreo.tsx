"use client";

import { useActionState } from "react";
import { probarCorreoAction } from "@/app/actions/configuracion";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import type { FormState } from "@/lib/types/auth";

const estadoInicial: FormState = {};

export function ProbarCorreo() {
  const [state, formAction, isPending] = useActionState(probarCorreoAction, estadoInicial);
  return (
    <div className="grid gap-2">
      <form action={formAction}>
        <Button type="submit" variant="secondary" isLoading={isPending}>Enviar correo de prueba</Button>
      </form>
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && state.mensaje && <Alert variant="success">{state.mensaje}</Alert>}
    </div>
  );
}
