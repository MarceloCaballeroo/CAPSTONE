"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearPagoAction, type EstadoPago } from "@/app/actions/pagos";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import type { Plan } from "@/lib/planes";

const estadoInicial: EstadoPago = {};

export function PagarPlan({ plan, monto }: { plan: Plan; monto: number }) {
  const [state, formAction, isPending] = useActionState(crearPagoAction, estadoInicial);
  const formWebpay = useRef<HTMLFormElement>(null);

  // Webpay exige llegar con un POST que lleve token_ws: el formulario oculto lo hace solo.
  useEffect(() => {
    if (state.url && state.token) formWebpay.current?.submit();
  }, [state.url, state.token]);

  return (
    <div className="mt-2 grid gap-2">
      <form action={formAction}>
        <input type="hidden" name="plan" value={plan} />
        <Button type="submit" variant="secondary" isLoading={isPending} className="w-full">
          Pagar ${monto.toLocaleString("es-CL")}
        </Button>
      </form>
      {state.error && <Alert>{state.error}</Alert>}
      {state.url && state.token && (
        <form ref={formWebpay} method="post" action={state.url} className="hidden">
          <input type="hidden" name="token_ws" value={state.token} />
        </form>
      )}
    </div>
  );
}
