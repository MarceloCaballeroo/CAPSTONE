-- Configuración: preferencias de agenda por organización, edición por admin, equipo con correo y auditoría de cuentas

-- 1. Preferencias de agenda (dias_atencion: ISO 1 = lunes … 7 = domingo)
alter table public.organizacion
  add column if not exists jornada_inicio smallint not null default 8,
  add column if not exists jornada_fin smallint not null default 19,
  add column if not exists duracion_cita_min smallint not null default 45,
  add column if not exists dias_atencion smallint[] not null default '{1,2,3,4,5}';

alter table public.organizacion
  add constraint organizacion_jornada_valida check (jornada_inicio between 0 and 23 and jornada_fin between 1 and 24 and jornada_fin > jornada_inicio),
  add constraint organizacion_duracion_valida check (duracion_cita_min between 10 and 240),
  add constraint organizacion_dias_validos check (cardinality(dias_atencion) > 0 and dias_atencion <@ '{1,2,3,4,5,6,7}'::smallint[]);

-- 2. organizacion no tiene UPDATE por RLS: un admin activo la edita solo mediante esta función
create or replace function public.admin_actualizar_organizacion(nuevo_nombre text, inicio smallint, fin smallint, duracion smallint, dias smallint[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  org uuid;
begin
  select u.organizacion_id into org
  from public.usuario u
  where u.id = (select auth.uid()) and u.rol = 'admin' and u.activo = true;

  if org is null then
    raise exception 'Solo un admin activo puede modificar la organización';
  end if;

  if nullif(trim(nuevo_nombre), '') is null then
    raise exception 'El nombre de la organización es obligatorio';
  end if;

  update public.organizacion
     set nombre = trim(nuevo_nombre),
         jornada_inicio = inicio,
         jornada_fin = fin,
         duracion_cita_min = duracion,
         dias_atencion = dias,
         updated_at = now()
   where id = org;
end;
$$;
revoke all on function public.admin_actualizar_organizacion(text, smallint, smallint, smallint, smallint[]) from public, anon;
grant execute on function public.admin_actualizar_organizacion(text, smallint, smallint, smallint, smallint[]) to authenticated;

-- 3. Equipo con correo: el correo vive en auth.users (no se duplica); solo lo ve un admin activo de la misma organización
create or replace function public.miembros_organizacion()
returns table (id uuid, nombre text, rol text, activo boolean, created_at timestamptz, correo text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.nombre, u.rol, u.activo, u.created_at, au.email::text
  from public.usuario u
  join auth.users au on au.id = u.id
  where u.organizacion_id = (
    select a.organizacion_id from public.usuario a
    where a.id = (select auth.uid()) and a.rol = 'admin' and a.activo = true
  )
  order by u.nombre;
$$;
revoke all on function public.miembros_organizacion() from public, anon;
grant execute on function public.miembros_organizacion() to authenticated;

-- 4. Auditar cambios de cuentas y organización con la función existente (append-only)
drop trigger if exists auditar_usuario on public.usuario;
create trigger auditar_usuario after insert or update or delete on public.usuario
  for each row execute function private.auditar_cambio();
drop trigger if exists auditar_organizacion on public.organizacion;
create trigger auditar_organizacion after insert or update or delete on public.organizacion
  for each row execute function private.auditar_cambio();
