# Documentación del Proyecto - Sistema de Gestión de Agencias de Lotería

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Tecnologías Utilizadas](#tecnologías-utilizadas)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Roles y Permisos](#roles-y-permisos)
6. [Funcionalidades Principales](#funcionalidades-principales)
7. [Base de Datos](#base-de-datos)
8. [Configuración e Instalación](#configuración-e-instalación)
9. [Scripts y Automatización](#scripts-y-automatización)
10. [API y Edge Functions](#api-y-edge-functions)
11. [Seguridad](#seguridad)
12. [Desarrollo](#desarrollo)

---

## 📖 Descripción General

Este es un sistema completo de gestión para agencias de lotería y apuestas que permite:

- **Gestión diaria de transacciones** (ventas, premios, gastos)
- **Cuadres diarios y semanales** por agencia
- **Sincronización automática** con sistemas externos (MaxPlayGo, SOURCES)
- **Gestión de empleados y nómina semanal**
- **Control de préstamos y deudas inter-agencias**
- **Reportes y análisis** de ganancias por sistema y agencia

El sistema está diseñado para tres tipos de usuarios con diferentes niveles de acceso y responsabilidades.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Taquillera  │  │  Encargada   │  │  Administrador│    │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (Backend as a Service)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │ Edge Functions│  │  Auth        │     │
│  │  Database    │  │  (Deno)      │  │  (JWT)       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Sincronización
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Sistemas Externos                               │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  MaxPlayGo   │  │  SOURCES     │                        │
│  │  (Web Scraping)│  │  (API)      │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18.3.1** - Biblioteca de UI
- **TypeScript 5.8.3** - Tipado estático
- **Vite 5.4.19** - Build tool y dev server
- **React Router DOM 6.30.1** - Enrutamiento
- **TanStack Query 5.83.0** - Gestión de estado del servidor
- **React Hook Form 7.61.1** - Manejo de formularios
- **Zod 3.25.76** - Validación de esquemas
- **shadcn/ui** - Componentes UI (basado en Radix UI)
- **Tailwind CSS 3.4.17** - Estilos
- **Recharts 2.15.4** - Gráficos y visualizaciones
- **date-fns 4.1.0** - Manipulación de fechas

### Backend
- **Supabase** - BaaS (Backend as a Service)
  - PostgreSQL - Base de datos relacional
  - Edge Functions (Deno) - Funciones serverless
  - Auth - Autenticación y autorización
  - Row Level Security (RLS) - Seguridad a nivel de fila

### Scripts y Automatización
- **Python 3** - Scripts de scraping
- **Selenium** - Automatización de navegador
- **Puppeteer Core** - Alternativa para scraping

---

## 📁 Estructura del Proyecto

```
lanavetest/
├── src/
│   ├── components/
│   │   ├── admin/              # Componentes del dashboard de administrador
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AgenciesCrud.tsx
│   │   │   ├── SystemsCrud.tsx
│   │   │   ├── UsersCrud.tsx
│   │   │   └── weekly/         # Componentes de cuadres semanales
│   │   ├── encargada/          # Componentes del dashboard de encargada
│   │   │   ├── EncargadaDashboard.tsx
│   │   │   ├── EncargadaSidebar.tsx
│   │   │   ├── CuadreGeneralEncargada.tsx
│   │   │   ├── WeeklyCuadreView.tsx
│   │   │   ├── EmployeesCrud.tsx
│   │   │   └── weekly/         # Componentes de cuadres semanales
│   │   ├── taquillera/         # Componentes del dashboard de taquillera
│   │   │   ├── TaquilleraDashboard.tsx
│   │   │   ├── SalesForm.tsx
│   │   │   ├── PrizesForm.tsx
│   │   │   ├── GastosManager.tsx
│   │   │   ├── CuadreGeneral.tsx
│   │   │   └── ...
│   │   ├── auth/               # Componentes de autenticación
│   │   │   └── AuthLayout.tsx
│   │   └── ui/                 # Componentes UI reutilizables (shadcn)
│   ├── contexts/
│   │   └── AuthContext.tsx     # Contexto de autenticación
│   ├── hooks/
│   │   ├── useAuth.ts          # Hook de autenticación
│   │   ├── useDataRefresh.ts  # Hook para refrescar datos
│   │   ├── useFormPersist.ts   # Hook para persistir formularios
│   │   ├── useWeeklyCuadre.ts  # Hook para cuadres semanales
│   │   └── ...
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts       # Cliente de Supabase
│   │       └── types.ts        # Tipos TypeScript generados
│   ├── lib/
│   │   ├── utils.ts            # Utilidades generales
│   │   └── dateUtils.ts        # Utilidades de fechas
│   ├── pages/
│   │   ├── Index.tsx           # Página principal (ruteo por rol)
│   │   ├── Auth.tsx            # Página de autenticación
│   │   └── NotFound.tsx       # Página 404
│   ├── App.tsx                 # Componente raíz
│   └── main.tsx                # Punto de entrada
├── supabase/
│   ├── migrations/             # Migraciones de base de datos (97 archivos)
│   ├── functions/              # Edge Functions
│   │   ├── create-user/
│   │   └── sync-sources-agency/
│   └── config.toml            # Configuración de Supabase
├── scripts/
│   ├── sync-maxplaygo.py      # Script de scraping de MaxPlayGo
│   └── README.md              # Documentación del script
├── public/                    # Archivos estáticos
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 👥 Roles y Permisos

### 1. Taquillera/Taquillero
**Responsabilidades:**
- Registrar ventas diarias por sistema de lotería
- Registrar premios pagados
- Gestionar gastos operativos y deudas
- Registrar pagos móviles (recibidos y pagados)
- Registrar transacciones de punto de venta (POS)
- Cerrar cuadres diarios
- Ver historial de transacciones propias

**Permisos:**
- Solo puede ver y editar sus propias sesiones diarias
- No puede ver datos de otras agencias
- No puede modificar cuadres cerrados

### 2. Encargada/Encargado
**Responsabilidades:**
- Supervisar todas las agencias del grupo
- Revisar y aprobar cuadres diarios de taquilleras
- Gestionar cuadres semanales por agencia
- Gestionar empleados y nómina semanal
- Gestionar préstamos y deudas inter-agencias
- Sincronizar datos con sistemas externos (MaxPlayGo, SOURCES)
- Ver reportes consolidados por agencia y sistema

**Permisos:**
- Puede ver todas las agencias
- Puede revisar y aprobar cuadres
- Puede gestionar empleados
- Puede sincronizar sistemas externos

### 3. Administrador
**Responsabilidades:**
- Gestionar usuarios y roles
- Gestionar agencias
- Gestionar sistemas de lotería y comisiones
- Ver reportes globales de ganancias
- Ver cuadres semanales de todas las agencias
- Acceso completo al sistema

**Permisos:**
- Acceso completo a todas las funcionalidades
- Puede crear, editar y eliminar usuarios
- Puede gestionar la configuración del sistema

---

## 🎯 Funcionalidades Principales

### Para Taquilleras

1. **Gestión de Ventas**
   - Registrar ventas por sistema de lotería
   - Ventas en bolívares y dólares
   - Ventas de premios (animalitos y loterías)
   - Pagos móviles recibidos

2. **Gestión de Premios**
   - Registrar premios pagados
   - Premios pendientes por pagar
   - Historial de premios

3. **Gestión de Gastos**
   - Gastos operativos
   - Deudas
   - Historial de gastos

4. **Cuadres Diarios**
   - Resumen diario de transacciones
   - Cálculo automático de balance
   - Cierre de sesión diaria

### Para Encargadas

1. **Supervisión de Cuadres**
   - Revisar cuadres diarios de todas las agencias
   - Aprobar o rechazar cuadres
   - Ver resúmenes consolidados

2. **Cuadres Semanales**
   - Configurar períodos semanales
   - Ver resumen por agencia y sistema
   - Gestionar gastos bancarios semanales
   - Gestionar nómina semanal

3. **Gestión de Empleados**
   - CRUD completo de empleados
   - Configurar salarios base
   - Gestionar pagos semanales

4. **Sincronización Externa**
   - Sincronizar datos de MaxPlayGo
   - Sincronizar datos de SOURCES
   - Ver historial de sincronizaciones

5. **Préstamos Inter-Agencias**
   - Registrar préstamos entre agencias
   - Ver historial de préstamos
   - Gestionar deudas inter-agencias

### Para Administradores

1. **Gestión de Usuarios**
   - Crear, editar y eliminar usuarios
   - Asignar roles y agencias
   - Activar/desactivar usuarios

2. **Gestión de Agencias**
   - CRUD completo de agencias
   - Configurar información de agencias

3. **Gestión de Sistemas**
   - CRUD completo de sistemas de lotería
   - Configurar comisiones por sistema
   - Gestionar subcategorías (ej: MAXPLAY-figuras, MAXPLAY-loterias)

4. **Reportes Globales**
   - Ver ganancias por sistema
   - Ver ganancias por agencia
   - Análisis de cuadres semanales

---

## 🗄️ Base de Datos

### Tablas Principales

#### `profiles`
Almacena información de usuarios del sistema.
- `id` (UUID)
- `user_id` (UUID) - Referencia a `auth.users`
- `full_name` (TEXT)
- `role` (ENUM: taquillera, supervisor, administrador)
- `agency_name` (TEXT)
- `is_active` (BOOLEAN)

#### `agencies`
Almacena información de agencias.
- `id` (UUID)
- `name` (TEXT)
- `code` (TEXT) - Código único
- `is_active` (BOOLEAN)

#### `lottery_systems`
Almacena sistemas de lotería.
- `id` (UUID)
- `name` (TEXT)
- `code` (TEXT) - Código único
- `has_subcategories` (BOOLEAN)
- `parent_system_id` (UUID) - Para subcategorías

#### `daily_sessions`
Sesiones diarias de trabajo.
- `id` (UUID)
- `user_id` (UUID)
- `session_date` (DATE)
- `is_closed` (BOOLEAN)
- `notes` (TEXT)

#### `sales_transactions`
Transacciones de ventas.
- `id` (UUID)
- `session_id` (UUID)
- `lottery_system_id` (UUID)
- `amount_bs` (DECIMAL)
- `amount_usd` (DECIMAL)
- `mobile_payment_bs` (DECIMAL)
- `mobile_payment_usd` (DECIMAL)

#### `prize_transactions`
Transacciones de premios.
- `id` (UUID)
- `session_id` (UUID)
- `lottery_system_id` (UUID)
- `amount_bs` (DECIMAL)
- `amount_usd` (DECIMAL)

#### `expenses`
Gastos y deudas.
- `id` (UUID)
- `session_id` (UUID)
- `category` (ENUM: deuda, gasto_operativo, otros)
- `description` (TEXT)
- `amount_bs` (DECIMAL)
- `amount_usd` (DECIMAL)

#### `daily_cuadres_summary`
Resumen de cuadres diarios.
- `id` (UUID)
- `session_id` (UUID)
- `user_id` (UUID)
- `session_date` (DATE)
- `agency_id` (UUID)
- `total_sales_bs`, `total_sales_usd`
- `total_prizes_bs`, `total_prizes_usd`
- `total_expenses_bs`, `total_expenses_usd`
- `cash_available_bs`, `cash_available_usd`
- `exchange_rate` (NUMERIC)
- `balance_bs` (NUMERIC)
- `is_closed` (BOOLEAN)
- `daily_closure_confirmed` (BOOLEAN)

#### `weekly_cuadres`
Cuadres semanales.
- `id` (UUID)
- `agency_id` (UUID)
- `week_start_date` (DATE)
- `week_end_date` (DATE)
- `is_closed` (BOOLEAN)
- `is_reviewed` (BOOLEAN)

#### `employees`
Empleados de las agencias.
- `id` (UUID)
- `name` (TEXT)
- `agency_id` (UUID)
- `base_salary_usd` (NUMERIC)
- `base_salary_bs` (NUMERIC)
- `sunday_rate_usd` (NUMERIC)
- `is_active` (BOOLEAN)

#### `weekly_payroll`
Nómina semanal.
- `id` (UUID)
- `employee_id` (UUID)
- `week_start_date` (DATE)
- `week_end_date` (DATE)
- `weekly_base_salary` (NUMERIC)
- `absences_deductions` (NUMERIC)
- `other_deductions` (NUMERIC)
- `bonuses_extras` (NUMERIC)
- `sunday_payment` (NUMERIC)
- `total_usd` (NUMERIC)
- `total_bs` (NUMERIC)
- `exchange_rate` (NUMERIC)

### Row Level Security (RLS)

El sistema utiliza RLS de Supabase para garantizar que:
- Los usuarios solo pueden ver sus propios datos (taquilleras)
- Las encargadas pueden ver datos de todas las agencias
- Los administradores tienen acceso completo
- Las políticas se aplican automáticamente a nivel de base de datos

---

## ⚙️ Configuración e Instalación

### Requisitos Previos

- Node.js 18+ y npm
- Python 3.8+ (para scripts de scraping)
- Chrome/Chromium y ChromeDriver (para scraping)
- Cuenta de Supabase

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd lanavetest
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crear archivo `.env.local`:
```env
VITE_SUPABASE_URL=https://pmmjomdrkcnmdakytlen.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

4. **Configurar Supabase**

- Ejecutar migraciones:
```bash
supabase db push
```

- Configurar Edge Functions:
```bash
supabase functions deploy create-user
supabase functions deploy sync-sources-agency
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

El servidor se iniciará en `http://localhost:8080`

### Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye para producción
- `npm run build:dev` - Construye en modo desarrollo
- `npm run lint` - Ejecuta el linter
- `npm run preview` - Previsualiza build de producción

---

## 🤖 Scripts y Automatización

### Script de Sincronización MaxPlayGo

El script `scripts/sync-maxplaygo.py` permite scrapear datos de MaxPlayGo y sincronizarlos con Supabase.

**Uso:**
```bash
python scripts/sync-maxplaygo.py --date 15-09-2025
```

**Funcionalidad:**
1. Inicia sesión en MaxPlayGo usando Selenium
2. Navega a la sección de ventas por comisión
3. Extrae datos de ANIMALITOS (figuras) y LOTERIAS
4. Envía los datos a la Edge Function `sync-maxplaygo-agency`
5. La función procesa y guarda los datos en `daily_cuadres_summary`

**Automatización con Cron:**
```bash
# Ejecutar todos los días a las 8:00 AM
0 8 * * * /usr/bin/python3 /ruta/a/scripts/sync-maxplaygo.py --date $(date +\%d-\%m-\%Y) >> /var/log/maxplaygo-sync.log 2>&1
```

---

## 🔌 API y Edge Functions

### Edge Functions

#### `create-user`
Crea usuarios en el sistema con perfil asociado.

**Endpoint:** `POST /functions/v1/create-user`

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123",
  "full_name": "Nombre Completo",
  "role": "taquillero",
  "agency_id": "uuid-de-agencia"
}
```

#### `sync-sources-agency`
Sincroniza datos de la API de SOURCES.

**Endpoint:** `POST /functions/v1/sync-sources-agency`

**Body:**
```json
{
  "target_date": "15-09-2025"
}
```

#### `sync-maxplaygo-agency`
Procesa datos scrapeados de MaxPlayGo.

**Endpoint:** `POST /functions/v1/sync-maxplaygo-agency`

**Body:**
```json
{
  "target_date": "15-09-2025",
  "figuras_data": [["NAVE AV SUCRE PC", "36950,00", "57600,00"]],
  "loterias_data": [["NAVE AV SUCRE PC", "15200,00", "8400,00"]]
}
```

---

## 🔒 Seguridad

### Implementado

1. **Row Level Security (RLS)** - Políticas a nivel de base de datos
2. **Autenticación JWT** - Tokens de autenticación seguros
3. **Validación de contraseñas** - Función de validación de fortaleza
4. **Auditoría de seguridad** - Tabla `security_audit_log`
5. **Rotación de refresh tokens** - Habilitada en Supabase
6. **Protección contra contraseñas filtradas** - Habilitada

### Mejoras Recomendadas

Ver sección de "Problemas y Recomendaciones" más abajo.

---

## 💻 Desarrollo

### Estructura de Componentes

Los componentes siguen una estructura modular:
- Cada rol tiene su propio directorio de componentes
- Componentes UI reutilizables en `components/ui/`
- Hooks personalizados en `hooks/`
- Utilidades en `lib/`

### Convenciones de Código

- **TypeScript** para tipado estático
- **React Hooks** para lógica de estado
- **React Hook Form + Zod** para validación de formularios
- **TanStack Query** para gestión de datos del servidor
- **Tailwind CSS** para estilos

### Testing

Actualmente no hay tests implementados. Se recomienda agregar:
- Tests unitarios con Vitest
- Tests de componentes con React Testing Library
- Tests E2E con Playwright o Cypress

---

## 📝 Notas Adicionales

### Zona Horaria

El sistema utiliza la función `venezuela_now()` para manejar la zona horaria de Venezuela en la base de datos.

### Formato de Fechas

- **Frontend:** Formato DD-MM-YYYY para inputs de usuario
- **Backend:** Formato YYYY-MM-DD para base de datos
- **API Externa:** Formato DD-MM-YYYY para MaxPlayGo

### Monedas

El sistema maneja dos monedas:
- **Bolívares (BS)** - Moneda local
- **Dólares (USD)** - Moneda de referencia

Los cálculos se realizan con tasa de cambio configurable.

---

## 📞 Soporte

Para problemas o dudas:
- Revisar logs de Edge Functions en el dashboard de Supabase
- Consultar la documentación de Supabase
- Revisar los logs del script de scraping

---

## 📄 Licencia

[Especificar licencia si aplica]

---

**Última actualización:** Enero 2025

