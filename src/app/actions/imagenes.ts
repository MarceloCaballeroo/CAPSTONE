"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_IMAGENES, imagenClinicaSchema, tipoContenidoImagen, validarArchivoImagen, type EstadoImagen } from "@/lib/validations/imagenes";

export async function adjuntarImagenAction(_prev: EstadoImagen, formData: FormData): Promise<EstadoImagen> {
  const parsed = imagenClinicaSchema.safeParse({
    pacienteId: formData.get("pacienteId"), atencionId: formData.get("atencionId"),
    imagenId: formData.get("imagenId"), etiqueta: formData.get("etiqueta") ?? "",
  });
  if (!parsed.success) return { error: "Revisa la atención y la descripción de la imagen." };
  const archivo = formData.get("imagen");
  if (!(archivo instanceof File)) return { error: "Selecciona una imagen." };
  const errorArchivo = validarArchivoImagen(archivo);
  if (errorArchivo) return { error: errorArchivo };

  try {
    const supabase = await createClient();
    const { data: { user }, error: errorSesion } = await supabase.auth.getUser();
    if (errorSesion || !user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

    const { data: perfil, error: errorPerfil } = await supabase.from("usuario").select("activo").eq("id", user.id).maybeSingle();
    if (errorPerfil || !perfil?.activo) return { error: "No tienes acceso para adjuntar imágenes." };
    const { data: atencion, error: errorAtencion } = await supabase.from("atencion")
      .select("id, ficha_clinica!inner(paciente_id)").eq("id", parsed.data.atencionId)
      .eq("usuario_id", user.id).eq("ficha_clinica.paciente_id", parsed.data.pacienteId).maybeSingle();
    if (errorAtencion || !atencion) return { error: "Solo puedes adjuntar imágenes a tus atenciones de este paciente." };

    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const tipo = tipoContenidoImagen(bytes);
    if (!tipo || tipo !== archivo.type) return { error: "El contenido del archivo no corresponde a una imagen JPG, PNG o WebP válida." };
    const extension = tipo === "image/jpeg" ? "jpg" : tipo === "image/png" ? "png" : "webp";
    const hash = createHash("sha256").update(bytes).digest("hex");
    const ruta = `${atencion.id}/${parsed.data.imagenId}-${hash}.${extension}`;
    const leerRegistro = () => supabase.from("imagen_clinica").select("id, url_storage, atencion_id")
      .eq("id", parsed.data.imagenId).maybeSingle();
    const { data: existente, error: errorExistente } = await leerRegistro();
    if (errorExistente) return { error: "No pudimos comprobar las imágenes de la atención. Inténtalo nuevamente." };
    if (existente) {
      return existente.url_storage === ruta && existente.atencion_id === atencion.id
        ? { imagenId: existente.id, mensaje: "Esta imagen ya quedó adjunta a la consulta." }
        : { error: "La selección cambió. Vuelve a seleccionar la imagen." };
    }

    const storage = supabase.storage.from(BUCKET_IMAGENES);
    const { error: errorCarga } = await storage.upload(ruta, bytes, { contentType: tipo, upsert: false, cacheControl: "0" });
    if (errorCarga) {
      // Un reintento puede encontrar el archivo de una carga anterior cuya respuesta se perdió.
      const { data: guardada, error: errorLectura } = await storage.download(ruta);
      if (errorLectura || !guardada || guardada.size !== bytes.length
        || createHash("sha256").update(new Uint8Array(await guardada.arrayBuffer())).digest("hex") !== hash) {
        return { error: "No pudimos subir la imagen. Reintenta; si persiste, solicita revisar el almacenamiento privado y sus permisos. La atención sigue guardada." };
      }
    }

    const { error: errorRegistro } = await supabase.from("imagen_clinica").insert({
      id: parsed.data.imagenId, atencion_id: atencion.id, url_storage: ruta,
      etiqueta: parsed.data.etiqueta || "Imagen clínica",
    });
    if (errorRegistro) {
      const { data: confirmada, error: errorConfirmacion } = await leerRegistro();
      if (errorConfirmacion || confirmada?.url_storage !== ruta || confirmada?.atencion_id !== atencion.id) {
        // ponytail: un fallo persistente puede dejar un objeto privado sin fila. Se conserva para
        // reintentar sin borrar una carga concurrente; a mayor volumen, agregar conciliación de huérfanos.
        return { error: "El archivo se subió, pero no pudimos asociarlo a la consulta. Reintenta sin cambiar la selección; la atención sigue guardada." };
      }
    }
    revalidatePath(`/patients/${parsed.data.pacienteId}`);
    return { imagenId: parsed.data.imagenId, mensaje: "Imagen adjunta a la consulta." };
  } catch {
    return { error: "Se interrumpió la carga. Reintenta con la misma imagen; la atención sigue guardada." };
  }
}
