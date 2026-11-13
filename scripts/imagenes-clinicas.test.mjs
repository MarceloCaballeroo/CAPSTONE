// Ejecuta las acciones y la ruta reales con servicios simulados, sin .env ni red.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
import { MAX_BYTES_IMAGEN, validarArchivoImagen, tipoContenidoImagen, esRutaImagenClinica } from "../src/lib/validations/imagenes.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ids = {
  usuario: "11111111-1111-4111-8111-111111111111",
  paciente: "22222222-2222-4222-8222-222222222222",
  atencion: "33333333-3333-4333-8333-333333333333",
  imagen: "44444444-4444-4444-8444-444444444444",
};
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1cAAAAASUVORK5CYII=", "base64");
const ok = (data = null) => ({ data, error: null });
const fail = { data: null, error: { message: "Fallo simulado", code: "XX000" } };

function load(relative, mocks, cache = new Map()) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = { exports: {} };
  cache.set(filename, loaded);
  const requireModule = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/") || name.startsWith(".")) {
      let target = name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : path.resolve(path.dirname(filename), name);
      if (!path.extname(target)) target += ".ts";
      return load(target, mocks, cache);
    }
    return createRequire(filename)(name);
  };
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", code)(requireModule, loaded, loaded.exports);
  return loaded.exports;
}

function fixture(options = {}) {
  const state = { row: null, objects: new Map(), uploads: 0, inserts: 0, downloads: 0, queries: 0, revalidated: [] };
  const db = {
    auth: { getUser: async () => ({ data: { user: options.noSession ? null : { id: ids.usuario } }, error: null }) },
    from(table) {
      state.queries++;
      const query = { operation: "select", filters: {} };
      const chain = {
        select() { return this; },
        eq(key, value) { query.filters[key] = value; return this; },
        maybeSingle() { return this; },
        insert(values) { query.operation = "insert"; query.values = values; return this; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (options.networkFailure) throw new Error("Sin conexión simulada");
            if (table === "usuario") return ok({ activo: !options.inactive });
            if (table === "atencion") {
              assert.equal(query.filters.usuario_id, ids.usuario);
              assert.equal(query.filters["ficha_clinica.paciente_id"], ids.paciente);
              return options.foreignAttention ? ok() : ok({ id: ids.atencion });
            }
            assert.equal(table, "imagen_clinica");
            if (query.operation === "select") return ok(state.row);
            state.inserts++;
            if (options.failInsert) return fail;
            if (state.row) return fail;
            state.row = query.values;
            return options.lostInsertResponse ? fail : ok();
          }).then(resolve, reject);
        },
      };
      return chain;
    },
    storage: { from(bucket) {
      assert.equal(bucket, "imagenes-clinicas");
      return {
        async upload(route, bytes, config) {
          state.uploads++;
          assert.equal(config.upsert, false);
          if (options.failStorage) return fail;
          if (state.objects.has(route)) return fail;
          state.objects.set(route, new Blob([bytes], { type: config.contentType }));
          return options.lostUploadResponse ? fail : ok();
        },
        async download(route) {
          state.downloads++;
          return state.objects.has(route) ? ok(state.objects.get(route)) : fail;
        },
      };
    } },
  };
  const mocks = {
    "@/lib/supabase/server": { createClient: async () => db },
    "next/cache": { revalidatePath: (value) => state.revalidated.push(value) },
  };
  const { adjuntarImagenAction } = load("src/app/actions/imagenes.ts", mocks);
  const { GET } = load("src/app/api/imagenes/[id]/route.ts", mocks);
  const run = (input = form()) => adjuntarImagenAction({}, input);
  const get = (id = ids.imagen) => GET(new Request("https://example.invalid"), { params: Promise.resolve({ id }) });
  return { state, run, get };
}

function form(file = new File([png], "foto.png", { type: "image/png" })) {
  const data = new FormData();
  for (const [name, value] of Object.entries({ pacienteId: ids.paciente, atencionId: ids.atencion, imagenId: ids.imagen, etiqueta: "Foto sintética", imagen: file })) data.set(name, value);
  return data;
}

test("rechaza vacíos, exceso de tamaño y SVG; acepta el límite exacto", () => {
  assert.ok(validarArchivoImagen(new File([], "vacio.png", { type: "image/png" })));
  assert.ok(validarArchivoImagen(new File([new Uint8Array(MAX_BYTES_IMAGEN + 1)], "grande.png", { type: "image/png" })));
  assert.ok(validarArchivoImagen(new File(["<svg/>"], "vector.svg", { type: "image/svg+xml" })));
  assert.equal(validarArchivoImagen(new File([new Uint8Array(MAX_BYTES_IMAGEN)], "limite.png", { type: "image/png" })), null);
});

test("identifica firmas JPG, PNG, WebP y rechaza texto o bytes insuficientes", () => {
  assert.equal(tipoContenidoImagen(png), "image/png");
  assert.equal(tipoContenidoImagen(Uint8Array.from([255, 216, 255, ...new Array(9).fill(0)])), "image/jpeg");
  assert.equal(tipoContenidoImagen(Buffer.from("RIFF0000WEBP")), "image/webp");
  assert.equal(tipoContenidoImagen(Buffer.from("<html>texto inválido</html>")), null);
  assert.equal(tipoContenidoImagen(new Uint8Array(2)), null);
});

