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

## Custom Types / Enums

### `estado_cita`

`agendada` | `confirmada` | `en_espera` | `atendida` | `cancelada` | `no_asiste`

### `estado_derivacion`

`pendiente` | `enviada` | `aceptada` | `rechazada` | `completada`

### `nivel_riesgo_iwgdf`

`muy_bajo` | `bajo` | `moderado` | `alto`

### `prevision_salud`

`fonasa_a` | `fonasa_b` | `fonasa_c` | `fonasa_d` | `isapre` | `dipreca_capredena` | `particular`

### `sexo_biologico`

`masculino` | `femenino` | `intersexual` | `no_especificado`

## RLS Policies

### `ficha_clinica`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Creacion de ficha clinica vinculada a un paciente` | INSERT | authenticated | PERMISSIVE | — | `(paciente_id IS NOT NULL)` |
| `Lectura de ficha clinica para personal autenticado` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Actualizacion de antecedentes en ficha clinica` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM usuario   WHERE ((usuario.id = auth.uid()) AND (usuario.activo = true))))` | `(paciente_id IS NOT NULL)` |

### `cita`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Lectura de citas para personal autenticado` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Agendamiento de citas` | INSERT | authenticated | PERMISSIVE | — | `((paciente_id IS NOT NULL) AND (fecha_hora IS NOT NULL))` |
| `Cancelacion o borrado de citas` | DELETE | authenticated | PERMISSIVE | `((usuario_id = auth.uid()) OR (usuario_id IS NULL))` | — |
| `Actualizacion de estado de citas` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM usuario   WHERE ((usuario.id = auth.uid()) AND (usuario.activo = true))))` | `(paciente_id IS NOT NULL)` |

### `imagen_clinica`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Lectura de imagenes clinicas` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Carga de imagenes asociadas a una atencion` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM atencion   WHERE (atencion.id = imagen_clinica.atencion_id)))` |
| `Eliminacion de imagenes clinicas por creador de la atencion` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM atencion   WHERE ((atencion.id = imagen_clinica.atencion_id) AND (atencion.usuario_id = auth.uid()))))` | — |

### `derivacion`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Lectura de interconsultas y derivaciones` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Generacion de derivaciones` | INSERT | authenticated | PERMISSIVE | — | `((atencion_id IS NOT NULL) AND (char_length(motivo) > 0))` |
| `Actualizacion de estado de derivacion` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM usuario   WHERE ((usuario.id = auth.uid()) AND (usuario.activo = true))))` | `(atencion_id IS NOT NULL)` |

### `log_auditoria`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Lectura de auditoria para personal autenticado` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Insercion estricta de auditoria` | INSERT | authenticated | PERMISSIVE | — | `((usuario_id = auth.uid()) AND (char_length(tabla_afectada) > 0))` |

### `atencion`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Clinicos activos pueden leer atenciones` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM usuario   WHERE ((usuario.id = auth.uid()) AND (usuario.activo = true))))` | — |
| `Clinicos pueden registrar sus propias atenciones` | INSERT | authenticated | PERMISSIVE | — | `((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM usuario   WHERE ((usuario.id = auth.uid()) AND (usuario.activo = true)))))` |
| `Clinicos pueden editar sus propias atenciones` | UPDATE | authenticated | PERMISSIVE | `((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM usuario   WHERE ((usuario.id = auth.uid()) AND (usuario.activo = true)))))` | `(usuario_id = auth.uid())` |
| `Solo administradores pueden eliminar atenciones` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM usuario   WHERE ((usuario.id = auth.uid()) AND (usuario.rol = 'admin'::text) AND (usuario.activo = true))))` | — |

### `usuario`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Lectura de perfiles de usuario` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Usuarios pueden actualizar su propio perfil` | UPDATE | authenticated | PERMISSIVE | `(id = auth.uid())` | `(id = auth.uid())` |
| `Usuarios pueden insertar su propio perfil` | INSERT | authenticated | PERMISSIVE | — | `(id = auth.uid())` |

### `paciente`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Personal clinico puede consultar pacientes` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Personal clinico puede ingresar pacientes` | INSERT | authenticated | PERMISSIVE | — | `((char_length(rut) >= 8) AND (char_length(nombre) > 0))` |
| `Personal clinico puede actualizar datos de pacientes` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM usuario   WHERE ((usuario.id = auth.uid()) AND (usuario.activo = true))))` | `(char_length(rut) >= 8)` |

