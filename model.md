## Table `usuario`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  |
| `rol` | `text` |  |
| `activo` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `organizacion_id` | `uuid` |  |

## Table `paciente`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  |
| `apellido_paterno` | `text` |  |
| `apellido_materno` | `text` |  Nullable |
| `rut_numero` | `int4` |  Cuerpo del RUT, sin dígito verificador |
| `rut_dv` | `bpchar` |  Dígito verificador (`0-9` o `K`); 1 carácter |
| `fecha_nacimiento` | `date` |  |
| `sexo_biologico` | `sexo_biologico` |  Default `no_especificado` |
| `telefono` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `direccion` | `text` |  Nullable |
| `comuna_id` | `int4` |  Nullable; references `comuna` (`ON DELETE SET NULL`) |
| `prevision` | `prevision_salud` |  Default `fonasa_a` |
| `centro_salud_origen` | `text` |  Nullable |
| `consentimiento` | `bool` |  Default `false` |
| `fecha_consentimiento` | `timestamptz` |  Nullable |
| `activo` | `bool` |  Default `true`; baja lógica |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `organizacion_id` | `uuid` |  References `organizacion` |

> El RUT se guarda **descompuesto** en `rut_numero` + `rut_dv` (la antigua columna `rut` de tipo `text` ya no existe); la app lo recompone para mostrarlo y lo descompone antes de escribir. `fecha_nacimiento`, `sexo_biologico` y `prevision` son `NOT NULL`: el formulario los presenta como opcionales, pero si se envían en `null` la escritura falla (los valores por defecto solo se aplican cuando la columna se omite).

## Table `region`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `nombre` | `text` | Unique (`region_nombre_key`) |
| `ordinal` | `text` |  Nullable |

> Catálogo geográfico global de solo lectura (regiones de Chile, con `ordinal` para ordenarlas). Sin `organizacion_id`.

## Table `comuna`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `nombre` | `text` | Unique (`comuna_nombre_key`) |
| `region_id` | `int4` | References `region` (`ON DELETE RESTRICT`) |

> Catálogo geográfico global de solo lectura. `paciente.comuna_id` apunta acá; la región **no** se guarda en `paciente`, se deriva por `comuna.region_id`.

## Table `contacto_emergencia`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary; default `gen_random_uuid()` |
| `paciente_id` | `uuid` | References `paciente` (`ON DELETE CASCADE`) |
| `nombre` | `text` |  |
| `telefono` | `text` |  |
| `parentesco` | `text` |  |

> Relación 1–N con `paciente` (la app gestiona un solo contacto: actualiza el existente o lo crea). Los tres campos son `NOT NULL`, así que un contacto sin teléfono no se puede representar. Sin `organizacion_id`: el tenant se deriva vía `paciente`.

## Table `ficha_clinica`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `paciente_id` | `uuid` |  Unique |
| `antecedentes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `atencion`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ficha_id` | `uuid` |  |
| `usuario_id` | `uuid` |  Nullable |
| `diagnostico_cie10` | `text` |  |
| `nivel_riesgo_iwgdf` | `nivel_riesgo_iwgdf` |  |
| `requiere_derivacion` | `bool` |  |
| `observaciones` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `hallazgo_clinico`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `atencion_id` | `uuid` | References `atencion`, no delete |
| `lado_pie` | `text` | `izquierdo` / `derecho` |
| `coordenada_x` | `float8` | Local coordinates on the model named in `modelo_version` |
| `coordenada_y` | `float8` | Local coordinates on the model named in `modelo_version` |
| `coordenada_z` | `float8` | Local coordinates on the model named in `modelo_version` |
| `normal_x` | `float8` | Surface normal X |
| `normal_y` | `float8` | Surface normal Y |
| `normal_z` | `float8` | Surface normal Z |
| `modelo_version` | `text` | Defaults to `foot-v1`; the app writes `foot-v2` (cm, see `scripts/build_foot_v2.py`) |
| `afeccion` | `text` | 1-120 characters |
| `intensidad_dolor` | `int2` | 0-10 |
| `creado_por` | `uuid` | References `usuario` |
| `corrige_hallazgo_id` | `uuid` | Nullable; references a prior finding from the same attention |
| `created_at` | `timestamptz` |  |

## Table `cita`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `paciente_id` | `uuid` |  |
| `usuario_id` | `uuid` |  Nullable |
| `fecha_hora` | `timestamptz` |  |
| `estado` | `estado_cita` |  |
| `motivo_consulta` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `log_auditoria`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `usuario_id` | `uuid` |  Nullable |
| `tabla_afectada` | `text` |  |
| `accion` | `text` |  |
| `registro_id` | `uuid` |  Nullable |
| `detalle` | `jsonb` |  Nullable |
| `fecha` | `timestamptz` |  |

