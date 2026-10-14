"use client";

import type { KeyboardEvent } from "react";
import type { HallazgoClinico, LadoPie } from "@/lib/types/hallazgos";
import { cajaParte, cajaUna, DEDOS_UNA, nombreDedoUna, PARTE_UNA, PARTES_UNA, ubicarParteUna, type Caja, type DedoUna, type ParteUna } from "@/lib/types/unas";

export type UnaSeleccionada = { lado: LadoPie; dedo: DedoUna };

type MapaUnasProps = {
  hallazgos: HallazgoClinico[];
  vista: "ambos" | LadoPie;
  seleccionada: UnaSeleccionada;
  onSeleccionarUna: (una: UnaSeleccionada) => void;
  onSeleccionarParte: (parte: ParteUna) => void;
  parteMarcada: ParteUna | null;
  hallazgoSeleccionadoId: string | null;
  resaltados: Set<string>;
  onSeleccionarHallazgo: (id: string) => void;
  registroHabilitado: boolean;
};

const PIEL = "#ead2c2";
const RODETE = "#dfb7a1";
const LAMINA = "#f7efe9";
const CONTORNO = "#b58f78";
const DETALLE: Caja = { x: 30, y: 18, ancho: 60, alto: 84 };

const colorDolor = (intensidad: number) => (intensidad >= 7 ? "#dc2626" : intensidad >= 4 ? "#d97706" : "#0f766e");
const peorDolor = (hallazgos: HallazgoClinico[]) => Math.max(...hallazgos.map((hallazgo) => hallazgo.intensidad_dolor));
const nombreCortoDedo = (dedo: DedoUna) => (dedo === 1 ? "Hallux" : `${dedo}.º`);
const activarConTeclado = (accion: () => void) => (evento: KeyboardEvent) => {
  if (evento.key !== "Enter" && evento.key !== " ") return;
  evento.preventDefault();
  accion();
};

function Antepie({ lado }: { lado: LadoPie }) {
  return (
    <g aria-hidden="true" fill={PIEL}>
      <rect x={lado === "derecho" ? 5 : -95} y={2} width={90} height={30} rx={14} />
      {DEDOS_UNA.map((dedo) => {
        const una = cajaUna(lado, dedo);
        // 1,6 × el ancho de la uña: los dedos vecinos se superponen y no queda una línea entre ellos.
        const ancho = una.ancho * 1.6;
        return <rect key={dedo} x={una.x + una.ancho / 2 - ancho / 2} y={una.y - 3} width={ancho} height={17 - una.y} rx={ancho / 2} />;
      })}
      <text x={lado === "derecho" ? 50 : -50} y={26} textAnchor="middle" fontSize={4.6} fill="#475569">Pie {lado}</text>
    </g>
  );
}

