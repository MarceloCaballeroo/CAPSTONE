import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { DemoPie3D } from "@/features/landing/DemoPie3D";
import { SimuladorCartera } from "@/features/landing/SimuladorCartera";
import { GRUPOS_IWGDF, textoControlSugerido, type NivelRiesgo } from "@/lib/clinical-rules";
import { PLANES } from "@/lib/planes";

const GRAD = "bg-linear-to-r from-teal-700 via-teal-600 to-cyan-700 bg-clip-text text-transparent";
const GRAD_OSCURO = "bg-linear-to-r from-teal-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent";
const BTN = "inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-semibold whitespace-nowrap transition hover:brightness-110";
const H2 = "text-3xl font-semibold leading-tight tracking-tight sm:text-5xl";
const LEAD = "text-lg leading-relaxed text-slate-600";
const PANEL = "relative overflow-hidden rounded-[32px] bg-[#0B1324] text-slate-50";
const VIDRIO = "rounded-[20px] border border-white/10 bg-white/5 backdrop-blur";

const CATEGORIAS: { nivel: NivelRiesgo; borde: string; numero: string }[] = [
  { nivel: "muy_bajo", borde: "border-t-slate-500", numero: "text-slate-500" },
  { nivel: "bajo", borde: "border-t-teal-700", numero: "text-teal-700" },
  { nivel: "moderado", borde: "border-t-amber-600", numero: "text-amber-700" },
  { nivel: "alto", borde: "border-t-red-700", numero: "text-red-700" },
];


// Mezcla de slate-700 a teal-300 según la intensidad (0 a 1) del mapa de calor.
function colorCalor(t: number): string {
  const desde = [51, 65, 85];
  const hasta = [94, 234, 212];
  return `rgb(${desde.map((d, i) => Math.round(d + (hasta[i] - d) * t)).join(",")})`;
}

function Logo({ size }: { size: number }) {
  // El PNG trae margen alrededor del sello circular; se recorta al círculo.
  const escala = size / 425;
  return (
    <span className="relative block shrink-0 overflow-hidden rounded-full bg-white" style={{ width: size, height: size }}>
      <Image src="/podocare-logo.png" alt="" width={1024} height={559} priority className="absolute max-w-none" style={{ width: 1024 * escala, height: "auto", left: -300 * escala, top: -75 * escala }} />
    </span>
  );
}

function VisorDemo() {
  return (
    <div className="relative mx-auto mt-12 max-w-4xl text-left sm:mt-20">
      <div aria-hidden="true" className="absolute -inset-x-[4%] top-[8%] -bottom-[8%] rounded-[40px] bg-linear-to-br from-teal-700/25 to-cyan-700/20 blur-3xl" />
      <div className="relative rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_30px_80px_-20px_rgba(15,23,42,.25)] sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1 pb-3">
          <p className="font-semibold">Visor 3D del pie</p>
          <p className="text-sm text-slate-500">El mismo modelo que usas en la ficha clínica</p>
        </div>
        <DemoPie3D />
      </div>
    </div>
  );
}

