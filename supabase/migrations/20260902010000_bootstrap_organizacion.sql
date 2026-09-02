-- Crea el tenant y el perfil del primer usuario despues del registro en Supabase Auth.
create or replace function public.crear_organizacion_inicial(
  nombre_organizacion text,
  nombre_usuario text,
  plan text default 'individual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nueva_organizacion uuid;
  usuario_existente uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion activa';
  end if;

  if plan not in ('individual', 'clinica') then
    raise exception 'Plan no valido';
  end if;

  select id into usuario_existente
  from public.usuario
  where id = auth.uid();

  if usuario_existente is not null then
    select organizacion_id into nueva_organizacion
    from public.usuario
    where id = auth.uid();
    return nueva_organizacion;
  end if;

  insert into public.organizacion (nombre, plan_tipo)
  values (nullif(trim(nombre_organizacion), ''), plan)
  returning id into nueva_organizacion;

  insert into public.usuario (id, nombre, rol, activo, organizacion_id)
  values (auth.uid(), nullif(trim(nombre_usuario), ''), 'admin', true, nueva_organizacion);

  return nueva_organizacion;
end;
$$;

revoke all on function public.crear_organizacion_inicial(text, text, text) from public;
grant execute on function public.crear_organizacion_inicial(text, text, text) to authenticated;
