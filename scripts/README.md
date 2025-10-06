# MaxPlayGo Scraping System

Este sistema permite scrapear datos de MaxPlayGo y sincronizarlos automáticamente con Supabase.

## 🏗️ Arquitectura

```
┌─────────────────┐
│  Script Python  │  ← Hace scraping con Selenium
│ sync-maxplaygo  │     (ANIMALITOS + LOTERIAS)
└────────┬────────┘
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

### Sincronizar una fecha específica

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

## 🔄 Automatización con Cron

Para ejecutar el scraping automáticamente todos los días a las 8:00 AM:

```bash
# Editar crontab
crontab -e

# Agregar línea (ajustar rutas según tu sistema)
0 8 * * * /usr/bin/python3 /ruta/a/scripts/sync-maxplaygo.py --date $(date +\%d-\%m-\%Y) >> /var/log/maxplaygo-sync.log 2>&1
```

## 🔧 Configuración

Editar credenciales en `sync-maxplaygo.py`:

```python
MAXPLAYGO_USERNAME = "BANCA LA"
MAXPLAYGO_PASSWORD = "123456"
SUPABASE_URL = "https://pmmjomdrkcnmdakytlen.supabase.co"
SUPABASE_ANON_KEY = "tu_anon_key_aqui"
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

1. **Selenium Headless**: El script ejecuta Chrome en modo headless (sin interfaz gráfica)
2. **Tiempo de ejecución**: ~2-3 minutos por fecha (incluye ambos scrapes)
3. **Edge Function**: El endpoint `/functions/v1/sync-maxplaygo-agency` procesa los datos
4. **Subcategorías**: Se crean 2 registros por agencia:
   - `MAXPLAY-figuras` (datos de ANIMALITOS)
   - `MAXPLAY-loterias` (datos de LOTERIAS)

## 🐛 Troubleshooting

### Error: ChromeDriver not found
```bash
# Ubuntu/Debian
sudo apt-get install chromium-chromedriver

# macOS
brew install chromedriver
```

### Error: Timeout waiting for page
- Verificar conexión a internet
- Verificar que MaxPlayGo esté disponible
- Aumentar timeout en el código si es necesario

### Error: Login failed
- Verificar credenciales en el script
- Verificar que la cuenta esté activa en MaxPlayGo

## 📞 Soporte

Para problemas o dudas, consultar los logs del Edge Function:
https://supabase.com/dashboard/project/pmmjomdrkcnmdakytlen/functions/sync-maxplaygo-agency/logs
