-- Ejecutar como postgres en el proyecto configurado. Todos los datos se revierten.
-- Prueba RLS y auditoría reales; no sube bytes mediante la API de Storage.
begin;
do $test$
declare
  org_a uuid := gen_random_uuid(); org_b uuid := gen_random_uuid();
  autor uuid := gen_random_uuid(); colega uuid := gen_random_uuid(); externo uuid := gen_random_uuid();
  paciente uuid := gen_random_uuid(); ficha uuid := gen_random_uuid(); atencion uuid := gen_random_uuid();
  imagen uuid := gen_random_uuid(); objeto uuid := gen_random_uuid();
  ruta text; n integer;
begin
  ruta := atencion::text || '/' || imagen::text || '-' || repeat('a',64) || '.png';
  insert into public.organizacion(id,nombre) values (org_a,'PRUEBA RLS IMAGEN A'),(org_b,'PRUEBA RLS IMAGEN B');
  insert into auth.users(id) values (autor),(colega),(externo);
  insert into public.usuario(id,nombre,organizacion_id) values
    (autor,'PRUEBA AUTOR',org_a),(colega,'PRUEBA COLEGA',org_a),(externo,'PRUEBA EXTERNO',org_b);
  insert into public.paciente(id,organizacion_id,nombre,apellido_paterno,fecha_nacimiento,rut_numero,rut_dv)
    values(paciente,org_a,'PRUEBA','RLS','2000-01-01',11111111,'1');
  insert into public.ficha_clinica(id,paciente_id) values(ficha,paciente);
  insert into public.atencion(id,ficha_id,usuario_id,diagnostico_cie10,nivel_riesgo_iwgdf)
    values(atencion,ficha,autor,(select codigo from public.catalogo_cie10 order by codigo limit 1),'muy_bajo');

  perform set_config('request.jwt.claim.sub',autor::text,true);
  set local role authenticated;
  insert into storage.objects(id,bucket_id,name) values(objeto,'imagenes-clinicas',ruta);
  if not exists(select 1 from storage.objects where id=objeto) then raise exception 'Autor no puede leer objeto pendiente'; end if;
  begin
    insert into storage.objects(bucket_id,name) values('imagenes-clinicas','ruta-invalida.png');
    raise exception 'Se aceptó ruta inválida';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',colega::text,true);
  if exists(select 1 from storage.objects where id=objeto) then raise exception 'Colega ve objeto sin registro'; end if;
  begin
    insert into storage.objects(bucket_id,name) values('imagenes-clinicas',atencion::text || '/' || gen_random_uuid()::text || '-' || repeat('b',64) || '.png');
    raise exception 'Colega pudo cargar en atención ajena';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',autor::text,true);
  insert into public.imagen_clinica(id,atencion_id,url_storage,etiqueta) values(imagen,atencion,ruta,'PRUEBA RLS');
  update storage.objects set metadata='{}'::jsonb where id=objeto;
  get diagnostics n = row_count;
  if n<>0 then raise exception 'Se permitió sobrescritura'; end if;
  begin
    delete from storage.objects where id=objeto;
    get diagnostics n = row_count;
    if n<>0 then raise exception 'Se permitió borrado'; end if;
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',colega::text,true);
  if not exists(select 1 from storage.objects where id=objeto) then raise exception 'Colega no puede leer imagen registrada'; end if;
  if not exists(select 1 from public.imagen_clinica where id=imagen) then raise exception 'Colega no puede leer registro'; end if;
  begin
    insert into public.imagen_clinica(id,atencion_id,url_storage,etiqueta)
      values(gen_random_uuid(),atencion,ruta,'NO DEBE GUARDARSE');
    raise exception 'Colega pudo insertar imagen ajena';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',externo::text,true);
  if exists(select 1 from storage.objects where id=objeto) or exists(select 1 from public.imagen_clinica where id=imagen)
    then raise exception 'Acceso cruzado entre organizaciones'; end if;
  begin
    insert into storage.objects(bucket_id,name) values('imagenes-clinicas',atencion::text || '/' || gen_random_uuid()::text || '-' || repeat('c',64) || '.png');
    raise exception 'Externo pudo cargar';
  exception when insufficient_privilege then null; end;
  reset role;
  update public.usuario set activo=false where id=autor;
  perform set_config('request.jwt.claim.sub',autor::text,true);
  set local role authenticated;
  if exists(select 1 from storage.objects where id=objeto) or exists(select 1 from public.imagen_clinica where id=imagen)
    then raise exception 'Usuario inactivo puede leer'; end if;
  begin
    insert into storage.objects(bucket_id,name) values('imagenes-clinicas',atencion::text || '/' || gen_random_uuid()::text || '-' || repeat('d',64) || '.png');
    raise exception 'Usuario inactivo pudo cargar';
  exception when insufficient_privilege then null; end;
  reset role;
  perform set_config('request.jwt.claim.sub','',true);
  set local role anon;
  if exists(select 1 from storage.objects where id=objeto) then raise exception 'Anon puede leer'; end if;
  begin
    insert into storage.objects(bucket_id,name) values('imagenes-clinicas',ruta || '.anon');
    raise exception 'Anon pudo cargar';
  exception when insufficient_privilege then null; end;
  reset role;
  if not exists(select 1 from public.log_auditoria where registro_id=imagen and usuario_id=autor and tabla_afectada='imagen_clinica' and accion='INSERT')
    then raise exception 'No se registró auditoría con el actor esperado'; end if;
end;
$test$;
rollback;
select 'PASS: autor, colega, otro tenant, inactivo, anon, ruta, sobrescritura, borrado y auditoría; datos revertidos' as resultado;
