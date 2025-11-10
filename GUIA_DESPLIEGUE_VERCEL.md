# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar el proyecto en Vercel, separándolo completamente de Lovable.

---

## ✅ Compatibilidad

**Sí, el proyecto es completamente compatible con Vercel.** Es una aplicación Vite + React estándar que Vercel soporta nativamente.

---

## 📋 Requisitos Previos

1. **Cuenta de Vercel** - Crea una en [vercel.com](https://vercel.com)
2. **Repositorio Git** - El proyecto debe estar en GitHub, GitLab o Bitbucket
3. **Variables de entorno** - Necesitarás las credenciales de Supabase

---

## 🚀 Pasos para Desplegar

### 1. Preparar el Proyecto Localmente

Ya se han hecho los siguientes cambios automáticamente:
- ✅ Creado `vercel.json` con configuración
- ✅ Actualizado `vite.config.ts` para remover dependencia de Lovable en producción
- ✅ Actualizado `client.ts` para usar variables de entorno
- ✅ Creado `.vercelignore`

### 2. Configurar Variables de Entorno

Antes de desplegar, necesitas configurar las variables de entorno en Vercel:

**Variables requeridas:**
- `VITE_SUPABASE_URL` = `https://pmmjomdrkcnmdakytlen.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = [Tu anon key de Supabase]

**Cómo configurarlas:**

#### Opción A: Desde el Dashboard de Vercel
1. Ve a tu proyecto en Vercel
2. Settings > Environment Variables
3. Agrega las variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Selecciona los ambientes (Production, Preview, Development)

#### Opción B: Desde la CLI
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### 3. Desplegar en Vercel

#### Opción A: Desde GitHub (Recomendado)

1. **Conectar repositorio:**
   - Ve a [vercel.com/new](https://vercel.com/new)
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Vite

2. **Configurar proyecto:**
   - Framework Preset: **Vite** (debería detectarse automáticamente)
   - Build Command: `npm run build` (ya configurado en vercel.json)
   - Output Directory: `dist` (ya configurado en vercel.json)
   - Install Command: `npm install` (por defecto)

3. **Agregar variables de entorno:**
   - En la pantalla de configuración, agrega las variables de entorno
   - O hazlo después en Settings > Environment Variables

4. **Deploy:**
   - Click en "Deploy"
   - Espera a que termine el build
   - ¡Listo! Tu app estará en `tu-proyecto.vercel.app`

#### Opción B: Desde la CLI

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Login
vercel login

# Desplegar (primera vez)
vercel

# Desplegar a producción
vercel --prod
```

---

## 🔧 Configuración Adicional

### Actualizar CORS en Edge Functions

Después de desplegar, necesitas actualizar los orígenes permitidos en tus Edge Functions de Supabase:

1. Ve a `supabase/functions/create-user/index.ts`
2. Actualiza `ALLOWED_ORIGINS`:
```typescript
const ALLOWED_ORIGINS = [
  'https://tu-proyecto.vercel.app', // Tu dominio de Vercel
  'https://bdd3ec42-db8e-4092-9bdf-a0870d4f520c.lovableproject.com', // Si quieres mantener Lovable
  'https://localhost:8080',
  'http://localhost:8080',
  'http://localhost:5173',
]
```

3. Haz lo mismo en `supabase/functions/sync-sources-agency/index.ts`
4. Redespliega las Edge Functions:
```bash
supabase functions deploy create-user
supabase functions deploy sync-sources-agency
```

### Dominio Personalizado (Opcional)

1. Ve a tu proyecto en Vercel Dashboard
2. Settings > Domains
3. Agrega tu dominio personalizado
4. Sigue las instrucciones para configurar DNS

---

## 📝 Archivos de Configuración Creados

### `vercel.json`
Configuración principal de Vercel:
- Build command
- Output directory
- Rewrites para SPA (Single Page Application)
- Headers de cache para assets

### `.vercelignore`
Archivos que Vercel ignorará al desplegar (reduce tamaño del deploy)

### Cambios en `vite.config.ts`
- Removida dependencia obligatoria de `lovable-tagger`
- Ahora es opcional y solo en desarrollo
- Configuración de build optimizada

### Cambios en `src/integrations/supabase/client.ts`
- Ahora usa variables de entorno
- Mantiene valores por defecto para desarrollo local

---

## 🧪 Probar el Despliegue

### 1. Verificar Build Local

```bash
npm run build
npm run preview
```

Esto debería construir y servir la app localmente. Si funciona, debería funcionar en Vercel.

### 2. Verificar Variables de Entorno

En Vercel Dashboard:
- Settings > Environment Variables
- Verifica que todas las variables estén configuradas
- Asegúrate de que estén en Production, Preview y Development

### 3. Verificar Funcionalidad

Después del deploy:
- ✅ La app carga correctamente
- ✅ El login funciona
- ✅ Las peticiones a Supabase funcionan
- ✅ No hay errores en la consola

---

## 🔄 Actualizar Despliegue

### Automático (Recomendado)
Si conectaste GitHub:
- Cada push a `main` despliega automáticamente a producción
- Cada push a otras ramas crea un preview deployment

### Manual
```bash
vercel --prod
```

---

## 🐛 Troubleshooting

### Error: "Environment variable not found"
**Solución:** Asegúrate de agregar las variables en Vercel Dashboard > Settings > Environment Variables

### Error: "Build failed"
**Solución:**
1. Revisa los logs en Vercel Dashboard
2. Prueba construir localmente: `npm run build`
3. Verifica que todas las dependencias estén en `package.json`

### Error: "CORS policy"
**Solución:** Actualiza `ALLOWED_ORIGINS` en las Edge Functions con tu dominio de Vercel

### La app carga pero no funciona
**Solución:**
1. Abre DevTools > Console
2. Verifica errores de red
3. Verifica que las variables de entorno estén correctas
4. Revisa que Supabase esté accesible

---

## 📊 Comparación: Lovable vs Vercel

| Característica | Lovable | Vercel |
|---------------|---------|--------|
| Despliegue automático | ✅ | ✅ |
| Variables de entorno | ✅ | ✅ |
| Dominio personalizado | ✅ | ✅ |
| Preview deployments | ✅ | ✅ |
| Control total del código | ⚠️ Limitado | ✅ Completo |
| Costo | Depende del plan | Gratis (hobby) |
| Integración con Git | ✅ | ✅ |
| Edge Functions | ❌ | ✅ (con Supabase) |

---

## 💡 Recomendaciones

### Para Desarrollo
- Usa **Preview Deployments** para probar cambios antes de producción
- Configura **Environment Variables** para cada ambiente (dev, preview, prod)

### Para Producción
- Usa un **dominio personalizado**
- Configura **monitoreo** (ej: Sentry)
- Habilita **analytics** en Vercel
- Configura **backups** de Supabase

### Seguridad
- ✅ Variables de entorno en Vercel (no en código)
- ✅ CORS restringido en Edge Functions
- ✅ Service Role Key solo en Supabase secrets
- ⚠️ Considera usar un CDN para assets estáticos

---

## 🎯 Próximos Pasos

1. ✅ Desplegar en Vercel
2. ✅ Configurar variables de entorno
3. ✅ Actualizar CORS en Edge Functions
4. ⏭️ Configurar dominio personalizado (opcional)
5. ⏭️ Configurar monitoreo y analytics
6. ⏭️ Configurar CI/CD para tests automáticos

---

## 📞 Soporte

- **Documentación de Vercel:** https://vercel.com/docs
- **Documentación de Vite:** https://vitejs.dev
- **Documentación de Supabase:** https://supabase.com/docs

---

**¡Listo para desplegar!** 🚀

Si encuentras algún problema, revisa los logs en Vercel Dashboard o los errores en la consola del navegador.

