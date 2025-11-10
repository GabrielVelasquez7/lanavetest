# Solución Final para Error de Rollup en Vercel

## 🔴 Problema

```
Error: Cannot find module '@rollup/rollup-linux-x64-gnu'
```

Rollup necesita binarios nativos específicos para cada plataforma. En Vercel (Linux), necesita `@rollup/rollup-linux-x64-gnu`, pero no se está instalando.

## ✅ Solución: Variable de Entorno en Vercel

**Esta es la solución más confiable.** Agrega esta variable de entorno en Vercel Dashboard:

### Pasos:

1. Ve a **Vercel Dashboard** > Tu Proyecto > **Settings**
2. Click en **Environment Variables**
3. Agrega:
   - **Key:** `NPM_CONFIG_LEGACY_PEER_DEPS`
   - **Value:** `true`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development
4. Click en **Save**
5. Ve a **Deployments** y haz **Redeploy** del deployment que falla

## 🔧 Alternativa: Modificar installCommand en Vercel Dashboard

Si la variable de entorno no funciona:

1. Ve a **Settings > Build & Development Settings**
2. En **Install Command**, cambia a:
   ```
   npm install --legacy-peer-deps --no-audit --fund=false
   ```
3. Guarda y redeploy

## 📝 Explicación

El problema es que `--legacy-peer-deps` puede causar que npm no instale correctamente las dependencias opcionales (como los binarios nativos de Rollup). 

La variable de entorno `NPM_CONFIG_LEGACY_PEER_DEPS=true` asegura que:
- npm use `--legacy-peer-deps` automáticamente
- Las dependencias opcionales se instalen correctamente
- Los binarios nativos se descarguen para la plataforma correcta (Linux en Vercel)

## ✅ Verificación

Después de agregar la variable de entorno y hacer redeploy:
- ✅ npm instalará todas las dependencias correctamente
- ✅ Los binarios nativos de Rollup se instalarán para Linux
- ✅ El build debería completarse exitosamente

---

**Nota:** Esta solución es más confiable que modificar `vercel.json` porque Vercel Dashboard puede sobrescribir la configuración del archivo.

