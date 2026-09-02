# PodoCare — Sistema de Gestión Clínica para Consultas de Podología

**PodoCare** es una plataforma web de gestión clínica diseñada específicamente para consultas de podología independiente en Chile. Su propósito es digitalizar la ficha clínica del paciente, automatizar el agendamiento de citas, dar seguimiento a las atenciones usando estándares clínicos (CIE-10 e IWGDF) y garantizar la trazabilidad y protección de datos sensibles en cumplimiento con la Ley N.° 19.628 de Protección de la Vida Privada.

Este proyecto se desarrolla en el marco de la asignatura **Capstone (Portafolio de Título)** de la carrera de **Ingeniería en Informática** en **Duoc UC, Sede Plaza Vespucio**.

---

## Contexto y problemática

En Chile, se estima que entre el **60% y el 70% de las consultas de podología independiente** —principalmente negocios unipersonales o equipos de 1 a 2 profesionales— siguen gestionando sus fichas y registros en papel o planillas Excel. Esta práctica informal genera tres problemas concretos:

1. **Pérdida de trazabilidad clínica:** dificultad para hacer seguimiento de tratamientos a largo plazo, como el control de pie de riesgo o la onicocriptosis.
2. **Riesgo operacional y de gestión:** ineficiencias en el agendamiento y la coordinación de citas.
3. **Vulnerabilidad legal:** los datos de salud se clasifican como datos sensibles. Sin almacenamiento seguro ni controles de acceso adecuados, los profesionales quedan expuestos a sanciones bajo la Ley N.° 19.628.

PodoCare resuelve este vacío con un sistema que no trata la seguridad como un añadido, sino como parte de la arquitectura base.

---

## Tecnologías y arquitectura

