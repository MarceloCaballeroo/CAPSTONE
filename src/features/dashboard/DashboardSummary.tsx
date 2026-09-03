import { Card } from "@/components/common/Card";
import { Alert } from "@/components/common/Alert";
import { createClient } from "@/lib/supabase/server";

const estadosDerivacionAbierta = ["pendiente", "enviada", "aceptada"] as const;

function inicioDelDia(): string {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return inicio.toISOString();
}

function finDelDia(): string {
  const ahora = new Date();
  const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
  return fin.toISOString();
}

export async function DashboardSummary() {
  const supabase = await createClient();
  const desde = inicioDelDia();
  const hasta = finDelDia();

  const [pacientes, citas, derivaciones, alertas] = await Promise.all([
    supabase.from("paciente").select("id", { count: "exact", head: true }),
    supabase
      .from("cita")
      .select("id", { count: "exact", head: true })
      .gte("fecha_hora", desde)
      .lt("fecha_hora", hasta),
    supabase
      .from("derivacion")
      .select("id", { count: "exact", head: true })
      .in("estado", estadosDerivacionAbierta),
    supabase
      .from("atencion")
      .select("id, ficha_id, nivel_riesgo_iwgdf, requiere_derivacion, created_at")
      .or("nivel_riesgo_iwgdf.eq.alto,requiere_derivacion.eq.true")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const metrics = [
    ["Pacientes registrados", pacientes.count ?? 0],
    ["Citas de hoy", citas.count ?? 0],
    ["Derivaciones abiertas", derivaciones.count ?? 0],
  ] as const;
  const alertasData = alertas.data ?? [];
  const maxMetric = Math.max(...metrics.map(([, value]) => value), 1);
  const porcentajeSeguimiento = Math.min(alertasData.length * 20, 100);
  const fichas = alertasData.length
    ? await supabase.from("ficha_clinica").select("id, paciente_id").in("id", alertasData.map((atencion) => atencion.ficha_id))
    : { data: [], error: null };
  const pacientesAlerta = fichas.data?.length
    ? await supabase.from("paciente").select("id, nombre, apellido_paterno").in("id", fichas.data.map((ficha) => ficha.paciente_id))
    : { data: [], error: null };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">Actividad operativa</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Estado de la consulta</h2>
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Hoy</span>
          </div>
          <div className="mt-8 grid gap-5">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">{value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${label}: ${value}`}>
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all"
                    style={{ width: `${value === 0 ? 3 : (value / maxMetric) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-7 border-t border-slate-100 pt-4 text-sm text-slate-500">
            Las barras se actualizarán automáticamente a medida que registres actividad.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-red-700">Indicador clínico</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Seguimiento prioritario</h2>
          <div className="mt-7 flex items-center gap-6">
            <div
              className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
              style={{ background: porcentajeSeguimiento ? `conic-gradient(#dc2626 ${porcentajeSeguimiento}%, #f1f5f9 0)` : "#f1f5f9" }}
              role="img"
              aria-label={`${alertasData.length} seguimientos prioritarios`}
            >
              <div className="grid h-24 w-24 place-items-center rounded-full bg-white">
                <span className="text-3xl font-semibold text-slate-900">{alertasData.length}</span>
              </div>
            </div>
            <div>
              <p className="font-medium text-slate-900">Casos para revisar</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {alertasData.length ? "Revisa estos casos antes de iniciar procedimientos." : "No hay casos registrados todavía."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-700">Seguimiento prioritario</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Riesgo clínico y derivaciones</h2>
          </div>
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
            {alertasData.length}
          </span>
        </div>

        {alertas.error ? (
          <Alert>
            No fue posible consultar el seguimiento clínico. Solicita al administrador verificar los permisos de la tabla de atenciones.
          </Alert>
        ) : alertasData.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No hay pacientes que requieran seguimiento prioritario.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-200">
            {alertasData.map((atencion) => {
              const ficha = fichas.data?.find((item) => item.id === atencion.ficha_id);
              const pacienteDatos = pacientesAlerta.data?.find((item) => item.id === ficha?.paciente_id);
              const nombre = pacienteDatos ? `${pacienteDatos.nombre} ${pacienteDatos.apellido_paterno}` : "Paciente sin nombre";
              const descripcion = atencion.nivel_riesgo_iwgdf === "alto" ? "Riesgo IWGDF alto" : "Derivación requerida";

              return (
                <li key={atencion.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-900">{nombre}</p>
                    <p className="text-sm text-red-700">{descripcion}</p>
                  </div>
                  <span className="text-xs text-slate-500">Atención reciente</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}