import Link from "next/link";
import { Button } from "@/components/common/Button";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-teal-300">PODOCARE</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">Gestión clínica clara para cuidar mejor.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Centraliza fichas, citas y seguimiento clínico en un espacio diseñado para consultas de podología.</p>
          <Link className="mt-8 inline-block" href="/login"><Button>Ingresar al sistema</Button></Link>
        </div>
        <div className="border-l border-teal-400/40 pl-8 text-slate-300">
          <p className="text-7xl font-semibold text-teal-300">01</p>
          <p className="mt-4 max-w-xs text-xl">Información clínica disponible cuando importa.</p>
        </div>
      </div>
    </main>
  );
}
