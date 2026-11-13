-- PROPUESTA: no ejecutada. Revisar el proyecto y sus políticas antes de aplicar.
-- Crear previamente por Dashboard/API el bucket privado imagenes-clinicas:
-- file_size_limit = 2097152; allowed_mime_types = image/jpeg, image/png, image/webp.
-- No cambia tablas clínicas, políticas existentes ni triggers de auditoría.
-- Aplicación única y transaccional. Si ya existen estos nombres, detener y revisar.
begin;

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'imagenes-clinicas' and public = false
      and file_size_limit = 2097152
      and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]
      and allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp']::text[]
  ) then
    raise exception 'Crear o revisar el bucket privado y sus límites antes de aplicar las políticas';
  end if;
  if to_regprocedure('private.es_miembro_de_organizacion(uuid)') is null then
    raise exception 'Falta la función de membresía; revisar el esquema real';
  end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where ((n.nspname = 'public' and c.relname in ('atencion', 'ficha_clinica', 'paciente', 'usuario', 'imagen_clinica'))
      or (n.nspname = 'storage' and c.relname = 'objects')) and not c.relrowsecurity
  ) then
    raise exception 'RLS debe estar habilitada en las tablas involucradas';
  end if;
end $$;

-- Las políticas permisivas habilitan el bucket; las restrictivas acotan también
-- posibles políticas permisivas preexistentes. Otros buckets no cambian.
create policy imagenes_clinicas_lectura on storage.objects
  for select to authenticated using (bucket_id = 'imagenes-clinicas');

create policy imagenes_clinicas_lectura_limite on storage.objects
  as restrictive for select to authenticated
  using (bucket_id <> 'imagenes-clinicas' or exists (
    select 1 from public.atencion a
    join public.ficha_clinica f on f.id = a.ficha_id
    join public.paciente p on p.id = f.paciente_id
    join public.usuario u on u.id = (select auth.uid())
    where a.id::text = (storage.foldername(name))[1]
      and u.activo and u.organizacion_id = p.organizacion_id
      and private.es_miembro_de_organizacion(p.organizacion_id)
      and (a.usuario_id = u.id or exists (
        select 1 from public.imagen_clinica i
        where i.atencion_id = a.id and i.url_storage = name
      ))
  ));

create policy imagenes_clinicas_carga on storage.objects
  for insert to authenticated with check (bucket_id = 'imagenes-clinicas');

create policy imagenes_clinicas_carga_limite on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'imagenes-clinicas' or (
    name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{64}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.atencion a
      join public.ficha_clinica f on f.id = a.ficha_id
      join public.paciente p on p.id = f.paciente_id
      join public.usuario u on u.id = (select auth.uid())
      where a.id::text = (storage.foldername(name))[1]
        and a.usuario_id = u.id and u.activo
        and u.organizacion_id = p.organizacion_id
        and private.es_miembro_de_organizacion(p.organizacion_id)
    )
  ));

create policy imagenes_clinicas_sin_sobrescritura on storage.objects
  as restrictive for update to public
  using (bucket_id <> 'imagenes-clinicas')
  with check (bucket_id <> 'imagenes-clinicas');

create policy imagenes_clinicas_sin_borrado on storage.objects
  as restrictive for delete to public using (bucket_id <> 'imagenes-clinicas');

-- No se referencian tablas clínicas en una política aplicable a anon.
create policy imagenes_clinicas_sin_anon on storage.objects
  as restrictive for all to anon
  using (bucket_id <> 'imagenes-clinicas')
  with check (bucket_id <> 'imagenes-clinicas');

commit;