function Graficos() {
  const evolucion = "M100 55C143 55 143 55 186 55C229 55 228 125 271 125C314 125 314 125 357 125C400 125 400 125 443 125C486 125 486 195 529 195C572 195 571 195 614 195C657 195 657 195 700 195";
  const cartera: { nivel: NivelRiesgo; n: number; color: string }[] = [
    { nivel: "muy_bajo", n: 14, color: "#64748B" },
    { nivel: "bajo", n: 9, color: "#14B8A6" },
    { nivel: "moderado", n: 5, color: "#D97706" },
    { nivel: "alto", n: 2, color: "#DC2626" },
  ];
  const totalCartera = cartera.reduce((suma, c) => suma + c.n, 0);
  const controlCercano = cartera.filter((c) => c.nivel === "moderado" || c.nivel === "alto").reduce((suma, c) => suma + c.n, 0);
  const zonas = [
    { nombre: "Cabezas metatarsianas mediales", patron: "^cabeza_mt_[12]$", n: 12 },
    { nombre: "Dedos", patron: "^(hallux|dedo_[2-5])$", n: 7 },
    { nombre: "Talón", patron: "^talon$", n: 6 },
    { nombre: "Cabezas metatarsianas laterales", patron: "^cabeza_mt_[345]$", n: 5 },
    { nombre: "Mediopié y arco", patron: "^(diafisis_mt|mediopie|arco_medial|base_mt_5)$", n: 2 },
  ].map((zona, _, todas) => ({ ...zona, color: colorCalor(zona.n / Math.max(...todas.map((z) => z.n))) }));

  return (
    <div className="relative mt-7 grid gap-4 lg:grid-cols-[7fr_5fr]">
      <figure className={`${VIDRIO} m-0 p-5 sm:p-8 lg:col-span-2`}>
        <figcaption><span className="block text-lg font-semibold">Evolución de la categoría IWGDF</span><span className="mt-1 block text-sm text-slate-300">Un paciente, ocho atenciones</span></figcaption>
        <svg viewBox="0 0 720 350" role="img" aria-label="Gráfico de áreas con datos ficticios: el paciente está en categoría 3 alto en las atenciones 1 y 2, en categoría 2 moderado de la 3 a la 5 y en categoría 1 bajo de la 6 a la 8" className="mt-5 h-auto w-full">
          <defs><linearGradient id="relleno-evolucion" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5EEAD4" stopOpacity={0.38} /><stop offset="1" stopColor="#5EEAD4" stopOpacity={0} /></linearGradient></defs>
          {[["#B91C1C", 0.16, "3 Alto"], ["#D97706", 0.13, "2 Moderado"], ["#0F766E", 0.2, "1 Bajo"], ["#64748B", 0.14, "0 Muy bajo"]].map(([color, opacidad, etiqueta], i) => (
            <g key={etiqueta}>
              <rect x={100} y={20 + i * 70} width={600} height={70} fill={color as string} fillOpacity={opacidad as number} />
              <rect x={0} y={49 + i * 70} width={10} height={10} rx={2} fill={color as string} />
              <text x={16} y={59 + i * 70} fontSize={13} fontWeight={500} fill="#CBD5E1">{etiqueta}</text>
            </g>
          ))}
          <line x1={100} y1={300} x2={700} y2={300} stroke="#F8FAFC" strokeOpacity={0.25} />
          <path d={`${evolucion}L700 300L100 300Z`} fill="url(#relleno-evolucion)" />
          <path d={evolucion} fill="none" stroke="#5EEAD4" strokeWidth={3} strokeLinecap="round" />
          {[[100, 55], [186, 55], [271, 125], [357, 125], [443, 125], [529, 195], [614, 195], [700, 195]].map(([cx, cy], i) => (
            <circle key={cx} cx={cx} cy={cy} r={i === 5 ? 8 : 6} fill={i === 5 ? "#F8FAFC" : "#5EEAD4"} stroke="#0B1324" strokeWidth={3} />
          ))}
          <line x1={529} y1={185} x2={548} y2={152} stroke="#F8FAFC" strokeWidth={1.5} />
          <rect x={490} y={112} width={210} height={40} rx={20} fill="#F8FAFC" />
          <text x={595} y={137} fontSize={14} fontWeight={600} fill="#0F172A" textAnchor="middle">Baja a Categoría 1 · bajo</text>
          {[100, 186, 271, 357, 443, 529, 614, 700].map((x, i) => <text key={x} x={x} y={326} fontSize={13} fill="#CBD5E1" textAnchor="middle">A{i + 1}</text>)}
        </svg>
      </figure>

      <figure className={`${VIDRIO} m-0 p-5 sm:p-8`}>
        <figcaption><span className="block text-lg font-semibold">Hallazgos por zona del pie</span><span className="mt-1 block text-sm text-slate-300">Planta del modelo 3D · suma de la cartera, últimos seis meses</span></figcaption>
        <div className="mt-4 grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div role="img" aria-label={`Mapa de calor sobre la planta del pie con datos ficticios: ${zonas.map((z) => `${z.nombre} ${z.n}`).join(", ")}`}>
            <DemoPie3D calor={zonas.map(({ patron, color }) => ({ patron, color }))} />
          </div>
          <div>
            <ol className="grid gap-3 text-[15px]">
              {zonas.map((z) => (
                <li key={z.nombre} className="flex items-center justify-between gap-3 border-b border-white/10 pb-2.5 last:border-0">
                  <span className="flex items-center gap-2.5"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ background: z.color }} />{z.nombre}</span>
                  <span className="font-semibold tabular-nums">{z.n}</span>
                </li>
              ))}
            </ol>
            <div aria-hidden="true" className="mt-5 flex items-center gap-3 text-[13px] text-slate-300"><span>Menos</span><span className="h-2 max-w-48 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${colorCalor(0)}, ${colorCalor(1)})` }} /><span>Más hallazgos</span></div>
          </div>
        </div>
      </figure>

      <figure className={`${VIDRIO} m-0 p-5 sm:p-8`}>
        <figcaption><span className="block text-lg font-semibold">Cartera por categoría IWGDF</span><span className="mt-1 block text-sm text-slate-300">Según la última atención de cada paciente</span></figcaption>
        <p className="mt-6 text-5xl font-semibold tracking-tight tabular-nums">{totalCartera}<span className="ml-2 text-lg font-normal tracking-normal text-slate-300">pacientes con diabetes</span></p>
        <p className="mt-2 text-[15px] text-slate-300"><strong className="font-semibold text-white">{controlCercano} pacientes</strong> deben volver cada 6 meses o menos.</p>
        <div aria-hidden="true" className="mt-5 flex h-3 overflow-hidden rounded-full">
          {cartera.map((c) => <span key={c.nivel} className="h-full" style={{ width: `${(c.n / totalCartera) * 100}%`, background: c.color }} />)}
        </div>
        <ul className="mt-6 grid gap-4">
          {cartera.map((c) => {
            const grupo = GRUPOS_IWGDF[c.nivel];
            const porcentaje = Math.round((c.n / totalCartera) * 100);
            return (
              <li key={c.nivel}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-baseline gap-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center self-center rounded-md text-xs font-bold text-white" style={{ background: c.color }}>{grupo.grupo}</span>
                    <span><span className="font-semibold">{grupo.nombre}</span><span className="block text-[13px] text-slate-400">Control {textoControlSugerido(c.nivel)}</span></span>
                  </span>
                  <span className="text-right tabular-nums"><span className="font-semibold">{c.n}</span><span className="text-slate-400"> · {porcentaje}%</span></span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${porcentaje}%`, background: c.color }} /></div>
              </li>
            );
          })}
        </ul>
      </figure>
    </div>
  );
}

const PASOS = [
  ["Evalúa", "Anamnesis, sensibilidad, pulsos y hallazgos marcados por zona en el mapa plantar, de uñas o en el modelo 3D del pie."],
  ["Clasifica", "El sistema calcula la categoría de riesgo IWGDF de cada paciente, sin depender de tu memoria."],
  ["Decide", "Ante una señal de alarma te sugiere derivar. La decisión siempre es tuya."],
  ["Deja respaldo", "Consentimiento del paciente y cada acción registrada en un historial de auditoría que no se puede modificar."],
];

const DOLORES = [
  ["Fichas en papel o Excel", "Anotas después de cada paciente, muchas veces en el auto, y la información queda repartida.", "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"],
  ["Todo depende de tu memoria", "Recordar qué paciente diabético toca controlar, y cuándo, no debería quedar a la suerte.", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2"],
  ["Sin respaldo si algo sale mal", "Ante un reclamo, lo que te protege es poder demostrar qué evaluaste y qué decidiste.", "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM12 9v4M12 16h.01"],
];

const COMPARACION: [string, string, string | null][] = [
  ["Clasificación de riesgo IWGDF", "No", "Sí, automática"],
  ["Sugerencia de derivación", "No", "Sí"],
  ["Mapa plantar, de uñas y modelo 3D del pie", "Varía", "Sí"],
  ["Auditoría de cada acción sobre la ficha", "Varía", "Sí"],
  ["Ficha clínica y agenda", "Sí", "Sí"],
  ["Recordatorios por WhatsApp", "Sí", null],
  ["Boleta o factura electrónica", "Sí", null],
];

const CUMPLIMIENTO: [string, "ok" | "dev" | "pend"][] = [
  ["Acceso solo para tu organización", "ok"],
  ["Registro de auditoría: quién, qué y cuándo", "ok"],
  ["Consentimiento del paciente antes de crear su ficha", "ok"],
  ["Conservación de la ficha por 15 años", "dev"],
  ["Ubicación de servidores y transferencia internacional", "pend"],
];
const ESTADOS = {
  ok: ["Disponible", "border-teal-200 bg-teal-50 text-teal-800"],
  dev: ["En desarrollo", "border-amber-200 bg-amber-50 text-amber-800"],
  pend: ["En revisión", "border-slate-200 bg-slate-100 text-slate-600"],
};

const PREGUNTAS = [
  ["¿PodoCare reemplaza mi criterio clínico?", "No. Calcula la categoría IWGDF y sugiere derivar ante una señal de alarma, pero la decisión clínica siempre es del profesional."],
  ["¿Sirve si atiendo a domicilio?", "Sí. PodoCare nació pensando en el podólogo que atiende solo y se traslada donde el paciente. Funciona desde el navegador."],
  ["¿Es obligatorio llevar ficha clínica en una atención corta?", "La Ley 20.584 la exige a todo prestador. Más allá de la norma, la ficha es tu respaldo si después hay un reclamo. Esto es información general, no asesoría legal."],
  ["¿Tiene recordatorios por WhatsApp o boleta electrónica?", "Todavía no. Primero estamos validando con nuestro piloto que la clasificación de riesgo cambia la forma de trabajar."],
  ["¿Qué pasa con mis fichas si dejo de usar PodoCare?", "La ley exige conservar la ficha al menos 15 años. Estamos definiendo la política de conservación y devolución de datos para que se cumpla aunque termines tu suscripción."],
];

const EQUIPO = [
  ["MC", "Marcelo Caballero", "Infraestructura y seguridad", "bg-teal-700 text-white"],
  ["MM", "Martín Maldonado", "Frontend y QA", "bg-slate-700 text-white"],
  ["EV", "Emily Vera", "Scrum Master y Product Owner", "bg-teal-100 text-teal-800"],
];

const MARQUESINA = ["Ficha clínica", "Mapa plantar", "Modelo 3D del pie", "Mapa de uñas", "Riesgo IWGDF", "Sugerencia de derivación", "Consentimiento", "Auditoría", "Agenda"];

function Titulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`${H2} mx-auto max-w-3xl text-center ${className}`}>{children}</h2>;
}

export default function Home() {
  return (
    <main className="relative flex-1 overflow-x-clip bg-[#FAFBFC] text-slate-900">
      <div aria-hidden="true" className="absolute -top-64 left-1/2 h-[900px] w-[min(1400px,160vw)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_30%_40%,rgba(153,246,228,.55)_0%,transparent_55%),radial-gradient(ellipse_at_75%_35%,rgba(165,243,252,.45)_0%,transparent_50%)]" />

      <div className="sticky top-3 z-20 mx-auto max-w-6xl px-4 pt-3 sm:px-8">
        <header className="flex items-center justify-between gap-4 rounded-full border border-slate-200 bg-white/80 py-2.5 pr-3 pl-4 shadow-[0_8px_30px_rgba(15,23,42,.06)] backdrop-blur-md">
          <Link href="#inicio" className="flex items-center gap-2.5"><Logo size={38} /><span className="text-sm font-semibold tracking-[0.2em]">PODOCARE</span></Link>
          <nav aria-label="Principal" className="hidden gap-6 text-[15px] font-medium text-slate-700 md:flex">
            {[["#producto", "Producto"], ["#riesgo", "Riesgo IWGDF"], ["#legal", "Ficha y ley"], ["#planes", "Planes"], ["#equipo", "Equipo"]].map(([href, texto]) => <a key={href} href={href} className="hover:text-teal-700">{texto}</a>)}
          </nav>
          <Link href="/login" className={`${BTN} h-11 bg-teal-700 text-white`}>Iniciar sesión</Link>
        </header>
      </div>

      <section id="inicio" className="relative mx-auto max-w-6xl px-4 pt-14 text-center sm:px-8 sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-teal-700 ring-4 ring-teal-100" />Piloto en curso con un podólogo independiente de la Región Metropolitana</span>
        <h1 className="mx-auto mt-7 max-w-4xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-7xl">Existe gestión de agenda.<br />Faltaba <span className={GRAD}>inteligencia clínica de riesgo.</span></h1>
        <p className={`${LEAD} mx-auto mt-6 max-w-2xl`}>PodoCare clasifica el riesgo de pie diabético de cada paciente con el estándar IWGDF y deja tu ficha clínica en orden, también cuando atiendes a domicilio.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/login" className={`${BTN} bg-teal-700 text-white`}>Iniciar sesión</Link>
          <a href="#producto" className={`${BTN} border border-slate-300 bg-white text-slate-900`}>Ver cómo funciona</a>
        </div>
        <VisorDemo />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:px-8 sm:pt-32">
        <Titulo>¿Qué pasa si un paciente de alto riesgo <span className={GRAD}>se te escapa entre una atención y otra?</span></Titulo>
        <p className={`${LEAD} mx-auto mt-5 max-w-2xl text-center`}>El problema de fondo no es el papeleo. Es no detectar a tiempo un pie en riesgo.</p>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {DOLORES.map(([titulo, texto, icono]) => (
            <div key={titulo} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={icono} /></svg></span>
              <h3 className="mt-5 mb-2 text-xl font-semibold tracking-tight">{titulo}</h3>
              <p className="leading-relaxed text-slate-600">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="producto" className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className={`${PANEL} px-5 py-12 sm:px-16 sm:py-20`}>
          <div aria-hidden="true" className="absolute -top-1/3 left-1/2 h-4/5 w-[120%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,.28)_0%,transparent_60%)]" />
          <div className="relative text-center">
            <h2 className={H2}>Evalúa, clasifica, decide y <span className={GRAD_OSCURO}>deja respaldo.</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">Un flujo clínico pensado para la atención real, en consulta o a domicilio.</p>
          </div>
          <div aria-hidden="true" className="relative mt-10 overflow-hidden mask-[linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
            <div className="flex w-max animate-marquesina gap-7 text-lg text-slate-300 italic motion-reduce:animate-none">
              {[...MARQUESINA, ...MARQUESINA].map((texto, i) => <span key={i}>{texto} ·</span>)}
            </div>
          </div>
          <ol className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map(([titulo, texto], i) => (
              <li key={titulo} className={`${VIDRIO} p-6`}>
                <span className="text-5xl font-semibold tracking-tight text-teal-300 tabular-nums">0{i + 1}</span>
                <h3 className="mt-4 mb-1.5 text-lg font-semibold">{titulo}</h3>
                <p className="text-[15px] leading-relaxed text-slate-300">{texto}</p>
              </li>
            ))}
          </ol>
          <div className="relative mt-16 flex flex-wrap items-end justify-between gap-4 sm:mt-24">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mide la evolución, no a ojo.</h3>
              <p className="mt-2.5 max-w-xl text-slate-300">Seguimiento por paciente y panorama de toda tu cartera, con los colores de la categoría IWGDF.</p>
            </div>
            <span className="rounded-full border border-white/20 px-3 py-1 text-sm text-slate-300">Datos ficticios</span>
          </div>
          <Graficos />
        </div>
      </section>

      <section id="riesgo" className="mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-32">
        <Titulo>La categoría sale del <span className={GRAD}>estándar internacional.</span></Titulo>
        <p className={`${LEAD} mx-auto mt-5 max-w-2xl text-center`}>IWGDF es el International Working Group on the Diabetic Foot. PodoCare aplica su sistema de estratificación de riesgo y te propone el intervalo de control de cada paciente.</p>
        <p className="mt-3.5 text-center"><a href="https://iwgdfguidelines.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 underline underline-offset-4">Ver guías en iwgdfguidelines.org<span className="sr-only"> (se abre en una pestaña nueva)</span></a></p>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIAS.map(({ nivel, borde, numero }) => {
            const grupo = GRUPOS_IWGDF[nivel];
            return (
              <li key={nivel} className={`flex flex-col rounded-3xl border border-t-4 border-slate-200 bg-white p-6 shadow-sm ${borde}`}>
                <span className={`text-6xl leading-none font-semibold tracking-tight ${numero}`}>{grupo.grupo}</span>
                <span className="mt-3.5 text-lg font-semibold">{grupo.nombre}</span>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-600">{grupo.define}</p>
                <p className="mt-4 border-t border-slate-200 pt-3.5 text-sm text-slate-700"><b className="font-semibold">Control:</b> {textoControlSugerido(nivel)}</p>
              </li>
            );
          })}
        </ol>
        <p className="mx-auto mt-7 max-w-3xl text-center text-xl font-medium tracking-tight sm:text-2xl">La derivación es una sugerencia del sistema. <span className={GRAD}>La decide el profesional.</span></p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-32">
        <Titulo>Otros te ordenan la agenda. <span className={GRAD}>PodoCare además cuida el pie en riesgo.</span></Titulo>
        <p className={`${LEAD} mx-auto mt-5 max-w-2xl text-center`}>Lo que hacemos distinto, y lo que todavía no hacemos.</p>
        <div className="mt-11 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
          <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
            <caption className="sr-only">Comparación entre un software de agenda genérico y PodoCare</caption>
            <thead><tr className="border-b border-slate-200"><th scope="col" className="p-4 font-medium text-slate-500">Funcionalidad</th><th scope="col" className="p-4 font-semibold">Software de agenda genérico</th><th scope="col" className="p-4 font-semibold text-teal-700">PodoCare</th></tr></thead>
            <tbody>
              {COMPARACION.map(([funcion, generico, podocare]) => (
                <tr key={funcion} className="border-b border-slate-200 last:border-0">
                  <th scope="row" className="p-4 font-medium">{funcion}</th>
                  <td className={`p-4 ${generico === "Sí" ? "" : "text-slate-500"}`}>{generico}</td>
                  <td className="p-4">{podocare ? <span className="font-semibold text-teal-800">{podocare}</span> : <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[13px] font-semibold text-slate-600">Todavía no</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="legal" className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-32">
        <div className="grid items-start gap-10 rounded-3xl border border-slate-200 bg-linear-to-b from-white to-teal-50 p-7 shadow-sm sm:p-16 lg:grid-cols-2">
          <div>
            <h2 className={H2}>La ficha clínica <span className={GRAD}>ya es obligatoria.</span></h2>
            <p className={`${LEAD} mt-4`}>La Ley 20.584 exige ficha clínica a todo prestador, también en una atención corta a domicilio. La Ley 21.719 trata los datos de salud como datos sensibles.</p>
            <p className={`${LEAD} mt-3.5`}>Un Excel no es ilegal por ser Excel, pero casi nunca tiene control de acceso, registro de auditoría ni respaldo seguro. PodoCare está diseñado para ayudarte a cumplir.</p>
            <p className="mt-5 text-sm text-slate-500">Información general, no constituye asesoría legal. Estamos validando estos puntos con asesoría profesional.</p>
          </div>
          <ul className="grid gap-2.5">
            {CUMPLIMIENTO.map(([punto, estado]) => (
              <li key={punto} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4.5 py-4">
                <span className="font-semibold">{punto}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[13px] font-semibold ${ESTADOS[estado][1]}`}>{ESTADOS[estado][0]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="planes" className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-32">
        <Titulo>Un plan para cada forma <span className={GRAD}>de atender.</span></Titulo>
        <p className={`${LEAD} mx-auto mt-5 max-w-2xl text-center`}>Para el podólogo que atiende solo o para equipos que comparten pacientes.</p>
        <div className="mx-auto mt-11 grid max-w-4xl gap-4 md:grid-cols-2">
          {PLANES.map((plan, i) => {
            const oscuro = i === 1;
            return (
              <div key={plan.id} className={`flex flex-col p-7 sm:p-10 ${oscuro ? PANEL : "rounded-3xl border border-slate-200 bg-white shadow-sm"}`}>
                {oscuro && <div aria-hidden="true" className="absolute -top-2/5 -right-1/3 h-[90%] w-[90%] bg-[radial-gradient(circle,rgba(20,184,166,.35)_0%,transparent_65%)]" />}
                <div className="relative flex flex-1 flex-col">
                  <p className={`font-semibold ${oscuro ? "text-teal-300" : "text-teal-700"}`}>Plan {plan.nombre}</p>
                  <p className={`mt-2 leading-relaxed ${oscuro ? "text-slate-300" : "text-slate-600"}`}>{plan.detalle}</p>
                  <p className="mt-6 flex-1 text-3xl font-semibold tracking-tight sm:text-4xl">{plan.precio}</p>
                  <Link href="/register" className={`${BTN} mt-7 ${oscuro ? "bg-white text-slate-900" : "border border-slate-300 bg-white text-slate-900"}`}>Crear cuenta</Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="simulador" className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-32">
        <Titulo>¿Cuántos controles necesita <span className={GRAD}>tu cartera?</span></Titulo>
        <p className={`${LEAD} mx-auto mt-5 max-w-2xl text-center`}>PodoCare calcula cada cuánto debe volver cada paciente según su categoría IWGDF. Ajusta tu cartera y mira el seguimiento que hoy depende de tu memoria.</p>
        <SimuladorCartera planReferencia={PLANES[0].precio} />
      </section>

      <section id="equipo" className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-32">
        <Titulo>Lo construimos <span className={GRAD}>junto a un podólogo real.</span></Titulo>
        <p className={`${LEAD} mx-auto mt-5 max-w-2xl text-center`}>PodoCare nace como proyecto Capstone en Duoc UC y se diseña con un podólogo independiente de la Región Metropolitana, involucrado desde los requerimientos.</p>
        <div className="mt-11 grid gap-4 md:grid-cols-3">
          {EQUIPO.map(([iniciales, nombre, rol, color]) => (
            <div key={nombre} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <span aria-hidden="true" className={`grid h-15 w-15 shrink-0 place-items-center rounded-full text-xl font-semibold ${color}`}>{iniciales}</span>
              <div><p className="text-[17px] font-semibold">{nombre}</p><p className="mt-0.5 text-sm text-slate-600">{rol}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section id="preguntas" className="mx-auto max-w-3xl px-4 pb-20 sm:px-8 sm:pb-32">
        <h2 className={`${H2} text-center`}>Preguntas frecuentes</h2>
        <div className="mt-9 grid gap-2.5">
          {PREGUNTAS.map(([pregunta, respuesta]) => (
            <details key={pregunta} className="group rounded-2xl border border-slate-200 bg-white px-6 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">{pregunta}<span aria-hidden="true" className="text-2xl font-normal text-teal-700 transition-transform group-open:rotate-45">+</span></summary>
              <p className="pb-5 leading-relaxed text-slate-600">{respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-8 sm:pb-20">
        <div className={`${PANEL} px-5 py-14 text-center sm:px-16 sm:py-24`}>
          <div aria-hidden="true" className="absolute -bottom-1/2 left-1/2 h-full w-[120%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,.32)_0%,transparent_60%)]" />
          <div className="relative">
            <h2 className={`${H2} mx-auto max-w-3xl`}>Que un pie en riesgo <span className={GRAD_OSCURO}>nunca dependa solo de tu memoria.</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">Accede al espacio clínico de tu consulta.</p>
            <Link href="/login" className={`${BTN} mt-8 bg-white text-slate-900`}>Iniciar sesión</Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-slate-200 px-4 pt-6 pb-10 text-sm text-slate-600 sm:px-8">
        <span className="flex items-center gap-2.5"><span className="font-semibold tracking-[0.2em] text-slate-900">PODOCARE</span>Proyecto Capstone · Duoc UC</span>
        <span>Datos ficticios en toda la página · Información legal general, no asesoría</span>
      </footer>
    </main>
  );
}
