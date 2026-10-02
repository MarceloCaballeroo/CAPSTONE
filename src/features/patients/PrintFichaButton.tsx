"use client";

import { Button } from "@/components/common/Button";

export function PrintFichaButton() {
  return <Button className="print-hidden" onClick={() => window.print()} type="button" variant="secondary">Imprimir / Guardar PDF</Button>;
}