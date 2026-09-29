---
applyTo: "supabase/**,src/lib/supabase/**,src/app/actions/**,src/proxy.ts"
---
- Migraciones nuevas en `supabase/migrations/` con el formato `YYYYMMDDHHMMSS_descripcion.sql`. Nunca editar una migración ya aplicada.
- Las funciones auxiliares de RLS viven en el schema `private`. Toda función `SECURITY DEFINER` lleva un comentario que explica por qué.
- Toda tabla nueva lleva `organizacion_id` (o derivación por join) y RLS activado.
- Server Actions: verificar `supabase.auth.getUser()` y validar con zod antes de escribir.
- Mantener `model.md` sincronizado con el esquema real.