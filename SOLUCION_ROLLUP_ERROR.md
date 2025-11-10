# Solución para Error de Rollup en Vercel

## 🔴 Problema

Error al hacer build en Vercel:
```
Error: Cannot find module '@rollup/rollup-linux-x64-gnu'
```

## 🔍 Causa

Rollup necesita binarios nativos específicos para cada plataforma. En Vercel (Linux), necesita `@rollup/rollup-linux-x64-gnu`, pero `--legacy-peer-deps` puede causar que las dependencias opcionales no se instalen correctamente.

## ✅ Solución Aplicada

1. **Simplificado `installCommand`** en `vercel.json`
2. **Removido `postinstall` problemático** de `package.json`
3. **Mantenido `.npmrc` con `legacy-peer-deps`**

## 🚀 Solución Adicional en Vercel Dashboard

Si el error persiste, agrega esta variable de entorno en Vercel Dashboard:

1. Ve a **Settings > Environment Variables**
2. Agrega:
   - **Key:** `NPM_CONFIG_LEGACY_PEER_DEPS`
   - **Value:** `true`
   - **Environments:** Production, Preview, Development
3. **Redeploy**

## 🔧 Alternativa: Forzar Instalación de Opcionales

Si sigue fallando, puedes modificar el `installCommand` en Vercel Dashboard a:

```
npm install --legacy-peer-deps --no-audit
```

O usar:

```
npm ci --legacy-peer-deps --no-audit || npm install --legacy-peer-deps --no-audit
```

## 📝 Nota

El problema es específico de Vercel (Linux). Localmente en Windows funciona porque Rollup usa binarios diferentes. Las dependencias opcionales deberían instalarse automáticamente, pero a veces `--legacy-peer-deps` puede interferir.

## ✅ Verificación

Después de aplicar los cambios, el build debería:
- ✅ Instalar todas las dependencias correctamente
- ✅ Incluir los binarios nativos de Rollup para Linux
- ✅ Completar el build exitosamente

