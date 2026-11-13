import { z } from "zod";

export const BUCKET_IMAGENES = "imagenes-clinicas";
export const MAX_BYTES_IMAGEN = 2 * 1024 * 1024;
export const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const;

export const imagenClinicaSchema = z.object({
  pacienteId: z.uuid(),
  atencionId: z.uuid(),
  imagenId: z.uuid(),
  etiqueta: z.string().trim().max(120, "La descripción admite hasta 120 caracteres."),
});

export type EstadoImagen = { error?: string; imagenId?: string; mensaje?: string };

export function validarArchivoImagen(archivo: File): string | null {
  if (!archivo.size) return "Selecciona una imagen.";
  if (archivo.size > MAX_BYTES_IMAGEN) return "La imagen debe pesar como máximo 2 MB.";
  if (!(TIPOS_IMAGEN as readonly string[]).includes(archivo.type)) return "Selecciona una imagen JPG, PNG o WebP.";
  return null;
}

// Se comprueba la firma del contenido, no solo el nombre o MIME enviado por el navegador.
export function tipoContenidoImagen(bytes: Uint8Array): typeof TIPOS_IMAGEN[number] | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function esRutaImagenClinica(ruta: string, atencionId: string, imagenId: string): boolean {
  return ruta.startsWith(`${atencionId}/${imagenId}-`)
    && /^[0-9a-f-]{36}\/[0-9a-f-]{36}-[0-9a-f]{64}\.(jpg|png|webp)$/.test(ruta);
}
