# Análisis de Errores y Problemas del Proyecto

## 🔴 Problemas Críticos de Seguridad

### 1. Credenciales Expuestas en Código

#### Problema 1.1: Credenciales de MaxPlayGo en Script Python
**Ubicación:** `scripts/sync-maxplaygo.py` (líneas 18-21)

```python
MAXPLAYGO_USERNAME = "BANCA LA"
MAXPLAYGO_PASSWORD = "123456"
SUPABASE_URL = "https://pmmjomdrkcnmdakytlen.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Riesgo:** CRÍTICO
- Las credenciales están hardcodeadas en el código fuente
- Si el repositorio es público, cualquiera puede acceder
- La contraseña es extremadamente débil ("123456")

**Solución:**
1. Mover credenciales a variables de entorno
2. Usar un archivo `.env` (agregado a `.gitignore`)
3. Implementar un sistema de gestión de secretos (ej: AWS Secrets Manager, HashiCorp Vault)

**Código corregido:**
```python
import os
from dotenv import load_dotenv

load_dotenv()

MAXPLAYGO_USERNAME = os.getenv("MAXPLAYGO_USERNAME")
MAXPLAYGO_PASSWORD = os.getenv("MAXPLAYGO_PASSWORD")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
```

---

#### Problema 1.2: Service Role Key Hardcodeada
**Ubicación:** `supabase/functions/create-user/index.ts` (línea 21)

```typescript
Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Riesgo:** CRÍTICO
- La Service Role Key tiene permisos completos en la base de datos
- Está hardcodeada como fallback
- Si se expone, un atacante tiene control total del sistema

**Solución:**
1. Eliminar el fallback hardcodeado
2. Usar solo variables de entorno
3. Lanzar error si la variable no está definida

**Código corregido:**
```typescript
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Sin fallback
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

---

#### Problema 1.3: Credenciales de SOURCES API
**Ubicación:** `supabase/functions/sync-sources-agency/index.ts` (líneas 71-72)

```typescript
username: 'lanavecom',
password: '123456789'
```

**Riesgo:** CRÍTICO
- Credenciales hardcodeadas en Edge Function
- Contraseña débil

**Solución:**
1. Mover a variables de entorno de Supabase
2. Configurar secrets en el dashboard de Supabase

---

### 2. Configuración de TypeScript Muy Permisiva

**Ubicación:** `tsconfig.json`

**Problemas:**
```json
{
  "noImplicitAny": false,
  "strictNullChecks": false,
  "noUnusedParameters": false,
  "noUnusedLocals": false
}
```

**Riesgo:** MEDIO
- Desactiva verificaciones importantes de TypeScript
- Permite código con errores potenciales
- Dificulta el mantenimiento

**Solución:**
1. Habilitar gradualmente verificaciones estrictas
2. Corregir errores existentes
3. Configurar estrictamente para nuevos archivos

**Configuración recomendada:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedParameters": true,
    "noUnusedLocals": true
  }
}
```

---

### 3. CORS Muy Permisivo

**Ubicación:** Edge Functions (múltiples archivos)

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  ...
}
```

**Riesgo:** MEDIO
- Permite requests desde cualquier origen
- Vulnerable a ataques CSRF

**Solución:**
1. Restringir a dominios específicos
2. Usar lista blanca de orígenes permitidos

**Código corregido:**
```typescript
const allowedOrigins = [
  'https://tu-dominio.com',
  'https://localhost:8080'
];

