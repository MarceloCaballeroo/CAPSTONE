export default function DashboardLoading() {
  return (
    <div className="grid min-h-[min(70vh,36rem)] place-items-center px-4" role="status" aria-label="Cargando vista">
      <div className="text-center">
        <span aria-hidden="true" className="mx-auto block h-9 w-9 rounded-full border-[3px] border-slate-200 border-t-teal-700 motion-reduce:animate-none animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-700">Preparando tu espacio clínico</p>
        <p className="mt-1 text-xs text-slate-500">Cargando la información</p>
      </div>
    </div>
  );
}