const trazos = {
  inicio: "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5",
  pacientes: "M9 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.8 3.5 5.7",
  agenda: "M6 4.5h12a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3ZM3 9.5h18M8 2.5v4M16 2.5v4",
  alerta: "M12 3.5 2.5 20h19L12 3.5ZM12 10v4.5M12 17.5v.01",
  reloj: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7v5l3 2",
  flecha: "M5 12h14M13 6l6 6-6 6",
  mas: "M12 5v14M5 12h14",
  derivacion: "M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4",
  buscar: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM20 20l-3.5-3.5",
  pie: "M8.5 21c-2.4 0-3.8-1.9-3.8-4.6 0-3.1 1.6-5.1 1.6-8.2C6.3 5.6 7.7 3.5 10 3.5s3.5 2.3 3.5 4.8c0 3.1-2 4.7-2 8.1 0 2.8-.7 4.6-3 4.6ZM16.6 3.7a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6ZM18.9 7a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM19.8 10.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
  info: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 11v5M12 8v.01",
  salir: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10",
  ajustes: "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  escudo: "M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3ZM9 12l2 2 4-4",
} as const;

export type NombreIcono = keyof typeof trazos;

export function Icono({ nombre, className = "h-5 w-5" }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={trazos[nombre]} />
    </svg>
  );
}
