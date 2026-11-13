# Resultado de configuración y pruebas — 13 de noviembre de 2026

Proyecto: `ulneqosqaiaknbrjyuzg`. Se inspeccionaron definiciones, restricciones, privilegios y políticas antes de modificar la configuración. No se utilizaron pacientes reales.

## Cambios aplicados

- Bucket `imagenes-clinicas`, privado, máximo 2.097.152 bytes, MIME JPEG/PNG/WebP.
- Siete políticas nuevas de Storage: lectura por organización y miembro activo, carga solo por autor, ruta validada, sin sobrescritura, borrado ni acceso anónimo.
- `authenticated` carecía de INSERT en `imagen_clinica`. Tras confirmación adicional, se concedió únicamente para `id`, `atencion_id`, `url_storage`, `etiqueta`; una política restrictiva exige autor activo, organización correcta y ruta correspondiente a los identificadores del registro.
- No se alteraron tablas clínicas, reglas clínicas, triggers de auditoría ni políticas anteriores. Se conservaron los buckets `branding` y `fotos-clinicas`.

## Pruebas y alcance

| Comprobación | Resultado |
| --- | --- |
| RLS SQL: autor, colega, otro tenant, inactivo y anónimo | Aprobada |
| RLS SQL: ruta inválida, sobrescritura y borrado | Aprobada; el borrado también tiene una protección interna de Storage |
| Trigger de auditoría de imagen y actor | Aprobada, sin modificar el trigger |
| Creación de atención e imagen con rol de usuario mediante API | Aprobada |
| Subida PNG real y comparación de bytes descargados | Aprobada |
| Colega lee imagen registrada, pero no objeto sin registro ni carga ajena | Aprobada |
| Descarga de otra organización, anónima y URL pública | Rechazada correctamente |
| Sobrescritura, borrado, MIME no permitido y más de 2 MB | Rechazados correctamente |
| Revocación inmediata de descarga HTTP tras desactivar al usuario | **Falló: se volvió a descargar la imagen previamente consultada** |
| Carga desde la interfaz local | Confirmada por el usuario; sin detalle del formato probado |
| Subida real JPEG/WebP y demás escenarios manuales | No verificados; las pruebas HTTP usaron PNG |

La prueba SQL revierte sus datos. Las pruebas HTTP generan y limpian registros persistentes; no equivalen a un recorrido del formulario en el navegador.

## Hallazgo: revocación y caché de Storage

Se repitió el caso usando `cacheControl: '0'`, como la aplicación, y la descarga directa siguió funcionando con el token vigente después de desactivar el perfil. En SQL, el mismo tipo de acceso se rechaza correctamente. Supabase documenta que su CDN puede servir respuestas autorizadas previamente hasta que expire el JWT: [explicación y alternativas oficiales](https://supabase.com/kb/troubleshooting/storage-private-bucket-files-still-accessible-after-remove-access-or-logout).

La ruta de la aplicación `/api/imagenes/[id]` verifica sesión, perfil activo y acceso a la fila antes de descargar, y responde con `private, no-store`. Esa comprobación ya existe, pero no impide que alguien que conoce la ruta de Storage y conserva un token use directamente una respuesta cacheada. No afirmar revocación inmediata en Storage ni dar esta prueba por aprobada.

Pendiente decidir una solución para revocación estricta: acceso a archivos exclusivamente a través del servidor, con autorización actual y sin acceso directo equivalente del cliente, o un flujo de purga de caché al revocar acceso. Requiere revisar permisos y probar el diseño antes de aplicarlo; no se cambiaron expiraciones de JWT ni configuración global de Auth.

## Limpieza y auditoría

Confirmado al terminar: cero pacientes, atenciones y objetos de las dos pruebas HTTP; cero sesiones del autor; otros usuarios temporales eliminados. La limpieza inicial del autor falló porque su FK en `log_auditoria` usa `ON DELETE SET NULL` y el trigger de inmutabilidad rechaza ese UPDATE. No se deshabilitó ni alteró la auditoría.

Se conserva exclusivamente el autor sintético `74351060-31f5-4364-9bd4-caf68789931c`, **inactivo y sin sesiones**, y su organización sintética `7055b5df-f382-46a8-bdbb-29bebf04613c`, además de los eventos de auditoría. No se aplicó un bloqueo prolongado. Las contraseñas aleatorias nunca se imprimieron ni guardaron en el repositorio.

## Hallazgos anteriores a este cambio

- `fotos-clinicas` es privado, pero sus políticas permiten SELECT e INSERT a cualquier `authenticated`, sin comprobar organización. No se inspeccionaron sus archivos ni se modificó ese bucket.
- La clave administrativa no tiene INSERT/DELETE en tablas clínicas; se mantuvo ese diseño y se usó SQL administrativo para preparar/retirar datos sintéticos.
- Avisos de seguridad idénticos antes y después: `validar_rut_chileno` con [search_path mutable](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), cinco funciones públicas [SECURITY DEFINER ejecutables por authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [protección de contraseñas filtradas deshabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Son avisos para revisar por separado; no prueban por sí solos que las funciones administrativas sean explotables.
