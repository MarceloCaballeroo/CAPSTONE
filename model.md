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
| `rut` | `text` |  Unique |
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

### Provisionamiento de organizaciones

La funcion `crear_organizacion_inicial` se encuentra en
`supabase/migrations/20260902010000_bootstrap_organizacion.sql`. El registro
la invoca despues de crear el usuario en Supabase Auth para crear su tenant y
su perfil administrador de forma idempotente.

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

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tenant_log_select` | SELECT | authenticated | PERMISSIVE | `private.es_miembro_de_organizacion(( SELECT usuario.organizacion_id    FROM usuario   WHERE (usuario.id = log_auditoria.usuario_id)))` | — |
| `tenant_log_insert` | INSERT | authenticated | PERMISSIVE | — | `((usuario_id = auth.uid()) AND private.es_miembro_de_organizacion(( SELECT usuario.organizacion_id    FROM usuario   WHERE (usuario.id = auth.uid()))))` |

