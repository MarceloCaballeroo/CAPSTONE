---
applyTo: "src/components/**,src/features/**,src/layouts/**,src/app/**/page.tsx"
---
- Reutilizar `components/common` (Button, Input, Card, Alert) antes de crear componentes nuevos.
- Formularios con Server Action + `useActionState` + zod (patrón de `RegistroForm`).
- Tailwind con la paleta actual (slate/teal). Accesibilidad: labels, `role="alert"`, `aria-*`.
- Los componentes cliente no consultan tablas clínicas directamente: eso va por Server Actions.