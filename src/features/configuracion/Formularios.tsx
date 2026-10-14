"use client";

import { useActionState, useState } from "react";
import { actualizarMiembroAction, actualizarOrganizacionAction, actualizarPerfilAction, cambiarPasswordAction, invitarProfesionalAction } from "@/app/actions/configuracion";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import type { FormState } from "@/lib/types/auth";

const estadoInicial: FormState = {};
const claseSelect = "h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

function Resultado({ state }: { state: FormState }) {
  if (state.error) return <Alert>{state.error}</Alert>;
  if (state.success && state.mensaje) return <Alert variant="success">{state.mensaje}</Alert>;
  return null;
}

export function PerfilForm({ nombre, email }: { nombre: string; email: string }) {
  const [state, formAction, isPending] = useActionState(actualizarPerfilAction, estadoInicial);
  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input id="nombre" name="nombre" label="Nombre completo" defaultValue={nombre} required autoComplete="name" />
        <Input id="email" name="email" type="email" label="Correo electrónico" defaultValue={email} required autoComplete="email" hint="Si lo cambias, te enviaremos un enlace para confirmarlo." />
      </div>
      <Resultado state={state} />
      <div className="flex justify-end border-t border-slate-100 pt-4"><Button type="submit" isLoading={isPending}>Guardar cambios</Button></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(cambiarPasswordAction, estadoInicial);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const requisitos = [
    { texto: "Al menos 8 caracteres", ok: password.length >= 8 },
    { texto: "Ambas contraseñas coinciden", ok: password.length > 0 && password === confirmar },
  ];
  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input id="password" name="password" type="password" label="Nueva contraseña" autoComplete="new-password" required value={password} onChange={(evento) => setPassword(evento.target.value)} />
        <Input id="confirmarPassword" name="confirmarPassword" type="password" label="Repetir contraseña" autoComplete="new-password" required value={confirmar} onChange={(evento) => setConfirmar(evento.target.value)} />
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {requisitos.map((requisito) => (
          <li key={requisito.texto} className={requisito.ok ? "text-emerald-800" : "text-slate-500"}>{requisito.ok ? "✓" : "○"} {requisito.texto}</li>
        ))}
      </ul>
      <Resultado state={state} />
      <div className="flex justify-end"><Button type="submit" isLoading={isPending}>Actualizar contraseña</Button></div>
    </form>
  );
}

export type DatosOrganizacion = { nombre: string; jornadaInicio: number; jornadaFin: number; duracion: number; dias: number[] };

const nombresDias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const horas = Array.from({ length: 25 }, (_, hora) => hora);
const duraciones = [15, 20, 30, 40, 45, 60, 90];

// Una sola RPC guarda nombre y agenda: cada sección envía sus campos visibles y el resto oculto.
export function OrganizacionForm({ datos, seccion }: { datos: DatosOrganizacion; seccion: "datos" | "agenda" }) {
  const [state, formAction, isPending] = useActionState(actualizarOrganizacionAction, estadoInicial);
  return (
    <form action={formAction} className="grid gap-5">
      {seccion === "datos" ? (
        <>
          <div className="max-w-lg"><Input id="nombreOrganizacion" name="nombre" label="Nombre de la consulta o centro" defaultValue={datos.nombre} required /></div>
          <input type="hidden" name="jornadaInicio" value={datos.jornadaInicio} />
          <input type="hidden" name="jornadaFin" value={datos.jornadaFin} />
          <input type="hidden" name="duracion" value={datos.duracion} />
          {datos.dias.map((dia) => <input key={dia} type="hidden" name="dias" value={dia} />)}
        </>
      ) : (
        <>
          <input type="hidden" name="nombre" value={datos.nombre} />
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Inicio de la jornada
              <select name="jornadaInicio" defaultValue={datos.jornadaInicio} className={claseSelect}>{horas.slice(0, 24).map((hora) => <option key={hora} value={hora}>{String(hora).padStart(2, "0")}:00</option>)}</select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Fin de la jornada
              <select name="jornadaFin" defaultValue={datos.jornadaFin} className={claseSelect}>{horas.slice(1).map((hora) => <option key={hora} value={hora}>{String(hora).padStart(2, "0")}:00</option>)}</select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Duración de cada cita
              <select name="duracion" defaultValue={datos.duracion} className={claseSelect}>{[...new Set([...duraciones, datos.duracion])].sort((a, b) => a - b).map((minutos) => <option key={minutos} value={minutos}>{minutos} minutos</option>)}</select>
            </label>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium text-slate-700">Días de atención</legend>
            <div className="flex flex-wrap gap-2">
              {nombresDias.map((nombre, indice) => (
                <label key={nombre} className="cursor-pointer">
                  <input type="checkbox" name="dias" value={indice + 1} defaultChecked={datos.dias.includes(indice + 1)} className="peer sr-only" />
                  <span className="flex min-h-11 min-w-14 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-500 peer-checked:border-2 peer-checked:border-teal-700 peer-checked:bg-teal-50 peer-checked:text-teal-800 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-300">{nombre}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
      <Resultado state={state} />
      <div className="flex justify-end border-t border-slate-100 pt-4"><Button type="submit" isLoading={isPending}>Guardar cambios</Button></div>
    </form>
  );
}

export function MiembroControles({ usuarioId, nombre, rol, activo }: { usuarioId: string; nombre: string; rol: string; activo: boolean }) {
  const [state, formAction, isPending] = useActionState(actualizarMiembroAction, estadoInicial);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <label className="sr-only" htmlFor={`rol-${usuarioId}`}>Rol de {nombre}</label>
      <select id={`rol-${usuarioId}`} name="rol" defaultValue={rol} disabled={isPending} onChange={(evento) => evento.currentTarget.form?.requestSubmit()} className={`${claseSelect} h-10 text-sm`}>
        <option value="admin">Administrador</option>
        <option value="clinico">Clínico</option>
      </select>
      <button type="submit" name="activo" value={activo ? "false" : "true"} disabled={isPending} aria-pressed={activo}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-sm font-semibold disabled:opacity-60 ${activo ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
        <span aria-hidden="true" className={`h-6 w-6 rounded-full ${activo ? "bg-emerald-600" : "bg-slate-300"}`} />
        {activo ? "Activo" : "Desactivado"}
        <span className="sr-only">{activo ? `: desactivar a ${nombre}` : `: activar a ${nombre}`}</span>
      </button>
      {state.error && <p role="alert" className="w-full text-sm text-red-700">{state.error}</p>}
    </form>
  );
}

export function InvitarForm() {
  const [state, formAction, isPending] = useActionState(invitarProfesionalAction, estadoInicial);
  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px]">
        <Input id="invitadoNombre" name="nombre" label="Nombre" required autoComplete="off" />
        <Input id="invitadoEmail" name="email" type="email" label="Correo" required autoComplete="off" />
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Rol
          <select name="rol" defaultValue="clinico" className={claseSelect}>
            <option value="clinico">Clínico</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
      </div>
      <Resultado state={state} />
      <div className="flex justify-end"><Button type="submit" isLoading={isPending}>Enviar invitación</Button></div>
    </form>
  );
}
