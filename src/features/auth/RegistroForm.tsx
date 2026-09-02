"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { registroAction } from "@/app/actions/auth";
import type { FormState } from "@/lib/types/auth";
import { PlanSelector } from "./PlanSelector";

const initialState: FormState = {};

export function RegistroForm() {
  const [state, formAction, isPending] = useActionState(registroAction, initialState);
  const [plan, setPlan] = useState<"individual" | "clinica">("individual");

  return (
    <form className="grid gap-5" action={formAction}>
      <PlanSelector value={plan} onChange={setPlan} />
      <Input id="nombre" name="nombre" label="Nombre completo" autoComplete="name" required />
      {plan === "clinica" && <Input id="nombreOrganizacion" name="nombreOrganizacion" label="Nombre de tu clínica o consulta" hint="Así la verán los demás profesionales que invites." required />}
      <Input id="email" name="email" type="email" label="Correo electrónico" autoComplete="email" required />
      <Input id="password" name="password" type="password" label="Contraseña" autoComplete="new-password" hint="Mínimo 8 caracteres." required />
      <Input id="confirmarPassword" name="confirmarPassword" type="password" label="Confirmar contraseña" autoComplete="new-password" required />
      {state.error && <Alert>{state.error}</Alert>}
      <Button type="submit" isLoading={isPending}>{isPending ? "Creando cuenta" : "Crear cuenta"}</Button>
      <p className="text-sm text-slate-500">Al continuar, confirmas que tratarás los datos de tus pacientes conforme a la Ley N.º 19.628.</p>
    </form>
  );
}