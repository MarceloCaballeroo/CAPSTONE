# PodoCare — Sistema de Gestión Clínica para Consultas de Podología

**PodoCare** es una plataforma web de gestión clínica diseñada específicamente para consultas de podología independiente en Chile [11, 13]. Su propósito fundamental es digitalizar la ficha clínica del paciente, automatizar el agendamiento de citas, realizar el seguimiento de atenciones utilizando estándares clínicos (como CIE-10 e IWGDF) y garantizar la trazabilidad y protección de datos sensibles en cumplimiento con la Ley N.° 19.628 de Protección de la Vida Privada [13, 14].

Este proyecto se desarrolla en el marco de la asignatura **Capstone (Portafolio de Título)** de la carrera de **Ingeniería en Informática** en **Duoc UC, Sede Plaza Vespucio** [10, 40].

---

## 📋 Contexto y Problemática

En Chile, se estima que entre el **60% y el 70% de las consultas de podología independiente** —principalmente negocios unipersonales o de equipos de 1 a 2 profesionales— siguen gestionando sus fichas y registros en papel o plantillas de Excel convencionales [13]. Esta práctica informal genera múltiples problemas [13]:
1. **Pérdida de trazabilidad clínica:** Dificultad para hacer seguimiento de tratamientos a largo plazo (por ejemplo, el control de pie de riesgo u onicocriptosis) [13].
2. **Riesgo Operacional y de Gestión:** Ineficiencias en el agendamiento y coordinación de citas [13].
3. **Vulnerabilidad Legal:** Los datos médicos se clasifican como datos sensibles. Al no contar con almacenamiento seguro ni controles de acceso adecuados, los profesionales quedan expuestos a sanciones de acuerdo con la **Ley N.° 19.628 de Protección de Datos Personales** [13].

**PodoCare** resuelve este vacío al proporcionar un sistema robusto que no trata la seguridad como un añadido, sino como parte de la arquitectura base [13].

---

## 🛠️ Tecnologías y Arquitectura

La solución está construida con un stack moderno, enfocado en rendimiento, seguridad y portabilidad [13, 17]:

