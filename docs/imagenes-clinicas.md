# Imágenes de las consultas

La aplicación permite guardar una atención y luego adjuntar imágenes opcionales, una por envío. También permite continuar desde **Ficha del paciente → Imágenes clínicas → Adjuntar imágenes a una consulta**, seleccionando una atención del profesional autenticado.

Se reutiliza `public.imagen_clinica`. No hay columnas nuevas ni cambios en la evaluación clínica. El flujo guarda una ruta relativa en `url_storage`, no una URL pública. La lectura pasa por `/api/imagenes/[id]`: verifica sesión, usuario activo, RLS y permisos de Storage. Las respuestas llevan `Cache-Control: private, no-store` y no utilizan el optimizador de imágenes ni enlaces firmados reutilizables fuera de la sesión.

## Configuración aplicada en Supabase

**Aplicada y verificada parcialmente el 13 de noviembre de 2026** en `ulneqosqaiaknbrjyuzg`, con autorización del responsable. El bucket privado y los permisos de inserción ya están habilitados. Hay una limitación confirmada de revocación inmediata en la caché de Storage; consultar [reporte de pruebas](imagenes-clinicas-reporte.md). El usuario confirmó que la carga funciona desde la interfaz local; no se verificaron todos los escenarios manuales.

Migraciones registradas en Supabase:
- `20261113035916_habilitar_storage_imagenes_clinicas_privadas`: creación del bucket y siete políticas de Storage.
- `20261113040127_habilitar_registro_imagenes_solo_autor`: INSERT sobre cuatro columnas y política restrictiva del autor, reproducida en `scripts/supabase-imagenes-clinicas-registro.sql`.

Los pasos siguientes sirven para otro entorno. **No volver a ejecutar estos scripts en el proyecto ya configurado.**

1. Revisar en modo de solo lectura el bucket y sus políticas:

   ```sql
   select id, public, file_size_limit, allowed_mime_types
   from storage.buckets where id = 'imagenes-clinicas';

   select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
   from pg_policies
   where (schemaname = 'storage' and tablename = 'objects')
      or (schemaname = 'public' and tablename = 'imagen_clinica');
   ```

2. Una vez autorizado, crear mediante Supabase Dashboard o la API de Storage el bucket **`imagenes-clinicas`** con **Public bucket desactivado**, límite de **2.097.152 bytes** y MIME permitidos **`image/jpeg`, `image/png`, `image/webp`**. No reutilizar el bucket público `branding`.
3. Revisar y aplicar, con autorización, `scripts/supabase-imagenes-clinicas.sql`. El script comprueba el bucket y RLS, crea únicamente políticas nuevas de Storage y usa una transacción. Si falla una comprobación, no se debe omitir: revisar el esquema real. Si los nombres de políticas ya existen, no ejecutarlo otra vez ni reemplazarlos sin revisar.
4. Comprobar los permisos existentes de `authenticated`: SELECT sobre las tablas consultadas e INSERT/SELECT sobre `imagen_clinica`; acceso a la función de membresía usada por RLS. No otorgar permisos globales ni usar `service_role` para resolver errores de autorización.
5. Reiniciar `npm.cmd run dev` después del cambio de `next.config.ts`. En producción, desplegar la nueva compilación solo después de verificar el almacenamiento privado.

Las políticas propuestas permiten lectura a miembros activos del tenant de la atención. Solo su autor activo puede cargar. Los objetos aún no asociados a una fila son legibles únicamente por ese autor dentro del tenant. No se permite sobrescritura ni borrado por `anon`/`authenticated`, incluso ante políticas permisivas más generales. No se alteran los triggers de auditoría existentes. Las reglas y privilegios reales de `imagen_clinica` deben verificarse por separado.

## Archivos y fallos

