import Link from "next/link";
import { redirect } from "next/navigation";
import { cerrarTodasLasSesionesAction } from "@/app/actions/configuracion";
import { Alert } from "@/components/common/Alert";
import { Card } from "@/components/common/Card";
import { DosPasos } from "@/features/configuracion/DosPasos";
import { InvitarForm, MiembroControles, OrganizacionForm, PasswordForm, PerfilForm } from "@/features/configuracion/Formularios";
import { fechaCortaChile, zonaHorariaAgenda } from "@/lib/agenda";
import { createClient } from "@/lib/supabase/server";

const secciones = [
  { clave: "perfil", nombre: "Mi perfil", detalle: "Nombre y correo", admin: false },
  { clave: "seguridad", nombre: "Seguridad", detalle: "Contraseña y sesiones", admin: false },
  { clave: "organizacion", nombre: "Organización y plan", detalle: "Nombre y suscripción", admin: true },
  { clave: "equipo", nombre: "Equipo", detalle: "Profesionales y roles", admin: true },
  { clave: "agenda", nombre: "Agenda", detalle: "Horario y duración", admin: true },
  { clave: "actividad", nombre: "Registro de actividad", detalle: "Auditoría clínica", admin: true },
] as const;
type Seccion = (typeof secciones)[number]["clave"];

const nombreRol = (rol: string | null | undefined) => rol === "admin" ? "Administrador" : "Clínico";

const objetoAuditado: Record<string, string> = {
  paciente: "un paciente", ficha_clinica: "una ficha clínica", atencion: "una atención", derivacion: "una derivación", cita: "una cita",
  imagen_clinica: "una imagen clínica", hallazgo_clinico: "un hallazgo clínico", usuario: "una cuenta de usuario", organizacion: "los datos de la organización",
};
const accionAuditada: Record<string, { verbo: string; etiqueta: string; estilo: string }> = {
  INSERT: { verbo: "creó", etiqueta: "Creó", estilo: "bg-emerald-50 text-emerald-800" },
  UPDATE: { verbo: "editó", etiqueta: "Editó", estilo: "bg-sky-50 text-sky-900" },
  DELETE: { verbo: "eliminó", etiqueta: "Eliminó", estilo: "bg-red-50 text-red-800" },
};

type Fila = Record<string, unknown> | undefined;
function detalleAuditoria(tabla: string, detalle: { datos_nuevos?: Fila; datos_anteriores?: Fila } | null): string {
  const fila = detalle?.datos_nuevos ?? detalle?.datos_anteriores;
  if (!fila) return "";
  if (tabla === "paciente" || tabla === "usuario") return [fila.nombre, fila.apellido_paterno].filter(Boolean).join(" ");
  if (tabla === "cita" && detalle?.datos_anteriores?.estado !== detalle?.datos_nuevos?.estado && detalle?.datos_anteriores && detalle?.datos_nuevos) return `Estado: ${detalle.datos_anteriores.estado} → ${detalle.datos_nuevos.estado}`;
  if (tabla === "organizacion") return String(fila.nombre ?? "");
  return "";
}