const origin = req.headers.get('origin');
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin : '',
  'Access-Control-Allow-Credentials': 'true',
  ...
}
```

---

## ⚠️ Problemas de Calidad de Código

### 4. Console.logs en Producción

**Ubicación:** Múltiples archivos

**Ejemplos encontrados:**
- `src/hooks/useAuth.ts` (líneas 88, 98, 121, 127)
- `src/components/taquillera/CuadreGeneral.tsx` (líneas 142, 152, 157, 200)
- `src/components/encargada/WeeklyCuadreView.tsx` (línea 68)
- Y muchos más...

**Riesgo:** BAJO
- Expone información sensible en consola del navegador
- Afecta el rendimiento
- Contamina los logs

**Solución:**
1. Usar un sistema de logging apropiado
2. Eliminar console.logs de producción
3. Usar variables de entorno para modo debug

**Implementación recomendada:**
```typescript
// lib/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    console.error(...args); // Siempre loguear errores
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  }
};
```

---

### 5. Manejo de Errores Inconsistente

**Problema:**
- Algunos componentes no manejan errores adecuadamente
- Falta feedback visual para errores en algunos casos
- Errores silenciosos en algunos hooks

**Solución:**
1. Implementar Error Boundaries en React
2. Agregar manejo de errores consistente
3. Mostrar mensajes de error amigables al usuario

---

### 6. Falta de Validación en Algunos Formularios

**Problema:**
- No todos los formularios tienen validación completa
- Algunos campos requeridos no están marcados
- Falta validación de rangos numéricos

**Solución:**
1. Usar Zod schemas para todos los formularios
2. Agregar validación en frontend y backend
3. Mostrar mensajes de error claros

---

## 🐛 Problemas Potenciales

### 7. Race Conditions en useAuth

**Ubicación:** `src/hooks/useAuth.ts`

**Problema:**
- Múltiples llamadas a `fetchProfile` pueden ocurrir simultáneamente
- El estado puede quedar inconsistente

**Solución:**
```typescript
const fetchProfile = async (userId: string) => {
  // Prevenir múltiples llamadas simultáneas
  if (fetchingProfile.current) return;
  fetchingProfile.current = true;
  
  try {
    // ... código existente
  } finally {
    fetchingProfile.current = false;
  }
};
```

---

### 8. Falta de Paginación

**Problema:**
- Algunas consultas pueden traer muchos registros
- No hay paginación en listas grandes
- Puede afectar el rendimiento

**Solución:**
1. Implementar paginación en todas las listas
2. Usar virtualización para listas muy grandes
3. Limitar resultados por defecto

---

### 9. Falta de Tests

**Problema:**
- No hay tests unitarios
- No hay tests de integración
- No hay tests E2E

**Riesgo:** MEDIO
- Dificulta refactorización
- Mayor probabilidad de regresiones

**Solución:**
1. Agregar tests unitarios con Vitest
2. Agregar tests de componentes con React Testing Library
3. Agregar tests E2E con Playwright

---

## 📊 Resumen de Problemas

| Prioridad | Cantidad | Tipo |
|-----------|----------|------|
| 🔴 Crítica | 3 | Seguridad |
| ⚠️ Alta | 2 | Seguridad/Calidad |
| 🟡 Media | 3 | Calidad |
| 🟢 Baja | 1 | Mejora |

---

## ✅ Recomendaciones Prioritarias

### Inmediatas (Esta Semana)

1. **Mover todas las credenciales a variables de entorno**
   - MaxPlayGo credentials
   - SOURCES credentials
   - Service Role Key

2. **Eliminar Service Role Key hardcodeada**
   - Usar solo variables de entorno
   - Lanzar error si no está definida

3. **Restringir CORS**
   - Lista blanca de orígenes permitidos
   - Eliminar `*` como origen permitido

### Corto Plazo (Este Mes)

4. **Eliminar console.logs de producción**
   - Implementar sistema de logging
   - Usar variables de entorno para debug

5. **Mejorar configuración de TypeScript**
   - Habilitar verificaciones estrictas gradualmente
   - Corregir errores existentes

6. **Agregar manejo de errores consistente**
   - Error Boundaries
   - Mensajes de error amigables

### Mediano Plazo (Próximos 3 Meses)

7. **Implementar tests**
   - Tests unitarios
   - Tests de integración
   - Tests E2E

8. **Agregar paginación**
   - En todas las listas grandes
   - Virtualización donde sea necesario

9. **Mejorar validación**
   - Validación completa en formularios
   - Validación en backend también

---

## 🔧 Herramientas Recomendadas

### Seguridad
- **ESLint Security Plugin** - Detectar vulnerabilidades
- **Snyk** - Escaneo de dependencias
- **OWASP ZAP** - Testing de seguridad

### Calidad de Código
- **SonarQube** - Análisis estático
- **Prettier** - Formateo de código
- **Husky** - Git hooks para validación

### Testing
- **Vitest** - Tests unitarios
- **React Testing Library** - Tests de componentes
- **Playwright** - Tests E2E

---

## 📝 Notas Finales

El proyecto tiene una base sólida y una arquitectura bien pensada. Los problemas principales son de seguridad y pueden resolverse rápidamente. Una vez resueltos los problemas críticos, el proyecto estará en buen estado para producción.

**Prioridad de acción:**
1. 🔴 Seguridad (credenciales)
2. ⚠️ Seguridad (CORS, TypeScript)
3. 🟡 Calidad (logging, errores)
4. 🟢 Mejoras (tests, paginación)

---

**Fecha de análisis:** Enero 2025

