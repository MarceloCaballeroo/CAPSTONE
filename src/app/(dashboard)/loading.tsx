export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" role="status" aria-label="Cargando vista">
      <span className="sr-only">Cargando...</span>
      <div className="h-10 w-1/3 rounded bg-slate-200" />
      <div className="h-32 rounded-xl bg-white" />
      <div className="h-64 rounded-xl bg-white" />
    </div>
  );
}