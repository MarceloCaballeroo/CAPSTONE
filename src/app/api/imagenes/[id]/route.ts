import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_IMAGENES, MAX_BYTES_IMAGEN, esRutaImagenClinica, tipoContenidoImagen } from "@/lib/validations/imagenes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const fallo = (mensaje: string, status: number) => new Response(mensaje, { status, headers });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fallo("Imagen no encontrada.", 404);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fallo("Inicia sesión para abrir esta imagen.", 401);
    const { data: perfil, error: errorPerfil } = await supabase.from("usuario").select("activo").eq("id", user.id).maybeSingle();
    if (errorPerfil || !perfil?.activo) return fallo("No tienes acceso a esta imagen.", 403);
    const { data: imagen, error } = await supabase.from("imagen_clinica").select("atencion_id, url_storage").eq("id", id).maybeSingle();
    if (error) return fallo("No pudimos consultar la imagen. Inténtalo nuevamente.", 503);
    if (!imagen) return fallo("Imagen no encontrada.", 404);
    if (!esRutaImagenClinica(imagen.url_storage, imagen.atencion_id, id)) return fallo("Esta imagen no está disponible en el almacenamiento privado de consultas.", 404);
    const { data: archivo, error: errorArchivo } = await supabase.storage.from(BUCKET_IMAGENES).download(imagen.url_storage);
    if (errorArchivo || !archivo) return fallo("No pudimos abrir la imagen. Revisa el acceso al almacenamiento privado.", 503);
    if (archivo.size > MAX_BYTES_IMAGEN) return fallo("La imagen excede el tamaño permitido.", 422);
    const bytes = await archivo.arrayBuffer();
    const tipo = tipoContenidoImagen(new Uint8Array(bytes));
    if (!tipo) return fallo("El archivo no tiene un formato de imagen admitido.", 422);
    return new Response(bytes, { headers: {
      ...headers, "Content-Type": tipo, "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch { return fallo("No pudimos abrir la imagen. Inténtalo nuevamente.", 503); }
}
