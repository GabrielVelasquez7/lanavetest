# MaxPlayGo Scraping System

Este sistema permite scrapear datos de MaxPlayGo y sincronizarlos automáticamente con Supabase mediante GitHub Actions.

## 🏗️ Arquitectura

```
┌─────────────────────────────┐
│  GitHub Actions Workflow    │  ← Ejecuta diariamente 8:00 AM
│  .github/workflows/         │     (o manualmente con dispatch)
│  maxplaygo-sync.yml         │
└──────────┬──────────────────┘
           │
           │ Ejecuta script Python con Selenium
           ▼
┌─────────────────────────────┐
│  Script Python              │  ← Hace scraping con Selenium
│  scripts/sync-maxplaygo.py  │     (ANIMALITOS + LOTERIAS)
└──────────┬──────────────────┘
           │
           │ HTTP POST con datos scrapeados
           ▼
┌─────────────────────────────────────┐
│  Edge Function                      │
│  sync-maxplaygo-agency              │
│  ├─ Recibe datos de Figuras         │
│  ├─ Recibe datos de Loterias        │
│  ├─ Parsea y mapea agencias         │
│  └─ Guarda en daily_cuadres_summary │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Supabase Database                  │
│  ├─ MAXPLAY-figuras (por agencia)   │
│  └─ MAXPLAY-loterias (por agencia)  │
└─────────────────────────────────────┘
```

## 📋 Requisitos

### Python
```bash
pip install selenium requests
```

### ChromeDriver
- Descargar ChromeDriver compatible con tu versión de Chrome: https://chromedriver.chromium.org/downloads
- Agregar ChromeDriver al PATH del sistema

## 🚀 Uso

### 🤖 Sincronización Automática con GitHub Actions

El sistema se ejecuta **automáticamente todos los días a las 8:00 AM** (hora de Caracas) mediante GitHub Actions.

#### Ejecución Manual

Puedes ejecutar el workflow manualmente desde GitHub:

1. Ve a tu repositorio en GitHub
2. Click en **Actions** → **MaxPlayGo Daily Sync**
3. Click en **Run workflow**
4. (Opcional) Ingresa una fecha específica en formato `DD-MM-YYYY`
5. Click en **Run workflow** verde

### 🖥️ Ejecución Local (Desarrollo)

Para ejecutar el script localmente:

```bash
python scripts/sync-maxplaygo.py --date 15-09-2025
```

### Ejemplo de salida

```
🚀 Iniciando scraping para fecha: 15-09-2025

🔍 Scraping O para fecha 15-09-2025...
📝 Iniciando sesión...
✅ Login exitoso
📊 Navegando a venxcom...
🎯 Aplicando filtros: Fecha=15-09-2025, Nivel=G, Moneda=BS, Juego=O
✅ Filtros aplicados
🎯 Buscando LA NAVE GRUPO...
✅ Detalles cargados
📋 Extrayendo datos de tabla...
✅ Extraídas 9 agencias
✅ FIGURAS: 9 agencias

🔍 Scraping A para fecha 15-09-2025...
[... mismo proceso ...]
✅ LOTERIAS: 9 agencias

📤 Enviando datos a Supabase...
✅ Sincronización exitosa!
   Agencias actualizadas: 18
   - AV.SUCRE (MAXPLAY-figuras): Ventas=36950, Premios=57600
   - AV.SUCRE (MAXPLAY-loterias): Ventas=15200, Premios=8400
   [...]

✅ Proceso completado!
```

## 📊 Formato de Datos

El script extrae datos en este formato:

```python
[
  ["NAVE AV SUCRE PC", "36.950,00", "57.600,00"],
  ["NAVE BARALT PC", "22.715,00", "19.250,00"],
  ...
]
```

Columnas:
- `[0]` = Nombre de agencia (ej: "NAVE AV SUCRE PC")
- `[1]` = Ventas en Bs (formato con puntos y comas)
- `[2]` = Premios en Bs (formato con puntos y comas)

