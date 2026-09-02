**¿Qué se solucionó o implementó?**
[Explica brevemente los cambios de este feature]

**¿Cómo probarlo localmente?**
1. Clona la rama: `git checkout feature/nombre-rama`
2. Configura `.env` con las variables de Supabase.
3. Instala dependencias: `npm ci`
4. Ejecuta las validaciones: `npm run lint` y `npm run build`.
5. Si corresponde, levanta Docker: `docker compose --env-file .env up --build`.

**Issue vinculado**
Closes #<!-- número de Issue -->

**Checklist**
- [ ] Agregué o actualicé pruebas cuando corresponde.
- [ ] No incluí secretos ni archivos `.env`.
- [ ] Documenté cambios de configuración o despliegue.