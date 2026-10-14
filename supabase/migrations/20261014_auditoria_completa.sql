-- Auditoría completa y bitácora append-only (aplicada en producción 2026-10-14)

create or replace function private.auditar_cambio()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
  v_uid uuid := auth.uid();
begin
  v_row := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  insert into public.log_auditoria (usuario_id, tabla_afectada, accion, registro_id, detalle, fecha)
  values (
    case when exists (select 1 from public.usuario u where u.id = v_uid) then v_uid else null end,
    tg_table_name, tg_op, nullif(v_row->>'id','')::uuid,
    case tg_op
      when 'INSERT' then jsonb_build_object('datos_nuevos', to_jsonb(new))
      when 'UPDATE' then jsonb_build_object('datos_anteriores', to_jsonb(old), 'datos_nuevos', to_jsonb(new))
      else jsonb_build_object('datos_anteriores', to_jsonb(old))
    end,
    now());
  return null;
end;
$$;
revoke all on function private.auditar_cambio() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['paciente','ficha_clinica','atencion','derivacion','cita','imagen_clinica','hallazgo_clinico']
  loop
    execute format('drop trigger if exists auditar_%1$s on public.%1$I', t);
    execute format('create trigger auditar_%1$s after insert or update or delete on public.%1$I for each row execute function private.auditar_cambio()', t);
  end loop;
end $$;

drop policy if exists tenant_log_insert on public.log_auditoria;
revoke insert, update, delete, truncate on public.log_auditoria from anon, authenticated;

create or replace function private.log_auditoria_inmutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'log_auditoria es append-only (% bloqueado)', tg_op;
end;
$$;
revoke all on function private.log_auditoria_inmutable() from public, anon, authenticated;

drop trigger if exists log_auditoria_no_mutar on public.log_auditoria;
create trigger log_auditoria_no_mutar before update or delete on public.log_auditoria
  for each row execute function private.log_auditoria_inmutable();

drop function if exists public.auditar_hallazgo_clinico();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.crear_organizacion_inicial(text, text, text) from public, anon;
revoke execute on function public.invitar_a_organizacion(uuid, text, text) from public, anon;
revoke execute on function public.admin_actualizar_usuario(uuid, text, boolean) from public, anon;