> Bitácora **append-only**. Solo se escribe mediante triggers (`private.auditar_cambio()`); `detalle` guarda `datos_nuevos` (INSERT), `datos_anteriores` y `datos_nuevos` (UPDATE) o `datos_anteriores` (DELETE). `usuario_id` es `auth.uid()` (nulo si no hay sesión de usuario). No tiene `organizacion_id` ni `ip_origen`; la organización se deduce vía `usuario`.

## Table `imagen_clinica`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `atencion_id` | `uuid` |  |
| `url_storage` | `text` |  |
| `area_cm2` | `float4` |  Nullable |
| `etiqueta` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `derivacion`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `atencion_id` | `uuid` |  |
| `motivo` | `text` |  |
| `especialidad_destino` | `text` |  |
| `estado` | `estado_derivacion` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `organizacion`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  |
| `plan_tipo` | `text` |  |
| `estado_suscripcion` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Custom Types / Enums

### `sexo_biologico`

`masculino` | `femenino` | `intersexual` | `no_especificado`

### `prevision_salud`

`fonasa_a` | `fonasa_b` | `fonasa_c` | `fonasa_d` | `isapre` | `dipreca_capredena` | `particular`

### `nivel_riesgo_iwgdf`

`muy_bajo` | `bajo` | `moderado` | `alto`

### `estado_cita`

`agendada` | `confirmada` | `en_espera` | `atendida` | `cancelada` | `no_asiste`

### `estado_derivacion`

`pendiente` | `enviada` | `aceptada` | `rechazada` | `completada`

## RLS Policies

### `usuario`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_usuario_update_propio` | UPDATE | authenticated | PERMISSIVE | `(id = auth.uid())` | `((id = auth.uid()) AND (organizacion_id = ( SELECT usuario_1.organizacion_id    FROM usuario usuario_1   WHERE (usuario_1.id = auth.uid()))))` |
| `tenant_usuario_select` | SELECT | authenticated | PERMISSIVE | `private.es_miembro_de_organizacion(organizacion_id)` | — |

### `organizacion`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_organizacion_select` | SELECT | authenticated | PERMISSIVE | `private.es_miembro_de_organizacion(id)` | — |

### `paciente`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_paciente_select` | SELECT | authenticated | PERMISSIVE | `private.es_miembro_de_organizacion(organizacion_id)` | — |
| `tenant_paciente_insert` | INSERT | authenticated | PERMISSIVE | — | `((char_length(btrim(nombre)) > 0) AND (rut_numero > 0) AND (char_length(rut_dv) = 1) AND private.es_miembro_de_organizacion(organizacion_id))` |
| `tenant_paciente_update` | UPDATE | authenticated | PERMISSIVE | `private.es_miembro_de_organizacion(organizacion_id)` | `private.es_miembro_de_organizacion(organizacion_id)` |

### `contacto_emergencia`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_contacto_all` | ALL | authenticated | PERMISSIVE | `EXISTS (SELECT 1 FROM paciente p WHERE p.id = contacto_emergencia.paciente_id AND private.es_miembro_de_organizacion(p.organizacion_id))` | Igual que `USING` |

### `region`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Lectura global region` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `comuna`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Lectura global comuna` | SELECT | authenticated | PERMISSIVE | `true` | — |

> `region` y `comuna` son catálogos públicos: cualquier usuario autenticado los lee, sin filtro por organización.

### `ficha_clinica`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_ficha_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM paciente   WHERE ((paciente.id = ficha_clinica.paciente_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id))))` | — |
| `tenant_ficha_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM paciente   WHERE ((paciente.id = ficha_clinica.paciente_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id))))` |
| `tenant_ficha_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM paciente   WHERE ((paciente.id = ficha_clinica.paciente_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id))))` | `(EXISTS ( SELECT 1    FROM paciente   WHERE ((paciente.id = ficha_clinica.paciente_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id))))` |

