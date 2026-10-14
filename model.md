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
| `rut` | `text` |  Unique with `organizacion_id` (`paciente_org_rut_key`) |
| `fecha_nacimiento` | `date` |  |
| `sexo_biologico` | `sexo_biologico` |  |
| `telefono` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `direccion` | `text` |  Nullable |
| `comuna` | `text` |  Nullable |
| `prevision` | `prevision_salud` |  |
| `centro_salud_origen` | `text` |  Nullable |
| `contacto_emergencia_nombre` | `text` |  Nullable |
| `contacto_emergencia_telefono` | `text` |  Nullable |
| `contacto_emergencia_parentesco` | `text` |  Nullable |
| `consentimiento` | `bool` |  |
| `fecha_consentimiento` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `organizacion_id` | `uuid` |  |

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
| `coordenada_x` | `float8` | Local coordinates on model `foot-v1` |
| `coordenada_y` | `float8` | Local coordinates on model `foot-v1` |
| `coordenada_z` | `float8` | Local coordinates on model `foot-v1` |
| `normal_x` | `float8` | Surface normal X |
| `normal_y` | `float8` | Surface normal Y |
| `normal_z` | `float8` | Surface normal Z |
| `modelo_version` | `text` | Defaults to `foot-v1` |
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
| `tenant_paciente_insert` | INSERT | authenticated | PERMISSIVE | — | `((char_length(rut) >= 8) AND (char_length(nombre) > 0) AND private.es_miembro_de_organizacion(organizacion_id))` |
| `tenant_paciente_update` | UPDATE | authenticated | PERMISSIVE | `private.es_miembro_de_organizacion(organizacion_id)` | `private.es_miembro_de_organizacion(organizacion_id)` |

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
| RUT válido y sin duplicados | `paciente.rut` (`text`, formato con puntos y guion) con `CHECK public.rut_valido(rut)` (módulo 11) y unicidad `(organizacion_id, rut normalizado)` sin importar el formato. |
| Diagnóstico CIE-10 (3FN) | `atencion.diagnostico_cie10` es FK a `catalogo_cie10(codigo)`; el nombre solo vive en el catálogo. Carga inicial de 17 códigos podológicos; ampliable por carga masiva. |
| Antecedentes (1FN) | `ficha_antecedente` (una fila por alergia, enfermedad base, medicamento o cirugía). `ficha_clinica.antecedentes` queda como nota general. |
| Atención ↔ cita | `atencion.cita_id` (único, opcional). |
| Sin doble reserva | `cita.duracion_min` + `cita.fecha_hora_fin` (calculada por trigger) y restricción de exclusión `cita_sin_solape` por profesional, ignorando citas canceladas o no asistidas. Error `23P01` en la app. |
| Retención clínica | FK `ON DELETE RESTRICT` entre paciente, ficha, atención, derivación e imagen; baja lógica con `paciente.activo`. |
| Hallazgos inmutables | Sin UPDATE/DELETE; corrección = fila nueva con `corrige_hallazgo_id`. |
| Auditoría | Triggers en todas las tablas clínicas; guarda solo campos modificados y omite datos personales (solo registra los *nombres* de campos sensibles modificados). |

Migraciones: `supabase/migrations/20261014_auditoria_completa.sql` y `supabase/migrations/20261014_normalizacion_y_mejoras.sql`.

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

Migración: `supabase/migrations/20261014_auditoria_completa.sql`.

## Configuración pendiente (no versionable en SQL)

- Activar *Prevent use of leaked passwords* en Supabase Auth (puede requerir plan de pago).
