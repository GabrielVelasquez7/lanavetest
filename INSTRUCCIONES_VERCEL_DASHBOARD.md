# Instrucciones para Configurar Vercel Dashboard

## 🔴 Problema Actual

Vercel está usando `npm install` en lugar de `npm install --legacy-peer-deps`, causando que el build falle.

## ✅ Solución: Configurar en Vercel Dashboard

Aunque tenemos `vercel.json` configurado, **Vercel Dashboard puede sobrescribir esta configuración**. Sigue estos pasos:

### Paso 1: Ir a Settings del Proyecto

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `lanavetest`
3. Click en **Settings** (en el menú superior)

### Paso 2: Configurar Build & Development Settings

1. En el menú lateral, click en **Build & Development Settings**
2. Busca la sección **Build Command**
3. Busca la sección **Install Command**

### Paso 3: Configurar Install Command

En **Install Command**, cambia de:
```
npm install
```

A:
```
npm install --legacy-peer-deps
```

O déjalo vacío para que use el `vercel.json` (que ya tiene la configuración correcta).

### Paso 4: Agregar Variable de Entorno (Alternativa/Adicional)

1. En Settings, click en **Environment Variables**
2. Agrega una nueva variable:
   - **Key:** `NPM_CONFIG_LEGACY_PEER_DEPS`
   - **Value:** `true`
   - **Environments:** Selecciona todos (Production, Preview, Development)
3. Click en **Save**

### Paso 5: Hacer Redeploy

1. Ve a la pestaña **Deployments**
2. Encuentra el deployment que falló
3. Click en los tres puntos (...) > **Redeploy**
4. O simplemente haz un nuevo push a la rama `vercel`

## 📝 Explicación de los Dos URLs

- **`lanavetest-git-vercel-...`** - Este es un **Preview Deployment** de la rama `vercel` (funciona porque probablemente tiene configuración diferente o es más permisivo)
- **`lanavetest-93wsgnf84-...`** - Este es el **Production Deployment** (falla porque usa configuración estricta)

## 🎯 Solución Rápida

La forma más rápida de solucionarlo:

1. **Ve a Vercel Dashboard > Tu Proyecto > Settings > Environment Variables**
2. **Agrega:** `NPM_CONFIG_LEGACY_PEER_DEPS` = `true`
3. **Redeploy** el deployment que falla

Esto forzará a npm a usar `--legacy-peer-deps` en todos los builds, sin importar la configuración del dashboard.

## ✅ Verificación

Después de configurar, el próximo build debería:
- ✅ Usar `npm install --legacy-peer-deps` (o respetar el .npmrc)
- ✅ Instalar todas las dependencias correctamente
- ✅ Completar el build exitosamente

---

**Nota:** Si después de esto sigue fallando, puede ser que necesites verificar que el `.npmrc` esté siendo leído correctamente. En ese caso, la variable de entorno es la solución más confiable.

