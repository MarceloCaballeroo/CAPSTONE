-- PodoCare: normalización real (CIE-10, antecedentes, RUT), integridad de agenda,
-- retención clínica (RESTRICT), índices y auditoría sin datos personales.
-- Atómica: si algo falla, no se aplica nada.

-- 1. Índices: quitar duplicados y agregar los faltantes en claves foráneas
drop index if exists public.idx_cita_fecha;               -- duplicado de idx_cita_fecha_hora
drop index if exists public.idx_usuario_organizacion;     -- duplicado de usuario_organizacion_id_idx
drop index if exists public.idx_ficha_paciente;           -- cubierto por UNIQUE (paciente_id)
drop index if exists public.idx_log_usuario;              -- cubierto por idx_log_usuario_fecha
drop index if exists public.paciente_organizacion_id_idx; -- cubierto por UNIQUE (organizacion_id, rut)
create index if not exists idx_cita_usuario_fecha on public.cita (usuario_id, fecha_hora);
create index if not exists idx_hallazgo_creado_por on public.hallazgo_clinico (creado_por);

-- 2. Agenda: duración, hora de término y bloqueo de doble reserva por profesional
create extension if not exists btree_gist with schema extensions;

alter table public.cita
  add column if not exists duracion_min smallint not null default 30
    check (duracion_min between 5 and 240),
  add column if not exists fecha_hora_fin timestamptz;

update public.cita
   set fecha_hora_fin = fecha_hora + make_interval(mins => duracion_min)
 where fecha_hora_fin is null;

alter table public.cita alter column fecha_hora_fin set not null;
alter table public.cita add constraint cita_fin_posterior check (fecha_hora_fin > fecha_hora);

create or replace function private.cita_calcular_fin()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.fecha_hora_fin := new.fecha_hora + make_interval(mins => new.duracion_min);
  return new;
end;
$$;
revoke all on function private.cita_calcular_fin() from public, anon, authenticated;

create trigger cita_calcular_fin
  before insert or update of fecha_hora, duracion_min on public.cita
  for each row execute function private.cita_calcular_fin();

alter table public.cita add constraint cita_sin_solape
  exclude using gist (usuario_id with =, tstzrange(fecha_hora, fecha_hora_fin) with &&)
  where (usuario_id is not null
         and estado <> 'cancelada'::public.estado_cita
         and estado <> 'no_asiste'::public.estado_cita);

-- 3. Relación atención ↔ cita (1:1, opcional)
alter table public.atencion
  add column if not exists cita_id uuid unique references public.cita(id) on delete set null;

-- 4. Catálogo CIE-10 (3FN): atencion referencia el código, no repite el nombre
create table if not exists public.catalogo_cie10 (
  codigo text primary key,
  nombre_diagnostico text not null,
  categoria text,
  fecha_carga_masiva timestamptz not null default now()
);
alter table public.catalogo_cie10 enable row level security;
revoke all on public.catalogo_cie10 from anon, authenticated;
grant select on public.catalogo_cie10 to authenticated;
create policy cie10_lectura on public.catalogo_cie10 for select to authenticated using (true);

insert into public.catalogo_cie10 (codigo, nombre_diagnostico, categoria) values
  ('B07',     'Verrugas víricas',                                              'Infecciones'),
  ('B35.1',   'Tiña de las uñas (onicomicosis)',                               'Infecciones'),
  ('E11.4',   'Diabetes mellitus tipo 2 con complicaciones neurológicas',      'Pie diabético'),
  ('E11.5',   'Diabetes mellitus tipo 2 con complicaciones circulatorias periféricas', 'Pie diabético'),
  ('E11.621', 'Diabetes mellitus tipo 2 con úlcera del pie',                   'Pie diabético'),
  ('I70.2',   'Aterosclerosis de las arterias de las extremidades',            'Circulatorio'),
  ('L03.0',   'Celulitis de dedos de mano y pie',                              'Infecciones'),
  ('L60.0',   'Uña encarnada',                                                 'Afecciones ungueales'),
  ('L60.2',   'Onicogrifosis',                                                 'Afecciones ungueales'),
  ('L60.3',   'Distrofia ungueal',                                             'Afecciones ungueales'),
  ('L84',     'Callos y callosidades',                                         'Piel'),
  ('L97',     'Úlcera de miembro inferior, no clasificada en otra parte',      'Piel'),
  ('M20.1',   'Hallux valgus (adquirido)',                                     'Deformidades'),
  ('M20.4',   'Otros dedos del pie en martillo (adquirido)',                   'Deformidades'),
  ('M21.4',   'Pie plano (adquirido)',                                         'Deformidades'),
  ('M72.2',   'Fibromatosis de la aponeurosis plantar (fascitis plantar)',     'Musculoesquelético'),
  ('M77.3',   'Espolón calcáneo',                                              'Musculoesquelético')
on conflict (codigo) do nothing;

alter table public.atencion
  add constraint atencion_diagnostico_cie10_fkey
  foreign key (diagnostico_cie10) references public.catalogo_cie10(codigo) on update cascade;
create index if not exists idx_atencion_cie10 on public.atencion (diagnostico_cie10);