### `atencion`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_atencion_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (ficha_clinica      JOIN paciente ON ((paciente.id = ficha_clinica.paciente_id)))   WHERE ((ficha_clinica.id = atencion.ficha_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id))))` | — |
| `tenant_atencion_insert` | INSERT | authenticated | PERMISSIVE | — | `((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM (ficha_clinica      JOIN paciente ON ((paciente.id = ficha_clinica.paciente_id)))   WHERE ((ficha_clinica.id = atencion.ficha_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id)))))` |
| `tenant_atencion_update` | UPDATE | authenticated | PERMISSIVE | `(usuario_id = auth.uid())` | `((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM (ficha_clinica      JOIN paciente ON ((paciente.id = ficha_clinica.paciente_id)))   WHERE ((ficha_clinica.id = atencion.ficha_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id)))))` |
| `tenant_atencion_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM usuario   WHERE ((usuario.id = auth.uid()) AND (usuario.organizacion_id = ( SELECT paciente.organizacion_id            FROM (ficha_clinica              JOIN paciente ON ((paciente.id = ficha_clinica.paciente_id)))           WHERE (ficha_clinica.id = atencion.ficha_id))) AND (usuario.rol = 'admin'::text) AND (usuario.activo = true))))` | — |

### `hallazgo_clinico`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_hallazgo_clinico_select` | SELECT | authenticated | PERMISSIVE | Membership derived through `atencion -> ficha_clinica -> paciente` | — |
| `tenant_hallazgo_clinico_insert` | INSERT | authenticated | PERMISSIVE | — | Creator is `auth.uid()` and tenant membership is derived through `atencion -> ficha_clinica -> paciente` |

Findings are append-only. Each insert is written to `log_auditoria`; no UPDATE or DELETE policies are granted. A correction is a new row whose `corrige_hallazgo_id` points to the finding it replaces. Only findings not referenced by another finding are active on the foot map.

### `cita`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_cita_all` | ALL | authenticated | PERMISSIVE | `private.es_miembro_de_organizacion(( SELECT paciente.organizacion_id    FROM paciente   WHERE (paciente.id = cita.paciente_id)))` | `private.es_miembro_de_organizacion(( SELECT paciente.organizacion_id    FROM paciente   WHERE (paciente.id = cita.paciente_id)))` |

### `imagen_clinica`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_imagen_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((atencion      JOIN ficha_clinica ON ((ficha_clinica.id = atencion.ficha_id)))      JOIN paciente ON ((paciente.id = ficha_clinica.paciente_id)))   WHERE ((atencion.id = imagen_clinica.atencion_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id))))` | — |
| `tenant_imagen_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM ((atencion      JOIN ficha_clinica ON ((ficha_clinica.id = atencion.ficha_id)))      JOIN paciente ON ((paciente.id = ficha_clinica.paciente_id)))   WHERE ((atencion.id = imagen_clinica.atencion_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id))))` |
| `tenant_imagen_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (atencion      JOIN usuario ON ((usuario.id = atencion.usuario_id)))   WHERE ((atencion.id = imagen_clinica.atencion_id) AND (usuario.id = auth.uid()))))` | — |

### `derivacion`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_derivacion_all` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((atencion      JOIN ficha_clinica ON ((ficha_clinica.id = atencion.ficha_id)))      JOIN paciente ON ((paciente.id = ficha_clinica.paciente_id)))   WHERE ((atencion.id = derivacion.atencion_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id))))` | `(EXISTS ( SELECT 1    FROM ((atencion      JOIN ficha_clinica ON ((ficha_clinica.id = atencion.ficha_id)))      JOIN paciente ON ((paciente.id = ficha_clinica.paciente_id)))   WHERE ((atencion.id = derivacion.atencion_id) AND private.es_miembro_de_organizacion(paciente.organizacion_id))))` |

### `log_auditoria`