- JPG, PNG o WebP, hasta 2 MB por imagen; sin SVG, PDF o HEIC. Los archivos conservan sus bytes originales: no se comprimen ni eliminan metadatos.
- Validación de UUID, etiqueta de hasta 120 caracteres, tamaño, MIME y firma del archivo en servidor. La firma identifica el formato; no equivale a decodificar todos los píxeles ni garantiza que una imagen truncada pueda visualizarse.
- El límite de Server Actions es 3 MB para permitir una imagen de 2 MB y el multipart. La UI envía solo un archivo por solicitud y conserva la selección ante un error.
- Cada selección tiene un UUID estable y la ruta incluye un SHA-256. Reintentar con la misma selección reutiliza ese identificador; la aplicación no sobrescribe archivos ni duplica la fila si una respuesta se perdió después de guardar.
- Si falta el bucket, falla una política o se interrumpe la red, se muestra un error recuperable. La atención ya registrada no se vuelve a insertar por una carga de imagen.
- Si el archivo se sube pero la fila no se puede insertar, puede quedar un objeto privado sin fila. Se conserva para reintentar; no se borra a ciegas porque otra solicitud podría haber confirmado la asociación. Al aumentar el volumen, preparar una conciliación de huérfanos con el responsable de datos. No se incluyó un borrado automático.
- Elegir nuevamente un archivo crea otra selección: la recuperación exacta aplica al mismo formulario abierto. No hay deduplicación por contenido entre selecciones distintas.
- Las filas antiguas con otras rutas se siguen mostrando como registros anteriores; no se transforma ni descarga una URL externa suministrada por la tabla.

## Verificación

Verificación local previa: **41 pruebas existentes y 19 pruebas nuevas aprobadas**, ESLint sin errores y compilación de producción completada. Posteriormente se aplicaron las políticas y se probaron RLS, auditoría y cargas HTTP reales con datos sintéticos. La comprobación HTTP de revocación inmediata falló por el comportamiento de caché documentado por Supabase. No se hizo una prueba manual de la interfaz con pacientes reales.

Pruebas locales sin acceso a Supabase:

```powershell
node --experimental-strip-types --test scripts/imagenes-clinicas.test.mjs
npm.cmd run lint
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm.cmd run build
```

Antes de considerar la función lista en el proyecto principal, verificar en un entorno aprobado con datos sintéticos:

1. Guardar una atención sin imágenes: debe conservar el comportamiento normal y ofrecer adjuntos.
2. Subir un JPG, un PNG y un WebP válidos; abrirlos desde la ficha y comprobar la atención asociada.
3. Rechazar archivo vacío, mayor de 2 MB, SVG, MIME falso y UUID inválido sin insertar una imagen.
4. Interrumpir una carga y reintentar sin cambiar la selección: una sola fila y un solo objeto.
5. Simular fallo de INSERT después de subir: la atención permanece, el error es claro y el reintento completa la asociación.
6. Otro miembro activo del mismo tenant puede leer una imagen registrada, pero no adjuntar a una atención ajena.
7. Usuario de otro tenant, inactivo y sin sesión no puede acceder por la app ni directamente por Storage.
8. Intentos de sobrescribir/borrar objetos deben rechazarse. Comprobar que otros buckets no cambian.
9. Comprobar el evento de auditoría del INSERT en `imagen_clinica`, actor y tenant. No modificar el trigger para ejecutar esta prueba.
10. Revisar imágenes antiguas y una atención cuyo registro tuvo un fallo de derivación. Ese fallo se sigue mostrando; la imagen no lo oculta ni lo corrige.

`scripts/imagenes-clinicas.test.mjs` simula las respuestas del servicio. `scripts/imagenes-clinicas-rls.test.sql` ejecuta RLS y auditoría en una transacción revertida. `scripts/imagenes-clinicas-storage.test.mjs` hace pruebas HTTP interactivas con datos sintéticos y requiere ejecutar los bloques SQL que imprime mediante una conexión administrativa; deja el autor inactivo y su organización para conservar la auditoría. No ejecutarlo desatendido ni sobre datos reales. Su caso de revocación inmediata actualmente detecta la limitación indicada en el reporte y termina con error.

Referencias: [acceso a Storage](https://supabase.com/docs/guides/storage/security/access-control), [buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals).
