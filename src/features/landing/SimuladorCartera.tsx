"use client";

import { useState } from "react";
import { GRUPOS_IWGDF, textoControlSugerido, type NivelRiesgo } from "@/lib/clinical-rules";

// Cartera de ejemplo; los intervalos salen de GRUPOS_IWGDF.
const NIVELES: { nivel: NivelRiesgo; punto: string; barra: string; inicial: number }[] = [
  { nivel: "muy_bajo", punto: "bg-slate-500", barra: "bg-slate-500", inicial: 18 },
  { nivel: "bajo", punto: "bg-teal-700", barra: "bg-teal-500", inicial: 12 },
  { nivel: "moderado", punto: "bg-amber-600", barra: "bg-amber-600", inicial: 7 },
  { nivel: "alto", punto: "bg-red-700", barra: "bg-red-600", inicial: 3 },
];

const clp = (monto: number) => `$${Math.round(monto).toLocaleString("es-CL")}`;
const decimal = (valor: number) => valor.toLocaleString("es-CL", { maximumFractionDigits: 1 });

export function SimuladorCartera({ planReferencia }: { planReferencia: string }) {
  const [pacientes, setPacientes] = useState(() => Object.fromEntries(NIVELES.map((n) => [n.nivel, n.inicial])) as Record<NivelRiesgo, number>);
  const [valorAtencion, setValorAtencion] = useState(20000);

  const filas = NIVELES.map((n) => {
    const grupo = GRUPOS_IWGDF[n.nivel];
    const [minMeses, maxMeses] = grupo.controlMeses;
    const cantidad = pacientes[n.nivel];
    return { ...n, grupo, cantidad, porMesMin: cantidad / maxMeses, porMesMax: cantidad / minMeses };
  });
  const total = filas.reduce((suma, f) => suma + f.cantidad, 0);
  const minimo = filas.reduce((suma, f) => suma + f.porMesMin, 0);
  const maximo = filas.reduce((suma, f) => suma + f.porMesMax, 0);
  const escala = maximo || 1;
  const enRiesgo = pacientes.moderado + pacientes.alto;

  const barra = (campo: "porMesMin" | "porMesMax", titulo: string) => (
    <div>
      <div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">{titulo}</span><span className="tabular-nums text-slate-300">{decimal(campo === "porMesMin" ? minimo : maximo)} al mes</span></div>
      <div role="img" aria-label={`${titulo}: ${filas.map((f) => `${f.grupo.nombre} ${decimal(f[campo])}`).join(", ")} controles al mes`} className="flex h-3.5 overflow-hidden rounded-full bg-white/10">
        {filas.map((f) => <span key={f.nivel} className={`h-full ${f.barra}`} style={{ width: `${(f[campo] / escala) * 100}%` }} />)}
      </div>
    </div>
  );

  return (
    <div className="mt-11 grid gap-4 lg:grid-cols-[5fr_6fr]">
      <form onSubmit={(evento) => evento.preventDefault()} className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <fieldset className="grid min-w-0 gap-5">
          <legend className="mb-4 font-semibold">Pacientes con diabetes, por categoría</legend>
          {filas.map((f) => (
            <label key={f.nivel} className="block">
              <span className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-slate-700">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${f.punto}`} />
                  Categoría {f.grupo.grupo} · {f.grupo.nombre.toLowerCase()}
                  <span className="text-sm font-normal text-slate-500">control {textoControlSugerido(f.nivel)}</span>
                </span>
                <span className="text-xl font-semibold tabular-nums">{f.cantidad}</span>
              </span>
              <input type="range" min={0} max={150} value={f.cantidad} onChange={(evento) => setPacientes({ ...pacientes, [f.nivel]: Number(evento.target.value) })} className="h-7 w-full accent-teal-700" />
            </label>
          ))}
        </fieldset>
        <label className="block">
          <span className="mb-1.5 flex items-baseline justify-between gap-3"><span className="font-medium text-slate-700">Valor de tu atención</span><span className="text-xl font-semibold tabular-nums">{clp(valorAtencion)}</span></span>
          <input type="range" min={5000} max={60000} step={1000} value={valorAtencion} onChange={(evento) => setValorAtencion(Number(evento.target.value))} className="h-7 w-full accent-teal-700" />
        </label>
      </form>

      <div className="relative overflow-hidden rounded-[32px] bg-[#0B1324] p-6 text-slate-50 sm:p-10">
        <div aria-hidden="true" className="absolute -bottom-1/3 -left-1/4 h-[90%] w-[90%] bg-[radial-gradient(circle,rgba(20,184,166,.3)_0%,transparent_65%)]" />
        <div className="relative">
          <p className="text-sm font-semibold text-teal-300">Seguimiento según IWGDF</p>
          <p aria-live="polite" className="mt-2 text-5xl font-semibold leading-tight tracking-tight tabular-nums sm:text-7xl">{decimal(minimo)} a {decimal(maximo)}</p>
          <p className="mt-1.5 text-slate-300">controles al mes para tus {total} pacientes con diabetes.</p>
          <div className="mt-7 grid gap-3.5">
            {barra("porMesMin", "Mínimo")}
            {barra("porMesMax", "Máximo")}
            <div aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-300">
              {filas.map((f) => <span key={f.nivel} className="inline-flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-sm ${f.barra}`} />{f.grupo.nombre}</span>)}
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-3xl font-semibold tabular-nums">{enRiesgo}</p><p className="mt-0.5 text-sm leading-snug text-slate-300">pacientes que deben volver cada 6 meses o menos</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-3xl font-semibold tabular-nums">{clp(minimo * valorAtencion)}</p><p className="mt-0.5 text-sm leading-snug text-slate-300">al mes, como mínimo, en controles de seguimiento</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xl font-semibold">{planReferencia}</p><p className="mt-0.5 text-sm leading-snug text-slate-300">costo del Plan Individual</p></div>
          </div>
          <p className="mt-5 text-sm leading-normal text-slate-400">Intervalos de la estratificación IWGDF que usa PodoCare. Estimación con los datos que ingresas, no una cotización.</p>
        </div>
      </div>
    </div>
  );
}