const fechaHora = new Intl.DateTimeFormat("es-CL", { timeZone: zonaHorariaAgenda, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  const parametros = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuario")
    .select("nombre, rol, activo, created_at, organizacion:organizacion_id(nombre, plan_tipo, estado_suscripcion, jornada_inicio, jornada_fin, duracion_cita_min, dias_atencion)")
    .eq("id", user.id).maybeSingle();
  const organizacion = perfil?.organizacion as unknown as { nombre: string; plan_tipo: string; estado_suscripcion: string | null; jornada_inicio: number; jornada_fin: number; duracion_cita_min: number; dias_atencion: number[] } | null;
  const esAdmin = perfil?.rol === "admin" && perfil.activo;
  const visibles = secciones.filter((seccion) => !seccion.admin || esAdmin);
  const seccion: Seccion = visibles.some((item) => item.clave === parametros.seccion) ? parametros.seccion as Seccion : "perfil";
  const nombreUsuario = perfil?.nombre || user.email || "Usuario";
  const iniciales = nombreUsuario.split(/\s+/).filter(Boolean).slice(0, 2).map((parte: string) => parte[0]).join("").toUpperCase();
  const datosOrganizacion = organizacion && {
    nombre: organizacion.nombre, jornadaInicio: organizacion.jornada_inicio, jornadaFin: organizacion.jornada_fin,
    duracion: organizacion.duracion_cita_min, dias: organizacion.dias_atencion,
  };

  const miembros = seccion === "equipo" ? await supabase.rpc("miembros_organizacion") : null;
  const actividad = seccion === "actividad"
    ? await supabase.from("log_auditoria").select("id, usuario_id, tabla_afectada, accion, detalle, fecha").order("fecha", { ascending: false }).limit(40)
    : null;
  const autoresIds = [...new Set((actividad?.data ?? []).map((registro) => registro.usuario_id).filter(Boolean))];
  const { data: autores } = autoresIds.length ? await supabase.from("usuario").select("id, nombre").in("id", autoresIds) : { data: [] };
  const autorPorId = new Map((autores ?? []).map((autor) => [autor.id, autor.nombre]));

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-medium text-teal-700">Ajustes</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Configuración</h1>
        <p className="mt-2 text-base text-slate-600">Tu cuenta{organizacion ? ` y los ajustes de ${organizacion.nombre}` : ""}.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Secciones de configuración" className="grid gap-1">
          {visibles.map((item, indice) => (
            <div key={item.clave}>
              {(indice === 0 || item.admin !== visibles[indice - 1].admin) && (
                <p className={`px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${indice > 0 ? "pt-4" : ""}`}>{item.admin ? "Organización · administradores" : "Tu cuenta"}</p>
              )}
              <Link href={`/configuracion?seccion=${item.clave}`} aria-current={item.clave === seccion ? "page" : undefined}
                className={`flex min-h-12 flex-col justify-center rounded-lg border px-3 py-1.5 text-[15px] ${item.clave === seccion ? "border-slate-200 bg-white font-semibold text-teal-700 shadow-sm" : "border-transparent font-medium text-slate-700 hover:bg-white"}`}>
                {item.nombre}
                <span className="text-xs font-normal text-slate-500">{item.detalle}</span>
              </Link>
            </div>
          ))}
        </nav>

        <div className="grid min-w-0 gap-4">
          {seccion === "perfil" && (
            <Card className="grid gap-5">
              <div><h2 className="text-xl font-semibold text-slate-900">Mi perfil</h2><p className="mt-1 text-sm text-slate-500">Así te ven tus colegas en la agenda y en el registro de atenciones.</p></div>
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full bg-teal-50 text-xl font-semibold text-teal-800 ring-4 ring-teal-100">{iniciales}</span>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{nombreUsuario}</p>
                  <p className="mt-1 text-sm text-slate-500">{nombreRol(perfil?.rol)} · en PodoCare desde {perfil?.created_at ? fechaCortaChile(perfil.created_at) : "—"}</p>
                </div>
              </div>
              <PerfilForm nombre={perfil?.nombre ?? ""} email={user.email ?? ""} />
            </Card>
          )}

          {seccion === "seguridad" && (
            <>
              <Card className="grid gap-4">
                <div><h2 className="text-xl font-semibold text-slate-900">Cambiar contraseña</h2><p className="mt-1 text-sm text-slate-500">Usa una contraseña que no uses en otros sitios: protege datos de salud de tus pacientes.</p></div>
                <PasswordForm />
              </Card>
              <Card><DosPasos /></Card>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-xl"><h2 className="text-lg font-semibold text-slate-900">Sesiones abiertas</h2><p className="mt-1 text-sm leading-6 text-slate-500">Si usaste PodoCare en un computador compartido o perdiste un dispositivo, cierra la sesión en todos ellos.</p></div>
                <form action={cerrarTodasLasSesionesAction}>
                  <button type="submit" className="min-h-11 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 hover:border-red-400">Cerrar sesión en todos los dispositivos</button>
                </form>
              </Card>
            </>
          )}

          {seccion === "organizacion" && datosOrganizacion && organizacion && (
            <>
              <Card className="grid gap-5">
                <div><h2 className="text-xl font-semibold text-slate-900">Datos de la organización</h2><p className="mt-1 text-sm text-slate-500">Aparecen en la barra superior y en las fichas impresas.</p></div>
                <OrganizacionForm datos={datosOrganizacion} seccion="datos" />
              </Card>
              <Card className="grid gap-4">
                <h2 className="text-lg font-semibold text-slate-900">Plan y suscripción</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {[["clinica", "Plan clínica", "Varios profesionales, roles y agenda compartida."], ["individual", "Plan individual", "Un profesional. No permite agregar usuarios."]].map(([clave, nombre, descripcion]) => (
                    <li key={clave} className={`grid gap-1 rounded-lg p-4 ${organizacion.plan_tipo === clave ? "border-2 border-teal-700 bg-teal-50" : "border border-slate-200"}`}>
                      <span className="flex items-center justify-between font-semibold text-slate-900">{nombre}{organizacion.plan_tipo === clave && <span className="rounded-full bg-teal-700 px-2 py-0.5 text-xs text-white">Actual</span>}</span>
                      <span className="text-sm text-slate-600">{descripcion}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-slate-700">Suscripción: <b>{organizacion.estado_suscripcion ?? "sin información"}</b></p>
              </Card>
            </>
          )}

          {seccion === "equipo" && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900">Equipo</h2>
                <p className="mt-1 text-sm text-slate-500">Los administradores gestionan la organización; los clínicos atienden y registran.</p>
              </div>
              {miembros?.error ? <div className="p-6"><Alert>No pudimos cargar el equipo.</Alert></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr><th className="px-6 py-3 font-semibold">Profesional</th><th className="px-4 py-3 font-semibold">Rol y acceso</th><th className="px-6 py-3 font-semibold">Desde</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(miembros?.data ?? []).map((miembro: { id: string; nombre: string; rol: string; activo: boolean; created_at: string; correo: string }) => (
                        <tr key={miembro.id}>
                          <td className="px-6 py-3.5">
                            <p className="font-semibold text-slate-900">{miembro.nombre}{miembro.id === user.id && <span className="ml-2 text-xs font-normal text-slate-500">(tú)</span>}</p>
                            <p className="text-xs text-slate-500">{miembro.correo}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            {miembro.id === user.id ? <span className="text-slate-600">{nombreRol(miembro.rol)} · Activo</span> : <MiembroControles usuarioId={miembro.id} nombre={miembro.nombre} rol={miembro.rol} activo={miembro.activo} />}
                          </td>
                          <td className="px-6 py-3.5 text-slate-600">{fechaCortaChile(miembro.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="bg-slate-50 px-6 py-3 text-sm text-slate-500">Desactivar a alguien le quita el acceso de inmediato; sus atenciones quedan en el historial. No puedes cambiar tu propio rol.</p>
              <div className="grid gap-3 border-t border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900">Invitar profesional</h3>
                {organizacion?.plan_tipo === "clinica" ? <InvitarForm /> : <p className="text-sm text-slate-500">El plan individual no permite agregar profesionales.</p>}
              </div>
            </Card>
          )}

          {seccion === "agenda" && datosOrganizacion && (
            <Card className="grid gap-5">
              <div><h2 className="text-xl font-semibold text-slate-900">Agenda</h2><p className="mt-1 text-sm text-slate-500">Se usan al mostrar la semana y al crear citas, para todo el equipo.</p></div>
              <OrganizacionForm datos={datosOrganizacion} seccion="agenda" />
            </Card>
          )}

          {seccion === "actividad" && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900">Registro de actividad</h2>
                <p className="mt-1 text-sm text-slate-500">Últimos 40 cambios en información clínica y cuentas. Este registro no se puede editar ni borrar (Ley N.º 19.628).</p>
              </div>
              {actividad?.error ? <div className="p-6"><Alert>No pudimos cargar el registro de actividad.</Alert></div>
                : !actividad?.data?.length ? <p className="p-6 text-sm text-slate-500">Todavía no hay actividad registrada.</p> : (
                  <ul className="divide-y divide-slate-100">
                    {actividad.data.map((registro) => {
                      const accion = accionAuditada[registro.accion] ?? accionAuditada.UPDATE;
                      const detalle = detalleAuditoria(registro.tabla_afectada, registro.detalle);
                      return (
                        <li key={registro.id} className="flex items-center gap-4 px-6 py-3.5">
                          <span className={`min-w-16 shrink-0 rounded-md px-2 py-1 text-center text-xs font-semibold ${accion.estilo}`}>{accion.etiqueta}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-800"><b className="font-semibold">{autorPorId.get(registro.usuario_id) ?? "Sistema"}</b> {accion.verbo} {objetoAuditado[registro.tabla_afectada] ?? registro.tabla_afectada}</p>
                            {detalle && <p className="truncate text-xs text-slate-500">{detalle}</p>}
                          </div>
                          <span className="shrink-0 font-mono text-xs text-slate-500">{fechaHora.format(new Date(registro.fecha))}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
