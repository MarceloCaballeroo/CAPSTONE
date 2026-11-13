-- Permiso mínimo para la Server Action; conserva las políticas y auditoría existentes.
grant insert (id, atencion_id, url_storage, etiqueta) on public.imagen_clinica to authenticated;

create policy imagenes_clinicas_registro_autor on public.imagen_clinica
as restrictive for insert to authenticated
with check (
  url_storage ~ ('^' || atencion_id::text || '/' || id::text || '-[0-9a-f]{64}\.(jpg|png|webp)$')
  and char_length(coalesce(etiqueta,'')) <= 120
  and exists (
    select 1 from public.atencion a
    join public.ficha_clinica f on f.id=a.ficha_id
    join public.paciente p on p.id=f.paciente_id
    join public.usuario u on u.id=(select auth.uid())
    where a.id=imagen_clinica.atencion_id and a.usuario_id=u.id
      and u.activo and u.organizacion_id=p.organizacion_id
      and private.es_miembro_de_organizacion(p.organizacion_id)
  )
);
