# Comandos para Sincronizar Cambios con GitHub

## 📋 Estado Actual

Tienes cambios locales que no están en GitHub. Aquí están los comandos para sincronizarlos.

---

## 🚀 Opción 1: Sincronizar Todo (Recomendado)

```bash
# 1. Agregar todos los archivos modificados y nuevos
git add .

# 2. Hacer commit con un mensaje descriptivo
git commit -m "feat: Aplicar correcciones de seguridad y preparar para Vercel

- Eliminar Service Role Key hardcodeada
- Restringir CORS en Edge Functions
- Agregar validación de variables de entorno
- Configurar proyecto para despliegue en Vercel
- Agregar documentación completa del proyecto"

# 3. Subir cambios a GitHub
git push origin main
```

---

## 🎯 Opción 2: Sincronizar por Categorías

Si prefieres hacer commits separados por tipo de cambio:

### Correcciones de Seguridad
```bash
git add supabase/functions/create-user/index.ts
git add supabase/functions/sync-sources-agency/index.ts
git commit -m "fix: Aplicar correcciones de seguridad en Edge Functions

- Eliminar Service Role Key hardcodeada
- Restringir CORS a orígenes específicos
- Agregar validación de variables de entorno"
git push origin main
```

### Configuración para Vercel
```bash
git add vercel.json
git add .vercelignore
git add vite.config.ts
git add src/integrations/supabase/client.ts
git commit -m "feat: Configurar proyecto para despliegue en Vercel

- Agregar configuración de Vercel
- Hacer lovable-tagger opcional
- Usar variables de entorno para Supabase"
git push origin main
```

### Documentación
```bash
git add DOCUMENTACION.md
git add ANALISIS_ERRORES.md
git add CORRECCIONES_APLICADAS.md
git add OPINION_PROYECTO.md
git add GUIA_DESPLIEGUE_VERCEL.md
git commit -m "docs: Agregar documentación completa del proyecto

- Documentación técnica completa
- Análisis de errores y problemas
- Guía de despliegue en Vercel
- Opinión y evaluación del proyecto"
git push origin main
```

---

## 🔍 Verificar Cambios Antes de Hacer Commit

### Ver qué archivos cambiaron
```bash
git status
```

### Ver los cambios específicos en un archivo
```bash
git diff src/integrations/supabase/client.ts
```

### Ver resumen de cambios
```bash
git diff --stat
```

---

## ⚠️ Si Algo Sale Mal

### Deshacer cambios en un archivo (antes de commit)
```bash
git restore nombre-del-archivo.ts
```

### Deshacer todos los cambios (antes de commit)
```bash
git restore .
```

### Deshacer el último commit (mantener cambios)
```bash
git reset --soft HEAD~1
```

### Deshacer el último commit (eliminar cambios)
```bash
git reset --hard HEAD~1
```

---

## 📝 Notas Importantes

1. **Los cambios NO se sincronizan automáticamente** - Debes hacer commit y push manualmente

2. **Si usas Lovable** - Los cambios que hagas aquí se sincronizarán con Lovable cuando hagas push

3. **Si despliegas en Vercel** - Después del push, Vercel detectará los cambios y desplegará automáticamente (si tienes auto-deploy configurado)

4. **Revisa los cambios** antes de hacer commit para asegurarte de que todo está correcto

---

## ✅ Checklist Antes de Hacer Push

- [ ] Revisar los cambios con `git diff`
- [ ] Verificar que no hay errores de linting
- [ ] Probar que el proyecto funciona localmente (`npm run dev`)
- [ ] Hacer commit con mensaje descriptivo
- [ ] Hacer push a GitHub

---

## 🎯 Comandos Rápidos (Todo en Uno)

```bash
# Ver estado
git status

# Agregar todo
git add .

# Commit
git commit -m "feat: Correcciones de seguridad y configuración para Vercel"

# Push
git push origin main
```

---

**¿Listo para sincronizar?** Ejecuta los comandos de la Opción 1 para subir todos los cambios de una vez.