## 🔧 Configuración de GitHub Secrets

Para que el workflow funcione, debes configurar los siguientes **GitHub Secrets**:

1. Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions**
2. Click en **New repository secret**
3. Crea los siguientes secrets:

| Secret Name | Valor |
|------------|-------|
| `MAXPLAYGO_USERNAME` | Usuario de MaxPlayGo (ej: "BANCA LA") |
| `MAXPLAYGO_PASSWORD` | Contraseña de MaxPlayGo |
| `SUPABASE_URL` | https://pmmjomdrkcnmdakytlen.supabase.co |
| `SUPABASE_ANON_KEY` | Tu Supabase anon key |

### ⚠️ IMPORTANTE: Configuración de Zona Horaria

El workflow está configurado para ejecutarse a las **12:00 UTC** (8:00 AM Caracas).  
Si necesitas cambiar el horario, edita el archivo `.github/workflows/maxplaygo-sync.yml`:

```yaml
schedule:
  - cron: '0 12 * * *'  # 12:00 UTC = 8:00 AM Caracas
```

## 🎯 Mapeo de Agencias

El sistema mapea automáticamente los nombres de MaxPlayGo a las agencias internas:

| MaxPlayGo             | Agencia Interna |
|-----------------------|-----------------|
| NAVE AV SUCRE PC      | AV.SUCRE        |
| NAVE BARALT PC        | BARALT          |
| NAVE CANDELARIA PC    | CANDELARIA      |
| NAVE CEMENTERIO PC    | CEMENTERIO      |
| NAVE PANTEON 2 PC     | PANTEON 2       |
| NAVE PARQUE CENTRAL PC| PARQUE CENTRAL  |
| NAVE VICTORIA 1 PC    | VICTORIA 1      |
| NAVE VICTORIA 2 PC    | VICTORIA 2      |

## 📝 Notas Importantes

1. **Automatización**: El sistema se ejecuta automáticamente vía GitHub Actions (no requiere servidor)
2. **Selenium Headless**: El script ejecuta Chrome en modo headless (sin interfaz gráfica)
3. **Tiempo de ejecución**: ~2-3 minutos por fecha (incluye ambos scrapes)
4. **Edge Function**: El endpoint `/functions/v1/sync-maxplaygo-agency` procesa los datos
5. **Subcategorías**: Se crean 2 registros por agencia:
   - `MAXPLAY-figuras` (datos de ANIMALITOS)
   - `MAXPLAY-loterias` (datos de LOTERIAS)
6. **Variables de entorno**: El script lee credenciales de variables de entorno (para seguridad en GitHub Actions)

## 🐛 Troubleshooting

### ❌ Workflow falla con "Secrets not found"
- Verifica que hayas configurado todos los GitHub Secrets necesarios
- Los nombres de los secrets son sensibles a mayúsculas

### ❌ Error: ChromeDriver not found (Local)
```bash
# Ubuntu/Debian
sudo apt-get install chromium-chromedriver

# macOS
brew install chromedriver
```

### ❌ Error: Timeout waiting for page
- Verificar conexión a internet
- Verificar que MaxPlayGo esté disponible
- Aumentar timeout en el código si es necesario

### ❌ Error: Login failed
- Verificar credenciales en GitHub Secrets (o variables de entorno locales)
- Verificar que la cuenta esté activa en MaxPlayGo

### 📊 Ver logs del Workflow
1. Ve a tu repositorio → **Actions**
2. Click en el workflow **MaxPlayGo Daily Sync**
3. Click en la ejecución específica para ver los logs detallados

### 📊 Ver logs del Edge Function
Para problemas después de que los datos se envían a Supabase:
https://supabase.com/dashboard/project/pmmjomdrkcnmdakytlen/functions/sync-maxplaygo-agency/logs
