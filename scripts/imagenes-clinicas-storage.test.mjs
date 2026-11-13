// Integración real e interactiva. Requiere ejecutar los bloques SQL impresos.
// Conserva el autor INACTIVO y su organización: la auditoría impide eliminarlos.
// node --env-file=.env scripts/imagenes-clinicas-storage.test.mjs --project=ulneqosqaiaknbrjyuzg
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';

const project = process.argv.find(arg => arg.startsWith('--project='))?.slice(10);
assert(project && process.env.NEXT_PUBLIC_SUPABASE_URL === `https://${project}.supabase.co`, 'Confirma explícitamente el proyecto de pruebas');
assert(process.env.SUPABASE_SERVICE_ROLE_KEY, 'Falta clave administrativa local');
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const client = key => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, options);
const admin = client(process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = client(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const bucket = 'imagenes-clinicas';
const ids = Object.fromEntries(['orgA','orgB','paciente','ficha','atencion','imagen'].map(key => [key,randomUUID()]));
const reuseAuthor=process.argv.find(arg=>arg.startsWith('--reuse-author='))?.split('=')[1];
const reuseOrg=process.argv.find(arg=>arg.startsWith('--reuse-org='))?.split('=')[1];
assert(Boolean(reuseAuthor)===Boolean(reuseOrg),'Indicar ambos identificadores para reutilizar datos sintéticos');
for(const id of [reuseAuthor,reuseOrg].filter(Boolean)) assert(/^[0-9a-f-]{36}$/.test(id));
if(reuseOrg) ids.orgA=reuseOrg;
const users = [], sessions = [], paths = [];
const tag = `PRUEBA-IMAGEN-${randomUUID()}`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const ruta = `${ids.atencion}/${ids.imagen}-${createHash('sha256').update(png).digest('hex')}.png`;
const ok = (result, step) => { if (result.error) throw new Error(`${step}: ${result.error.message}`); return result.data; };
const deny = (result, step) => assert(result.error, `${step}: debía rechazarse`);
const cleanErrors = [];
const terminal = createInterface({input:process.stdin,output:process.stdout});
async function sql(query) {
  console.log(`SQL_ADMIN ${JSON.stringify({query})}`);
  assert.equal(await terminal.question('Ejecuta el SQL mediante la conexión administrativa y escribe ok: '),'ok');
}
async function cleanup(step, operation) {
  try { ok(await operation(),step); } catch (error) { cleanErrors.push(error.message); }
}

try {
  for (let i=0;i<3;i++) {
    let email = `imagen-${randomUUID()}@example.invalid`;
    const password = randomBytes(32).toString('base64url');
    const {user} = ok(i===0 && reuseAuthor
      ? await admin.auth.admin.updateUserById(reuseAuthor,{password})
      : await admin.auth.admin.createUser({email,password,email_confirm:true}),'Preparar usuario temporal');
    email=user.email;
    users.push(user.id);
    const session = client(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    ok(await session.auth.signInWithPassword({email,password}),'Iniciar sesión de prueba');
    sessions.push(session);
  }
  await sql(`begin;
${reuseOrg?`update public.organizacion set nombre='${tag}' where id='${ids.orgA}';`:`insert into public.organizacion(id,nombre) values ('${ids.orgA}','${tag}');`}
insert into public.organizacion(id,nombre) values ('${ids.orgB}','${tag}');
${reuseAuthor?`update public.usuario set activo=true,nombre='${tag}' where id='${reuseAuthor}';`:''}
insert into public.usuario(id,nombre,organizacion_id) values ${users.map((id,i)=>({id,i})).filter(({i})=>!(reuseAuthor&&i===0)).map(({id,i})=>`('${id}','${tag}','${i===2?ids.orgB:ids.orgA}')`).join(',')};
insert into public.paciente(id,organizacion_id,nombre,apellido_paterno,fecha_nacimiento,rut_numero,rut_dv) values ('${ids.paciente}','${ids.orgA}','${tag}','SINTETICO','2000-01-01',11111111,'1');
insert into public.ficha_clinica(id,paciente_id) values ('${ids.ficha}','${ids.paciente}');
commit;`);
  const diagnosticos=ok(await sessions[0].from('catalogo_cie10').select('codigo').order('codigo').limit(1),'Leer catálogo');
  ok(await sessions[0].from('atencion').insert({id:ids.atencion,ficha_id:ids.ficha,usuario_id:users[0],diagnostico_cie10:diagnosticos[0].codigo,nivel_riesgo_iwgdf:'muy_bajo'}),'Registrar atención con rol real');
  const author=sessions[0].storage.from(bucket);
  paths.push(ruta);
  ok(await author.upload(ruta,png,{contentType:'image/png',upsert:false,cacheControl:'0'}),'Subir PNG real');
  deny(await sessions[1].storage.from(bucket).download(ruta),'Colega sin registro');
  ok(await sessions[0].from('imagen_clinica').insert({id:ids.imagen,atencion_id:ids.atencion,url_storage:ruta,etiqueta:tag}),'Asociar imagen con rol real');
  for (const session of sessions.slice(0,2)) {
    const blob=ok(await session.storage.from(bucket).download(ruta),'Descargar imagen autorizada');
    assert.deepEqual(Buffer.from(await blob.arrayBuffer()),png,'Los bytes descargados deben coincidir');
  }
  deny(await sessions[2].storage.from(bucket).download(ruta),'Otro tenant');
  deny(await anon.storage.from(bucket).download(ruta),'Anónimo');
  const publicResponse=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${ruta}`);
  assert(!publicResponse.ok,'La URL pública no debe servir la imagen');
  deny(await author.upload(ruta,png,{contentType:'image/png',upsert:true}),'Sobrescritura');
  const removed=await author.remove([ruta]);
  assert(removed.error || removed.data?.length===0,'El autor no debe poder borrar');
  ok(await author.download(ruta),'El archivo permanece después del intento de borrado');
  for (const [label,session,body,type] of [
    ['Colega carga',sessions[1],png,'image/png'],
    ['Externo carga',sessions[2],png,'image/png'],
    ['MIME no permitido',sessions[0],Buffer.from('<svg/>'),'image/svg+xml'],
    ['Mayor de 2 MB',sessions[0],Buffer.alloc(2097153),'image/png'],
  ]) {
    const path=`${ids.atencion}/${randomUUID()}-${'b'.repeat(64)}.png`;
    paths.push(path);
    deny(await session.storage.from(bucket).upload(path,body,{contentType:type}),label);
  }
  await sql(`update public.usuario set activo=false where id='${users[0]}' and nombre='${tag}';`);
  deny(await author.download(ruta),'Usuario inactivo con token vigente');
  console.log('PASS: carga PNG y asociación reales, bytes iguales, lectura del colega, aislamiento tenant, anon, URL pública, sobrescritura, borrado, MIME, tamaño e inactivo.');
} catch(error) {
  console.error('FALLO PRUEBA:',error.message);
  process.exitCode=1;
} finally {
  for (const session of sessions) await cleanup('Cerrar sesión temporal',()=>session.auth.signOut({scope:'global'}));
  if(paths.length) await cleanup('Eliminar objetos de prueba',()=>admin.storage.from(bucket).remove(paths));
  await sql(`begin;
delete from public.imagen_clinica where id='${ids.imagen}';
delete from public.atencion where id='${ids.atencion}';
delete from public.ficha_clinica where id='${ids.ficha}';
delete from public.paciente where id='${ids.paciente}';
delete from public.usuario where nombre='${tag}' and id<>'${users[0]}' and organizacion_id in ('${ids.orgA}','${ids.orgB}');
update public.usuario set activo=false where id='${users[0]}';
delete from public.organizacion where nombre='${tag}' and id='${ids.orgB}';
commit;`);
  for(const id of users.slice(1)) await cleanup('Eliminar usuario temporal',()=>admin.auth.admin.deleteUser(id));
  terminal.close();
  if(cleanErrors.length) throw new Error(`Revisar limpieza: ${cleanErrors.join('; ')}. Identificador: ${tag}`);
  console.log(`Limpieza finalizada; auditoría, autor inactivo ${users[0]} y organización ${ids.orgA} conservados.`);
}