- **Frontend:** [Next.js](https://nextjs.org/) (App Router) con TypeScript, estilizado mediante Tailwind CSS [13, 21, 52].
- **Backend & Backend-as-a-Service:** [Supabase](https://supabase.com/), aprovechando:
  - **PostgreSQL:** Base de datos relacional para el modelado estructurado de datos clínicos [13].
  - **Supabase Auth:** Autenticación segura y gestión de roles de usuario (Administrador y Clínico) [13, 17].
  - **Supabase Storage:** Almacenamiento seguro de imágenes clínicas [13, 17].
  - **Row Level Security (RLS):** Control de acceso granular a nivel de fila directamente en el motor de base de datos [13, 14].
- **Contenedores:** Docker y Docker Compose para asegurar la reproducibilidad del entorno de desarrollo local [17, 21].
- **Despliegue:** Configurado para desplegarse fácilmente en Vercel (Frontend) y en la nube de Supabase [13, 17].

---

## 🗃️ Modelo de Datos y Seguridad (RLS)

La base de datos cuenta con un esquema relacional diseñado para preservar la privacidad de los pacientes y auditar rigurosamente cada acción [13].

### Tablas Principales
- **`usuario`**: Registro de usuarios del sistema (clínicos y administradores) con control de estado activo/inactivo [1, 31].
- **`paciente`**: Información personal y datos de contacto de los pacientes, incluyendo consentimiento informado explícito [1, 31].
- **`ficha_clinica`**: Vínculo único por paciente que contiene antecedentes clínicos generales [2, 32].
- **`atencion`**: Registro estructurado de cada consulta médica que incluye diagnóstico codificado por **CIE-10**, clasificación de nivel de riesgo según la escala internacional **IWGDF** (muy bajo, bajo, moderado, alto), necesidad de derivación y observaciones [2, 4, 32, 34].
- **`cita`**: Gestión del agendamiento (estados: agendada, confirmada, en espera, atendida, cancelada, no asiste) [2, 4, 32, 34].
- **`imagen_clinica`**: Registros fotográficos de las atenciones podológicas almacenados de forma segura con estimación de área en cm² [3, 33].
- **`derivacion`**: Gestión de interconsultas a especialistas cuando se requiere derivación [3, 33].
- **`log_auditoria`**: Bitácora centralizada que registra de forma inmutable todas las operaciones sensibles en el sistema para garantizar el cumplimiento de la Ley N.° 19.628 [3, 13, 33].

### Multi-tenancy

Cada **organización** representa un tenant. El plan individual crea una organización con un profesional; el plan clínica agrupa a varios profesionales en la misma organización. Los integrantes activos comparten pacientes, fichas, agenda, atenciones, derivaciones e imágenes según las políticas RLS.

El plan clínica se justifica por capacidades compartidas de la organización, como administración centralizada, agenda conjunta, reportes agregados y trazabilidad de auditoría; no es solamente un conjunto de cuentas individuales.

### Políticas Row Level Security (RLS)
Para garantizar la confidencialidad de la información de salud de los pacientes, se han implementado políticas estrictas de RLS en PostgreSQL [13]. Algunos ejemplos clave son:
- **`ficha_clinica`**: Lectura permitida para personal autenticado; actualización de antecedentes exclusiva para clínicos activos [4, 34].
- **`atencion`**: Los clínicos activos pueden leer atenciones del centro y registrar/editar únicamente sus propias atenciones; la eliminación queda reservada exclusivamente para el rol Administrador [8, 38].
- **`paciente`**: El personal clínico puede consultar, ingresar (requiere RUT válido) y actualizar datos de pacientes [9, 39].
- **`log_auditoria`**: Inserción estricta mediante triggers automáticos de base de datos para registrar accesos o mutaciones en los registros [7, 17, 37].

---

## 🚀 Instalación y Configuración Local

### Requisitos Previos
- Node.js v20.9 o superior (se recomienda v22)
- Docker Desktop con Docker Compose, si se ejecutará en un contenedor [17, 21]
- Un proyecto de Supabase con sus tablas, enums y políticas RLS configurados según [`model.md`](model.md)

### Pasos para Configurar el Proyecto

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/MarceloCaballeroo/CAPSTONE.git
   cd CAPSTONE
   ```

2. **Configurar las Variables de Entorno:**
  Copia el archivo `.env.example` como `.env` en la raíz del proyecto.

  En Bash:
  ```bash
  cp .env.example .env
  ```

  En PowerShell:
  ```powershell
  Copy-Item .env.example .env
  ```

  Edita `.env` y reemplaza los valores de ejemplo con los datos de tu proyecto:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_publica_de_supabase
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```

  La clave `NEXT_PUBLIC_SUPABASE_ANON_KEY` es apta para el cliente. Nunca agregues una clave `service_role` al frontend ni la subas al repositorio.
  Agrega `NEXT_PUBLIC_SITE_URL` en las URLs de redirección de **Authentication > URL Configuration** en Supabase.

3. **Ejecutar con Docker (Recomendado):**
  El contenedor ejecuta Next.js y se conecta directamente al proyecto remoto de Supabase. No se levanta un PostgreSQL local.

  ```bash
  docker compose --env-file .env up --build
  ```

  Para ejecutar en segundo plano:
  ```bash
  docker compose --env-file .env up --build -d
  ```

  Para detener el contenedor:
  ```bash
  docker compose down
  ```

  Abre [http://localhost:3000](http://localhost:3000) cuando el contenedor indique que está listo.

4. **Ejecutar Localmente en Modo Desarrollo:**
   Si prefieres ejecutar el servidor de desarrollo de Next.js directamente [22, 52]:
   ```bash
  npm ci
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación [22, 52].

5. **Comandos de verificación:**
  ```bash
  npm run lint
  npm run build
  ```

### Rutas de autenticación

- `/login`: inicio de sesión.
- `/registro`: creación de cuenta y organización individual o clínica.
- `/registro/confirmar`: confirmación de correo pendiente.
- `/recuperar-password`: solicitud de recuperación.
- `/actualizar-password`: cambio de contraseña desde el enlace recibido.
- `/auth/confirm`: callback de Supabase Auth.

Antes de probar el registro, aplica las migraciones SQL versionadas en
[`supabase/migrations`](supabase/migrations). La función
`crear_organizacion_inicial` crea el tenant y el perfil administrador después
del registro en Supabase Auth.

---

## 👥 Equipo de Trabajo (Squad Scrum)

El proyecto es desarrollado utilizando la metodología ágil **Scrum** con roles distribuidos de la siguiente manera [15, 45]:

- **Emily Catalina Vera Gutierrez** — *Scrum Master / Product Owner* [25, 55]
  - Responsable de la gestión del backlog, documentación de requerimientos y coordinación directa con el cliente real (podólogo independiente) [15, 25, 45, 55].
- **Marcelo Ignacio Caballero Olave** — *Developer (Infraestructura y Despliegue)* [25, 55]
  - Responsable de la integración de Supabase (Auth, Storage), despliegue en Vercel y configuración de contenedores Docker [15, 25, 45, 55].
- **Martin Antonio Maldonado Astudillo** — *Developer (Frontend y QA)* [25, 55]
  - Responsable del desarrollo del cliente web en Next.js, implementación de la UI/UX y control de calidad [15, 25, 45, 55].
- **Nova** — *Developer (Seguridad y Datos)* [25, 55]
  - Responsable del modelado físico de la base de datos PostgreSQL, diseño de triggers de auditoría y políticas de Row Level Security (RLS) [25, 55].

---

## 📅 Hitos del Proyecto (Fases Portafolio)

El proyecto está planificado para ajustarse a las fases del semestre académico [13, 18, 48]:

1. **Fase 1: Definición y Diseño (Semanas 1-4):** Levantamiento de requerimientos con el cliente, modelado de la base de datos relacional y diseño de políticas RLS [17, 18, 47, 48].
2. **Fase 2: Desarrollo e Implementación (Semanas 5-12):** Implementación iterativa en sprints de 2 semanas de los módulos de autenticación, agenda, ficha clínica, carga de imágenes y bitácora de auditoría [15, 17, 18, 45, 47, 48].
3. **Fase 3: Validación, Cierre y Entrega (Semanas 13-18):** Despliegue del sistema, pruebas de usabilidad y funcionales con el usuario real, y elaboración del informe final de título [17, 18, 47, 48].