- **Frontend:** [Next.js](https://nextjs.org/) (App Router) con TypeScript, estilizado con Tailwind CSS.
- **Backend / BaaS:** [Supabase](https://supabase.com/), usando:
  - **PostgreSQL** — modelado relacional de los datos clínicos.
  - **Supabase Auth** — autenticación y gestión de roles (`admin`, `podologo`).
  - **Supabase Storage** — almacenamiento seguro de imágenes clínicas.
  - **Row Level Security (RLS)** — control de acceso granular a nivel de fila, aplicado directamente en el motor de base de datos.
- **Contenedores:** Docker y Docker Compose, para reproducibilidad del entorno de desarrollo local.
- **Despliegue:** Vercel (frontend) + Supabase Cloud (backend).

---

## Modelo de datos y seguridad (RLS)

### Tablas principales

| Tabla | Descripción |
|---|---|
| `usuario` | Profesionales y administradores del sistema, con estado activo/inactivo. |
| `paciente` | Datos personales y de contacto del paciente, incluyendo consentimiento informado explícito. |
| `ficha_clinica` | Vínculo único por paciente con sus antecedentes clínicos generales. |
| `atencion` | Registro de cada consulta: diagnóstico CIE-10, nivel de riesgo IWGDF (muy bajo / bajo / moderado / alto), necesidad de derivación y observaciones. |
| `cita` | Agendamiento (estados: agendada, confirmada, en espera, atendida, cancelada, no asiste). |
| `imagen_clinica` | Registros fotográficos de las atenciones, con estimación de área en cm². |
| `derivacion` | Interconsultas a especialistas cuando la atención lo requiere. |
| `log_auditoria` | Bitácora inmutable de operaciones sensibles, para cumplimiento de la Ley N.° 19.628. |
| `organizacion` | Tenant compartido por los profesionales de una misma cuenta o clínica. |

### Multi-tenancy

Cada **organización** representa un tenant. El plan individual crea una organización con un solo profesional; el plan clínica agrupa a varios profesionales dentro de la misma organización, compartiendo pacientes, fichas, agenda, atenciones, derivaciones e imágenes según las políticas RLS.

El plan clínica se justifica por capacidades propias de la organización —administración centralizada, agenda conjunta, reportes agregados y trazabilidad de auditoría compartida— y no es simplemente un conjunto de cuentas individuales agrupadas.

### Políticas Row Level Security (RLS)

- **`paciente` / `ficha_clinica` / `atencion` / `cita` / `imagen_clinica` / `derivacion`**: acceso restringido a los miembros activos de la misma organización.
- **`atencion`**: los profesionales activos pueden leer las atenciones de su organización y registrar/editar únicamente las propias; la eliminación queda reservada al rol `admin`.
- **`paciente`**: el personal clínico puede consultar, ingresar (requiere RUT válido) y actualizar datos de pacientes de su organización.
- **`log_auditoria`**: inserción estricta vía triggers automáticos; sin políticas de `UPDATE` ni `DELETE` — el registro es inmutable por diseño.

---

## Instalación y configuración local

### Requisitos previos

- Node.js v20.9 o superior (se recomienda v22)
- Docker Desktop con Docker Compose, si se ejecutará en contenedor
- Un proyecto de Supabase con el esquema aplicado (ver [`model.md`](model.md) y las migraciones en [`supabase/migrations`](supabase/migrations))

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/MarceloCaballeroo/CAPSTONE.git
   cd CAPSTONE
   ```

2. **Configurar las variables de entorno:**

   Copia `.env.example` como `.env` en la raíz del proyecto.

   ```bash
   # Bash
   cp .env.example .env
   ```
   ```powershell
   # PowerShell
   Copy-Item .env.example .env
   ```

   Edita `.env` con los datos de tu proyecto:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_publica_de_supabase
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   La clave `NEXT_PUBLIC_SUPABASE_ANON_KEY` es apta para el cliente. **Nunca** agregues una clave `service_role` al frontend ni la subas al repositorio.

   Agrega también `NEXT_PUBLIC_SITE_URL` a las URLs de redirección permitidas en **Authentication → URL Configuration** dentro del dashboard de Supabase.

3. **Aplicar las migraciones de base de datos:**

   Antes de probar el registro, aplica las migraciones SQL versionadas en [`supabase/migrations`](supabase/migrations). En particular, `20260902020000_auth_organization_functions.sql` crea:
   - `crear_organizacion_inicial` — crea el tenant y el perfil administrador al registrarse.
   - `invitar_a_organizacion` — permite que un administrador incorpore profesionales a su organización.
   - El trigger `handle_new_user`, que evita crear perfiles sin tenant asociado.

4. **Ejecutar con Docker (recomendado):**

   El contenedor ejecuta Next.js y se conecta directamente al proyecto remoto de Supabase — no se levanta un PostgreSQL local.

   ```bash
   docker compose --env-file .env up --build       # primer plano
   docker compose --env-file .env up --build -d    # segundo plano
   docker compose down                              # detener
   ```

   Abre [http://localhost:3000](http://localhost:3000) cuando el contenedor esté listo.

5. **Ejecutar en modo desarrollo (alternativa sin Docker):**

   ```bash
   npm ci
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

6. **Comandos de verificación:**

   ```bash
   npm run lint
   npm run build
   ```

### Rutas de autenticación

| Ruta | Descripción |
|---|---|
| `/login` | Inicio de sesión. |
| `/register` | Creación de cuenta y organización (individual o clínica). |
| `/register/confirm` | Confirmación de correo pendiente. |
| `/recover-password` | Solicitud de recuperación de contraseña. |
| `/update-password` | Cambio de contraseña desde el enlace recibido por correo. |
| `/auth/confirm` | Callback de Supabase Auth (verifica el token y completa la creación del tenant si corresponde). |

> **Nota interna:** verificar que los nombres de ruta en el código (`src/app/`) coincidan exactamente con esta tabla antes de cada entrega — si el equipo tradujo las rutas del español al inglés (o viceversa) en algún momento, esta sección debe reflejar el estado real del repositorio.

---

## Equipo de trabajo (Squad Scrum)

El proyecto se desarrolla con la metodología ágil **Scrum**, con roles distribuidos así:

| Integrante | Rol Scrum | Responsabilidades |
|---|---|---|
| **Marcelo Ignacio Caballero Olave** | Developer — Seguridad, Datos e Infraestructura | Modelado físico de la base de datos PostgreSQL, políticas RLS, triggers de auditoría, integración de Supabase (Auth, Storage) y despliegue en Vercel/Docker. |
| **Martin Antonio Maldonado Astudillo** | Developer — Frontend y QA | Desarrollo del cliente web en Next.js, implementación de UI/UX y control de calidad. |
| **Emily Catalina Vera Gutiérrez** | Scrum Master / Product Owner | Gestión del backlog, documentación de requerimientos y coordinación directa con el cliente real (podólogo independiente). |

---

## Hitos del proyecto (fases Portafolio)

1. **Fase 1 — Definición y diseño** *(semanas 1-4):* levantamiento de requerimientos con el cliente, modelado de la base de datos relacional y diseño de políticas RLS.
2. **Fase 2 — Desarrollo e implementación** *(semanas 5-12):* implementación iterativa en sprints de 2 semanas de los módulos de autenticación, agenda, ficha clínica, carga de imágenes y bitácora de auditoría.
3. **Fase 3 — Validación, cierre y entrega** *(semanas 13-18):* despliegue del sistema, pruebas de usabilidad y funcionales con el usuario real, y elaboración del informe final de título.