-- 5. Antecedentes en filas (1FN): ficha_clinica.antecedentes queda como nota general
create table if not exists public.ficha_antecedente (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.ficha_clinica(id) on delete restrict,
  tipo text not null check (tipo in ('alergia','enfermedad_base','medicamento','cirugia','otro')),
  descripcion text not null check (char_length(btrim(descripcion)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists idx_antecedente_ficha on public.ficha_antecedente (ficha_id);
alter table public.ficha_antecedente enable row level security;
revoke all on public.ficha_antecedente from anon;
grant select, insert, update, delete on public.ficha_antecedente to authenticated;
create policy tenant_antecedente_all on public.ficha_antecedente for all to authenticated
  using (exists (select 1 from public.ficha_clinica f join public.paciente p on p.id = f.paciente_id
                 where f.id = ficha_antecedente.ficha_id and private.es_miembro_de_organizacion(p.organizacion_id)))
  with check (exists (select 1 from public.ficha_clinica f join public.paciente p on p.id = f.paciente_id
                 where f.id = ficha_antecedente.ficha_id and private.es_miembro_de_organizacion(p.organizacion_id)));

-- 6. RUT: validación de dígito verificador y unicidad sin importar el formato
create or replace function public.rut_valido(p_rut text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  l text; cuerpo text; dv text; suma int := 0; mult int := 2; i int; r int; esperado text;
begin
  if p_rut is null then return false; end if;
  l := upper(regexp_replace(p_rut, '[.\-\s]', '', 'g'));
  if l !~ '^\d{7,8}[0-9K]$' then return false; end if;
  cuerpo := left(l, length(l) - 1);
  dv := right(l, 1);
  for i in reverse length(cuerpo)..1 loop
    suma := suma + substr(cuerpo, i, 1)::int * mult;
    mult := case when mult = 7 then 2 else mult + 1 end;
  end loop;
  r := 11 - (suma % 11);
  esperado := case r when 11 then '0' when 10 then 'K' else r::text end;
  return esperado = dv;
end;
$$;
revoke all on function public.rut_valido(text) from public, anon;
grant execute on function public.rut_valido(text) to authenticated, service_role;

alter table public.paciente add constraint paciente_rut_valido check (public.rut_valido(rut));
create unique index if not exists paciente_org_rut_normalizado_key
  on public.paciente (organizacion_id, (regexp_replace(upper(rut), '[.\-\s]', '', 'g')));

-- 7. Retención clínica: no borrar en cascada; baja lógica de pacientes
alter table public.paciente add column if not exists activo boolean not null default true;

do $$
declare r record;
begin
  for r in
    select (select relname from pg_class where oid = c.conrelid) as tabla, c.conname,
           pg_get_constraintdef(c.oid) as def
      from pg_constraint c
     where c.contype = 'f' and c.confdeltype = 'c'
       and c.connamespace = 'public'::regnamespace
       and (select relname from pg_class where oid = c.conrelid)
           in ('ficha_clinica','atencion','derivacion','imagen_clinica','cita')
       and (select relname from pg_class where oid = c.confrelid)
           in ('paciente','ficha_clinica','atencion')
  loop
    execute format('alter table public.%I drop constraint %I', r.tabla, r.conname);
    execute format('alter table public.%I add constraint %I %s', r.tabla, r.conname,
                   replace(r.def, 'ON DELETE CASCADE', 'ON DELETE RESTRICT'));
  end loop;
end $$;

-- 8. Tipo exacto para el área de heridas
alter table public.imagen_clinica
  alter column area_cm2 type numeric(6,2) using area_cm2::numeric(6,2);

-- 9. Auditoría sin datos personales: guarda solo campos cambiados y omite los sensibles
create or replace function private.auditar_cambio()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c_sens constant text[] := array['rut','nombre','apellido_paterno','apellido_materno','fecha_nacimiento',
    'telefono','email','direccion','comuna','contacto_emergencia_nombre','contacto_emergencia_telefono',
    'contacto_emergencia_parentesco','antecedentes','observaciones','descripcion','motivo','motivo_consulta'];
  v_uid uuid := auth.uid();
  v_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_base jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_detalle jsonb;
  v_cambios jsonb;
  v_sens jsonb;
begin
  if tg_op = 'INSERT' then
    v_detalle := jsonb_build_object('datos_nuevos', v_new - c_sens);
  elsif tg_op = 'DELETE' then
    v_detalle := jsonb_build_object('datos_anteriores', v_old - c_sens);
  else
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('antes', v_old->n.key, 'despues', n.value)), '{}'::jsonb)
      into v_cambios
      from jsonb_each(v_new - c_sens - 'updated_at') n
     where (v_old->n.key) is distinct from n.value;
    select coalesce(jsonb_agg(k), '[]'::jsonb) into v_sens
      from unnest(c_sens) k where (v_old->k) is distinct from (v_new->k);
    if v_cambios = '{}'::jsonb and v_sens = '[]'::jsonb then
      return null;  -- actualización sin cambios reales
    end if;
    v_detalle := jsonb_build_object('cambios', v_cambios, 'campos_sensibles_modificados', v_sens);
  end if;

  insert into public.log_auditoria (usuario_id, tabla_afectada, accion, registro_id, detalle, fecha)
  values (
    case when exists (select 1 from public.usuario u where u.id = v_uid) then v_uid else null end,
    tg_table_name, tg_op, nullif(v_base->>'id', '')::uuid, v_detalle, now());
  return null;
end;
$$;
revoke all on function private.auditar_cambio() from public, anon, authenticated;

create trigger auditar_ficha_antecedente
  after insert or update or delete on public.ficha_antecedente
  for each row execute function private.auditar_cambio();
