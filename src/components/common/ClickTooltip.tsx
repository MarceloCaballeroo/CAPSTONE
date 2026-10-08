"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function ClickTooltip({ children, content, ariaLabel }: { children: ReactNode; content: string; ariaLabel?: string }) {
  const id = useId();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (evento: PointerEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setAbierto(false);
      botonRef.current?.focus();
    };
    document.addEventListener("pointerdown", cerrarFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={botonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={abierto}
        aria-describedby={id}
        onClick={() => setAbierto(!abierto)}
        className="inline-flex items-center gap-1.5 rounded-full text-left focus-visible:outline-2 focus-visible:outline-teal-700"
      >
        {children}<span aria-hidden="true" className="text-[14px]">ⓘ</span>
      </button>
      <span id={id} role="tooltip" hidden={!abierto} className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg bg-slate-800 p-3 text-xs leading-relaxed text-slate-100 shadow-xl">
        {content}
      </span>
    </div>
  );
}
