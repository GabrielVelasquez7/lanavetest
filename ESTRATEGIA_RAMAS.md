# Estrategia de Ramas para Lovable y Vercel

## 🎯 Situación Actual

Tienes dos plataformas conectadas al mismo repositorio:
- **Lovable** - Usa la rama `main` (sin configuración de Vercel)
- **Vercel** - Usa la rama `vercel` (con configuración específica de Vercel)

## ✅ Solución Aplicada

Se separaron las configuraciones para evitar conflictos:

### Rama `main` (Para Lovable)
- ✅ Correcciones de seguridad aplicadas
- ✅ Sin binarios nativos de Linux
- ✅ Sin `vercel.json`
- ✅ Sin `.npmrc` específico de Vercel
- ✅ Compatible con el entorno de Lovable

### Rama `vercel` (Para Vercel)
- ✅ Todas las correcciones de seguridad
- ✅ Binarios nativos de Linux (`@rollup/rollup-linux-x64-gnu`, `@esbuild/linux-x64`, `@swc/core-linux-x64-gnu`)
- ✅ `vercel.json` con configuración de build
- ✅ `.npmrc` con `legacy-peer-deps`
- ✅ `.vercelignore` para optimizar despliegues

---

## 🔄 Flujo de Trabajo Recomendado

### Desarrollo Normal (En Lovable)

```bash
# Trabajar en main
git checkout main
git pull origin main

# Hacer cambios
# ... editar archivos ...

# Commit y push
git add .
git commit -m "feat: Nueva funcionalidad"
git push origin main

# ✅ Lovable se actualiza automáticamente
```

### Cuando Necesites Usar Vercel

```bash
# 1. Asegúrate de tener los últimos cambios de main
git checkout main
git pull origin main

# 2. Cambiar a rama vercel
git checkout vercel

# 3. Traer cambios de main a vercel
git merge main

# 4. Push a vercel
git push origin vercel

# ✅ Vercel se actualiza automáticamente
```

### Sincronizar Correcciones de Seguridad

Si aplicas correcciones de seguridad en `main`, también debes aplicarlas en `vercel`:

```bash
# Desde main
git checkout main
# ... aplicar correcciones ...
git commit -m "fix: Corrección de seguridad"
git push origin main

# Aplicar en vercel también
git checkout vercel
git merge main
git push origin vercel
```

---

## 📋 Configuración de Vercel

### En Vercel Dashboard:

1. Ve a **Settings** > **Git**
2. Verifica que la rama de producción esté configurada como `vercel`
3. Si no, cámbiala a `vercel`

**Importante:** Vercel debe usar la rama `vercel`, no `main`, porque `main` no tiene los binarios nativos de Linux ni la configuración necesaria.

---

## 🚨 Resolver Conflictos

Si hay conflictos al hacer merge de `main` → `vercel`:

```bash
git checkout vercel
git merge main

# Si hay conflictos, resolverlos manualmente
# Los archivos que pueden tener conflictos:
# - package.json (binarios de Linux solo en vercel)
# - vercel.json (solo existe en vercel)
# - .npmrc (solo existe en vercel)

# Después de resolver:
git add .
git commit -m "merge: Integrar cambios de main"
git push origin vercel
```

---

## 📝 Archivos Específicos por Rama

### Solo en `vercel`:
- `vercel.json` - Configuración de Vercel
- `.npmrc` - Configuración npm para Vercel
- `.vercelignore` - Archivos a ignorar en Vercel
- Binarios nativos de Linux en `package.json`:
  - `@rollup/rollup-linux-x64-gnu`
  - `@esbuild/linux-x64`
  - `@swc/core-linux-x64-gnu`

### En ambas ramas:
- Correcciones de seguridad en `supabase/functions/`
- Código fuente de la aplicación
- Configuración de Vite (sin build específico de Vercel en `main`)

---

## ✅ Ventajas de Esta Estrategia

1. **Lovable funciona correctamente** - Sin binarios de Linux que causan problemas
2. **Vercel funciona correctamente** - Con todos los binarios y configuraciones necesarias
3. **Sin conflictos** - Cada plataforma usa su rama específica
4. **Flexibilidad** - Puedes trabajar en Lovable normalmente y usar Vercel cuando lo necesites

---

## 💡 Mejores Prácticas

### Para Desarrollo Diario
- ✅ Trabaja siempre en `main`
- ✅ Usa Lovable para desarrollo normal
- ✅ Solo cambia a `vercel` cuando necesites desplegar en Vercel

### Para Despliegues en Vercel
- ✅ Sincroniza `main` → `vercel` antes de desplegar
- ✅ Verifica que el build funcione en Vercel
- ✅ No edites directamente en `vercel` (mejor editar en `main` y luego merge)

### Para Correcciones de Seguridad
- ✅ Aplica en `main` primero
- ✅ Luego merge a `vercel`
- ✅ Mantén ambas ramas sincronizadas en seguridad

---

## 🔍 Verificar Estado

### Ver qué rama estás usando:
```bash
git branch
```

### Ver diferencias entre ramas:
```bash
# Ver qué tiene vercel que main no tiene
git diff main..vercel

# Ver qué tiene main que vercel no tiene
git diff vercel..main
```

### Ver commits únicos de cada rama:
```bash
# Commits en vercel que no están en main
git log main..vercel

# Commits en main que no están en vercel
git log vercel..main
```

---

## 📌 Resumen

- **`main`**: Para Lovable, sin configuración de Vercel
- **`vercel`**: Para Vercel, con toda la configuración necesaria
- **Flujo**: Desarrolla en `main`, cuando necesites Vercel, merge `main` → `vercel`
- **Seguridad**: Mantén ambas ramas sincronizadas en correcciones de seguridad

---

**Esta estrategia te permite usar Lovable normalmente y tener Vercel como respaldo cuando lo necesites, sin conflictos entre plataformas.**