Sin política INSERT/UPDATE/DELETE y sin privilegios de escritura para `anon`/`authenticated`: solo los triggers SECURITY DEFINER escriben. UPDATE/DELETE bloqueados además por el trigger `log_auditoria_no_mutar`.

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_log_select` | SELECT | authenticated | PERMISSIVE | `private.es_miembro_de_organizacion(( SELECT usuario.organizacion_id    FROM usuario   WHERE (usuario.id = log_auditoria.usuario_id)))` | — |



## Normalización y reglas de integridad (estado real de la base)

| Regla | Implementación |
|-------|----------------|
| Multi-tenancy (3FN) | Solo `usuario` y `paciente` llevan `organizacion_id`; el resto lo hereda por FK y RLS (`private.es_miembro_de_organizacion`). |
| RUT válido | `paciente.rut_numero` + `paciente.rut_dv` con `CHECK paciente_rut_valido_check (validar_rut_chileno(rut_numero, rut_dv))` (módulo 11). El RUT se guarda descompuesto, no como texto formateado. |
| RUT sin duplicados | Índice único `paciente_org_rut_key` sobre `(organizacion_id, rut_numero, upper(rut_dv::text))`. La app traduce el error de duplicado (`traducirErrorPaciente`) a "Ya existe un paciente con ese RUT". |
| Diagnóstico CIE-10 (3FN) | `atencion.diagnostico_cie10` es FK a `catalogo_cie10(codigo)`; el nombre solo vive en el catálogo. Carga inicial de 17 códigos podológicos; ampliable por carga masiva. |
| Antecedentes (1FN) | `ficha_antecedente` (una fila por alergia, enfermedad base, medicamento o cirugía). `ficha_clinica.antecedentes` queda como nota general. |
| Atención ↔ cita | `atencion.cita_id` (único, opcional). |
| Sin doble reserva | `cita.duracion_min` + `cita.fecha_hora_fin` (calculada por trigger) y restricción de exclusión `cita_sin_solape` por profesional, ignorando citas canceladas o no asistidas. Error `23P01` en la app. |
| Retención clínica | FK `ON DELETE RESTRICT` entre paciente, ficha, atención, derivación e imagen; baja lógica con `paciente.activo`. |
| Hallazgos inmutables | Sin UPDATE/DELETE; corrección = fila nueva con `corrige_hallazgo_id`. |
| Auditoría | Triggers en `paciente`, `ficha_clinica`, `atencion`, `derivacion`, `cita`, `imagen_clinica` y `hallazgo_clinico`. Guarda solo los campos modificados y, de los sensibles, únicamente los *nombres*: `rut_numero`, `rut_dv`, `comuna_id`, nombre, apellidos, fecha de nacimiento, teléfono, email, dirección y los textos libres. `contacto_emergencia` no tiene trigger de auditoría. |


Pendiente de diseño: `atencion.requiere_derivacion` es derivable de `derivacion` y de las reglas IWGDF (riesgo de desincronización); `rol`, `lado_pie` y `afeccion` usan `text` con CHECK en lugar de enums.

## Functions

Todas son `SECURITY DEFINER` con `search_path` fijo. `anon` y PUBLIC no tienen EXECUTE.

| Función | Ejecutable por | Descripción |
|---------|----------------|-------------|
| `public.crear_organizacion_inicial(nombre_organizacion text, nombre_usuario text, plan text default 'individual') → uuid` | authenticated | Requiere sesión; valida `plan` (`individual` / `clinica`); usa advisory lock y es idempotente. Crea la organización y el usuario admin. |
| `public.invitar_a_organizacion(usuario_invitado uuid, nombre_usuario text, rol_asignado text default 'clinico')` | authenticated | Solo admin activo; la organización debe tener plan `clinica`. Agrega un usuario a la organización del admin. |
| `public.admin_actualizar_usuario(objetivo uuid, nuevo_rol text default null, nuevo_activo boolean default null)` | authenticated | Solo admin activo; no puede modificarse a sí mismo; rol en (`admin`, `clinico`); solo actúa sobre usuarios de su organización. |
| `public.handle_new_user()` | nadie (trigger) | Placeholder: retorna `NEW`. El alta de `usuario` la hace `crear_organizacion_inicial`. |
| `private.auditar_cambio()` | nadie (trigger) | Escribe en `log_auditoria` tras INSERT/UPDATE/DELETE. |
| `private.log_auditoria_inmutable()` | nadie (trigger) | Lanza excepción ante UPDATE/DELETE en `log_auditoria`. |

> Los 3 avisos del linter de Supabase (`authenticated_security_definer_function_executable`) sobre las funciones de onboarding y administración son intencionales: la app las invoca vía RPC y cada una valida `auth.uid()` y el rol internamente.

## Triggers de auditoría

| Tabla | Trigger | Eventos |
|-------|---------|---------|
| `paciente`, `ficha_clinica`, `atencion`, `derivacion`, `cita`, `imagen_clinica`, `hallazgo_clinico` | `auditar_<tabla>` | AFTER INSERT / UPDATE / DELETE → `private.auditar_cambio()` |
| `log_auditoria` | `log_auditoria_no_mutar` | BEFORE UPDATE / DELETE → `private.log_auditoria_inmutable()` |

> `contacto_emergencia` **no** tiene trigger de auditoría: el alta, la modificación o el borrado del contacto de emergencia no quedan registrados en `log_auditoria` (el volcado de `pg_trigger` no muestra ninguno sobre esa tabla). Los catálogos `region` y `comuna` tampoco, pero al ser de solo lectura no aplica.


## Configuración pendiente (no versionable en SQL)

- Activar *Prevent use of leaked passwords* en Supabase Auth (puede requerir plan de pago).