export function MapaUnas({ hallazgos, vista, seleccionada, onSeleccionarUna, onSeleccionarParte, parteMarcada, hallazgoSeleccionadoId, resaltados, onSeleccionarHallazgo, registroHabilitado }: MapaUnasProps) {
  const ubicados = hallazgos.flatMap((hallazgo) => {
    const una = ubicarParteUna(hallazgo.lado_pie, hallazgo.coordenada_x, hallazgo.coordenada_y);
    return una ? [{ hallazgo, ...una }] : [];
  });
  const lados: LadoPie[] = vista === "ambos" ? ["izquierdo", "derecho"] : [vista];
  const delaUna = (lado: LadoPie, dedo: DedoUna) => ubicados.filter((item) => item.hallazgo.lado_pie === lado && item.dedo === dedo);
  const enUnaSeleccionada = delaUna(seleccionada.lado, seleccionada.dedo);
  const viewBox = vista === "ambos" ? "-100 -42 200 74" : vista === "izquierdo" ? "-100 -42 100 74" : "0 -42 100 74";
  const ladoMedialDetalle = seleccionada.lado === "derecho" ? "izquierda" : "derecha";

  // Varias marcas en la misma parte se separan en horizontal para que todas sean visibles.
  const repetidas = new Map<string, number>();
  const marcas = ubicados.filter((item) => lados.includes(item.hallazgo.lado_pie)).map((item) => {
    const clave = `${item.hallazgo.lado_pie}:${item.hallazgo.coordenada_x}:${item.hallazgo.coordenada_y}`;
    const indice = repetidas.get(clave) ?? 0;
    repetidas.set(clave, indice + 1);
    return { ...item, desplazamiento: indice * 2.6 };
  });

  return (
    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-2">
        <p className="text-xs text-slate-500">Vista dorsal, como el paciente mira sus pies. Elige una uña para ver sus zonas.</p>
        <svg viewBox={viewBox} className="w-full rounded-lg bg-slate-100" role="group" aria-label="Uñas de los pies">
          {lados.map((lado) => <Antepie key={lado} lado={lado} />)}
          {lados.flatMap((lado) => DEDOS_UNA.map((dedo) => {
            const una = cajaUna(lado, dedo);
            const elegida = seleccionada.lado === lado && seleccionada.dedo === dedo;
            const cantidad = delaUna(lado, dedo).length;
            const seleccionar = () => onSeleccionarUna({ lado, dedo });
            return (
              <g key={`${lado}-${dedo}`} role="button" tabIndex={0} aria-pressed={elegida} onClick={seleccionar} onKeyDown={activarConTeclado(seleccionar)}
                aria-label={`Uña del ${nombreDedoUna(dedo)}, pie ${lado}${cantidad ? `, ${cantidad} ${cantidad === 1 ? "hallazgo" : "hallazgos"}` : ""}`}
                className="group cursor-pointer outline-none">
                <rect x={una.x - una.ancho * 0.25} y={una.y - 3} width={una.ancho * 1.5} height={una.alto + 10} fill="transparent" />
                <rect x={una.x} y={una.y} width={una.ancho} height={una.alto} rx={una.ancho * 0.32}
                  fill={elegida ? "#ccfbf1" : LAMINA} stroke={elegida ? "#0f766e" : CONTORNO} strokeWidth={elegida ? 0.9 : 0.4}
                  className="transition-colors group-hover:fill-teal-50" />
                <rect x={una.x - 1.6} y={una.y - 1.6} width={una.ancho + 3.2} height={una.alto + 3.2} rx={una.ancho * 0.4}
                  fill="none" stroke="#0f766e" strokeWidth={0.8} strokeDasharray="1.6 1.2" className="opacity-0 group-focus-visible:opacity-100" />
              </g>
            );
          }))}
          {marcas.map(({ hallazgo, desplazamiento }) => {
            const destacada = hallazgo.id === hallazgoSeleccionadoId || resaltados.has(hallazgo.id);
            return (
              <circle key={hallazgo.id} aria-hidden="true" cx={hallazgo.coordenada_x + desplazamiento} cy={hallazgo.coordenada_y} r={destacada ? 2.4 : 1.6}
                fill={colorDolor(hallazgo.intensidad_dolor)} stroke="#fff" strokeWidth={0.5} className="cursor-pointer"
                onClick={(evento) => {
                  evento.stopPropagation();
                  onSeleccionarHallazgo(hallazgo.id);
                }} />
            );
          })}
        </svg>
      </div>

      <section aria-labelledby="detalle-una-heading" className="grid content-start gap-3 rounded-lg border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="detalle-una-heading" className="text-sm font-semibold text-slate-900">Uña del {nombreDedoUna(seleccionada.dedo)} · pie {seleccionada.lado}</h3>
          {vista === "ambos" && (
            <div role="group" aria-label="Pie de la uña" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(["izquierdo", "derecho"] as const).map((lado) => (
                <button key={lado} type="button" aria-pressed={seleccionada.lado === lado} onClick={() => onSeleccionarUna({ lado, dedo: seleccionada.dedo })}
                  className={`min-h-9 rounded-md px-2.5 text-xs font-medium ${seleccionada.lado === lado ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                  {lado === "izquierdo" ? "Izquierdo" : "Derecho"}
                </button>
              ))}
            </div>
          )}
        </div>
        <div role="group" aria-label="Dedo" className="grid grid-cols-5 gap-1">
          {DEDOS_UNA.map((dedo) => {
            const cantidad = delaUna(seleccionada.lado, dedo).length;
            return (
              <button key={dedo} type="button" aria-pressed={seleccionada.dedo === dedo} onClick={() => onSeleccionarUna({ lado: seleccionada.lado, dedo })}
                aria-label={`${nombreDedoUna(dedo)}${cantidad ? `, ${cantidad} ${cantidad === 1 ? "hallazgo" : "hallazgos"}` : ""}`}
                className={`relative min-h-10 rounded-md border text-xs font-medium ${seleccionada.dedo === dedo ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}>
                {nombreCortoDedo(dedo)}
                {cantidad > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-slate-800 px-1 text-[10px] text-white">{cantidad}</span>}
              </button>
            );
          })}
        </div>

        <svg viewBox="0 0 120 132" className="mx-auto w-full max-w-[15rem]" role="group" aria-label={`Zonas de la uña del ${nombreDedoUna(seleccionada.dedo)}. El lado medial está a la ${ladoMedialDetalle}.`}>
          <g aria-hidden="true">
            <rect x={14} y={4} width={92} height={140} rx={42} fill={PIEL} />
            <ellipse cx={27} cy={60} rx={7} ry={32} fill={RODETE} />
            <ellipse cx={93} cy={60} rx={7} ry={32} fill={RODETE} />
            <rect x={DETALLE.x} y={DETALLE.y} width={DETALLE.ancho} height={DETALLE.alto} rx={16} fill={LAMINA} stroke={CONTORNO} strokeWidth={0.8} />
            <ellipse cx={60} cy={94} rx={19} ry={7} fill="#fdf8f4" />
            <rect x={27} y={100} width={66} height={9} rx={4.5} fill={RODETE} />
            <text x={60} y={13} textAnchor="middle" fontSize={5} fill="#475569">Distal</text>
            <text x={60} y={124} textAnchor="middle" fontSize={5} fill="#475569">Proximal</text>
            <text x={7} y={62} textAnchor="middle" fontSize={5} fill="#475569" transform="rotate(-90 7 62)">{seleccionada.lado === "derecho" ? "Medial" : "Lateral"}</text>
            <text x={113} y={62} textAnchor="middle" fontSize={5} fill="#475569" transform="rotate(90 113 62)">{seleccionada.lado === "derecho" ? "Lateral" : "Medial"}</text>
          </g>
          {PARTES_UNA.map((parte) => {
            const caja = cajaParte(seleccionada.lado, seleccionada.dedo, parte, DETALLE);
            const marcada = parteMarcada === parte;
            const enParte = enUnaSeleccionada.filter((item) => item.parte === parte);
            const seleccionar = () => onSeleccionarParte(parte);
            return (
              <g key={parte} role="button" tabIndex={registroHabilitado ? 0 : -1} aria-disabled={!registroHabilitado} aria-pressed={marcada}
                aria-label={`${PARTE_UNA[parte].nombre}: ${PARTE_UNA[parte].detalle}`}
                onClick={registroHabilitado ? seleccionar : undefined} onKeyDown={registroHabilitado ? activarConTeclado(seleccionar) : undefined}
                className={`group outline-none ${registroHabilitado ? "cursor-pointer" : "cursor-not-allowed"}`}>
                <rect x={caja.x} y={caja.y} width={caja.ancho} height={caja.alto} rx={2}
                  fill={marcada ? "rgba(245, 158, 11, 0.4)" : "rgba(15, 118, 110, 0)"} stroke="#64748b" strokeWidth={0.5} strokeDasharray="2 1.5"
                  className={registroHabilitado && !marcada ? "transition-colors group-hover:fill-teal-700/15 group-focus-visible:fill-teal-700/20" : undefined} />
                {enParte.length > 0 && (
                  <g aria-hidden="true">
                    <circle cx={caja.x + caja.ancho / 2} cy={caja.y + caja.alto / 2} r={5.5} fill={colorDolor(peorDolor(enParte.map((item) => item.hallazgo)))} stroke="#fff" strokeWidth={1} />
                    <text x={caja.x + caja.ancho / 2} y={caja.y + caja.alto / 2 + 2} textAnchor="middle" fontSize={5.5} fontWeight={700} fill="#fff">{enParte.length}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        <ul className="grid gap-1.5" aria-label="Zonas de la uña">
          {PARTES_UNA.map((parte) => {
            const cantidad = enUnaSeleccionada.filter((item) => item.parte === parte).length;
            return (
              <li key={parte}>
                <button type="button" disabled={!registroHabilitado} aria-pressed={parteMarcada === parte} onClick={() => onSeleccionarParte(parte)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-60 ${parteMarcada === parte ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-teal-700"}`}>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">{PARTE_UNA[parte].nombre}</span>
                    <span className="block text-xs text-slate-500">{PARTE_UNA[parte].detalle}</span>
                  </span>
                  {cantidad > 0 && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{cantidad} {cantidad === 1 ? "hallazgo" : "hallazgos"}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {!registroHabilitado && <p className="text-xs text-slate-500">Registra una atención clínica para marcar hallazgos en las uñas.</p>}
      </section>
    </div>
  );
}