test("rechaza identificadores y etiquetas inválidos antes de acceder al servicio", async () => {
  const f = fixture();
  const bad = form(); bad.set("atencionId", "../otro");
  assert.ok((await f.run(bad)).error);
  const long = form(); long.set("etiqueta", "x".repeat(121));
  assert.ok((await f.run(long)).error);
  assert.equal(f.state.queries, 0);
});

for (const [condition, name] of [["noSession", "sin sesión"], ["inactive", "usuario inactivo"], ["foreignAttention", "atención ajena o invisible por RLS"]]) {
  test(`no carga ni registra para ${name}`, async () => {
    const f = fixture({ [condition]: true });
    assert.ok((await f.run()).error);
    assert.equal(f.state.uploads, 0);
    assert.equal(f.state.inserts, 0);
  });
}

test("rechaza MIME falso incluso cuando el nombre tiene extensión admitida", async () => {
  const f = fixture();
  assert.ok((await f.run(form(new File([png], "foto.jpg", { type: "image/jpeg" })))).error);
  assert.equal(f.state.uploads, 0);
});

test("carga y registra una imagen con ruta privada y devuelve el mismo ID", async () => {
  const f = fixture();
  assert.equal((await f.run()).imagenId, ids.imagen);
  assert.equal(f.state.row.atencion_id, ids.atencion);
  assert.ok(esRutaImagenClinica(f.state.row.url_storage, ids.atencion, ids.imagen));
  assert.deepEqual(f.state.revalidated, [`/patients/${ids.paciente}`]);
  assert.equal(f.state.objects.size, 1);
});

test("repetir la selección ya guardada no vuelve a subir ni insertar", async () => {
  const f = fixture();
  await f.run();
  assert.equal((await f.run()).imagenId, ids.imagen);
  assert.equal(f.state.inserts, 1);
  assert.equal(f.state.uploads, 1);
});

test("un ID existente para otro contenido no se sobrescribe", async () => {
  const f = fixture(); await f.run();
  const diferente = new File([png, new Uint8Array([1])], "otra.png", { type: "image/png" });
  assert.ok((await f.run(form(diferente))).error);
  assert.equal(f.state.uploads, 1);
});

test("bucket ausente o permiso denegado produce error y no inserta fila", async () => {
  const f = fixture({ failStorage: true });
  assert.ok((await f.run()).error);
  assert.equal(f.state.inserts, 0);
});

test("reintenta una asociación fallida reutilizando el objeto privado", async () => {
  const options = { failInsert: true };
  const f = fixture(options);
  assert.ok((await f.run()).error);
  assert.equal(f.state.row, null);
  options.failInsert = false;
  assert.equal((await f.run()).imagenId, ids.imagen);
  assert.equal(f.state.objects.size, 1);
});

test("recupera una respuesta perdida después de guardar el objeto o la fila", async () => {
  for (const options of [{ lostUploadResponse: true }, { lostInsertResponse: true }]) {
    const f = fixture(options);
    assert.equal((await f.run()).imagenId, ids.imagen);
    assert.equal(f.state.objects.size, 1);
  }
});

test("dos envíos simultáneos de la misma selección conservan una fila y un objeto", async () => {
  const f = fixture();
  const results = await Promise.all([f.run(), f.run()]);
  assert.ok(results.every((result) => result.imagenId === ids.imagen));
  assert.equal(f.state.objects.size, 1);
});

test("un fallo de red devuelve error recuperable", async () => {
  assert.ok((await fixture({ networkFailure: true }).run()).error);
});

test("la lectura autenticada devuelve bytes originales y prohíbe cachear", async () => {
  const f = fixture(); await f.run();
  const response = await f.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
});

test("lectura sin sesión, inactiva, UUID inválido o fila invisible se rechaza", async () => {
  assert.equal((await fixture({ noSession: true }).get()).status, 401);
  assert.equal((await fixture({ inactive: true }).get()).status, 403);
  assert.equal((await fixture().get("incorrecto")).status, 404);
  const f = fixture();
  assert.equal((await f.get()).status, 404);
  assert.equal(f.state.downloads, 0);
});

test("rechaza URL externa, traversal o ruta de otra atención sin descargarlas", async () => {
  for (const route of ["https://example.invalid/foto.png", "../secreto.png", `${ids.paciente}/${ids.imagen}-${"a".repeat(64)}.png`]) {
    const f = fixture(); f.state.row = { atencion_id: ids.atencion, url_storage: route };
    assert.equal((await f.get()).status, 404);
    assert.equal(f.state.downloads, 0);
  }
});

test("archivo ausente o sin firma no se sirve como imagen", async () => {
  const f = fixture(); await f.run();
  const route = f.state.row.url_storage;
  f.state.objects.clear();
  assert.equal((await f.get()).status, 503);
  f.state.objects.set(route, new Blob(["<script>contenido falso</script>"]));
  assert.equal((await f.get()).status, 422);
  const hash = createHash("sha256").update(png).digest("hex");
  assert.ok(route.includes(hash));
});
