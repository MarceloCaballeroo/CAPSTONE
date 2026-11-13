"use client";

import { useActionState, useRef, useState } from "react";
import { adjuntarImagenAction } from "@/app/actions/imagenes";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { TIPOS_IMAGEN, validarArchivoImagen, type EstadoImagen } from "@/lib/validations/imagenes";

export function ImagenAtencionForm({ pacienteId, atencionId: fija, atenciones = [] }: {
  pacienteId: string; atencionId?: string; atenciones?: { id: string; fecha: string }[];
}) {
  const archivoRef = useRef<HTMLInputElement>(null);
  const [seleccion, setSeleccion] = useState(atenciones[0]?.id ?? "");
  const atencionId = fija ?? seleccion;
  const [imagenId, setImagenId] = useState("");
  const [enviadaId, setEnviadaId] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(async (prev: EstadoImagen, datos: FormData) => {
    // React restablece inputs no controlados tras un envío; el archivo se conserva para reintentar.
    const archivo = archivoRef.current?.files?.[0];
    if (!archivo) return { error: "Selecciona una imagen." };
    setEnviadaId(String(datos.get("imagenId")));
    datos.set("imagen", archivo);
    try { return await adjuntarImagenAction(prev, datos); }
    catch { return { error: "No pudimos completar la carga. Inténtalo nuevamente." }; }
  }, {} as EstadoImagen);
  const cargada = Boolean(imagenId && state.imagenId === imagenId);

  return (
    <section className="mt-6 grid gap-4 border-t border-slate-200 pt-6">
      <div>
        <h2 className="font-semibold text-slate-900">Imágenes de la consulta</h2>
        <p className="mt-1 text-sm text-slate-500">Adjunta una foto a la vez. Puedes agregar varias y reintentar una carga sin volver a registrar la atención.</p>
      </div>
      {!fija && <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Atención a la que corresponde
        <select value={seleccion} disabled={isPending} className="h-11 rounded-lg border border-slate-300 bg-transparent px-3"
          onChange={(event) => {
            setSeleccion(event.target.value); setImagenId(""); setEtiqueta(""); setErrorArchivo(null);
            if (archivoRef.current) archivoRef.current.value = "";
          }}>
          {atenciones.map((atencion) => <option key={atencion.id} value={atencion.id}>{atencion.fecha}</option>)}
        </select>
      </label>}
      <Input ref={archivoRef} id={`imagen-${atencionId}`} type="file" accept={TIPOS_IMAGEN.join(",")}
        label="Foto o imagen" hint="JPG, PNG o WebP. Máximo 2 MB por imagen." error={errorArchivo ?? undefined}
        disabled={isPending} onChange={(event) => {
          const archivo = event.target.files?.[0];
          setErrorArchivo(archivo ? validarArchivoImagen(archivo) : null);
          setImagenId(archivo ? crypto.randomUUID() : "");
          setEtiqueta("");
        }} />
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="pacienteId" value={pacienteId} />
        <input type="hidden" name="atencionId" value={atencionId} />
        <input type="hidden" name="imagenId" value={imagenId} />
        <Input id={`etiqueta-${atencionId}`} name="etiqueta" label="Descripción (opcional)" maxLength={120} value={etiqueta}
          onChange={(event) => setEtiqueta(event.target.value)} disabled={isPending || cargada} />
        {state.error && enviadaId === imagenId && <Alert>{state.error}</Alert>}
        {cargada && <Alert variant="success">{state.mensaje}</Alert>}
        <div><Button type="submit" isLoading={isPending} disabled={!atencionId || !imagenId || Boolean(errorArchivo) || cargada}>
          {isPending ? "Subiendo imagen" : cargada ? "Imagen adjunta" : "Adjuntar imagen"}
        </Button></div>
      </form>
      {cargada && <a className="text-sm font-medium text-teal-700 underline" href={`/api/imagenes/${state.imagenId}`} target="_blank" rel="noreferrer">Abrir imagen adjunta</a>}
    </section>
  );
}
