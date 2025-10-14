import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SCRAPE MAXPLAYGO BROWSERLESS START ===');
    
    const { target_date } = await req.json();
    console.log('Target date:', target_date);

    if (!target_date) {
      throw new Error('target_date is required (format: DD-MM-YYYY)');
    }

    // Get secrets
    const BROWSERLESS_API_KEY = Deno.env.get('BROWSERLESS_API_KEY');
    const MAXPLAYGO_USERNAME = Deno.env.get('MAXPLAYGO_USERNAME');
    const MAXPLAYGO_PASSWORD = Deno.env.get('MAXPLAYGO_PASSWORD');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!BROWSERLESS_API_KEY) {
      throw new Error('BROWSERLESS_API_KEY not configured');
    }
    if (!MAXPLAYGO_USERNAME || !MAXPLAYGO_PASSWORD) {
      throw new Error('MaxPlayGo credentials not configured');
    }

    console.log('All secrets loaded successfully');

    // Browserless.io API endpoint
    const browserlessUrl = `https://production-sfo.browserless.io/function?token=${BROWSERLESS_API_KEY}`;

    // Function to create Puppeteer script (Browserless only supports Puppeteer, not Playwright)
    const createPuppeteerScript = (juego: string, juegoName: string) => {
      const code = `export default async function ({ page, context }) {
  const USUARIO = ${JSON.stringify(MAXPLAYGO_USERNAME)};
  const CLAVE = ${JSON.stringify(MAXPLAYGO_PASSWORD)};
  const FECHA = ${JSON.stringify(target_date)};
  const NIVEL = "G";
  const MONEDA = "BS";
  const JUEGO = ${JSON.stringify(juego)};
  const JUEGO_NAME = ${JSON.stringify(juegoName)};
  const targetSelector = "a[title='Detalles Ventas']:has-text('LA NAVE GRUPO')";

  let data = [];
  
  try {
    console.log("===== INICIO SCRAPING " + JUEGO_NAME + " =====");
    
    // === LOGIN ===
    console.log("1. Iniciando login...");
    await page.goto("https://web.maxplaygo.com/login", { waitUntil: 'networkidle0' });
    
    await page.type("#usuario", USUARIO);
    await page.type("#clave", CLAVE);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log("✅ Login exitoso");

    // === IR A VENTAS TOTALES Y APLICAR FILTROS ===
    console.log("2. Aplicando filtros...");
    await page.goto("https://web.maxplaygo.com/venxcom/", { waitUntil: 'domcontentloaded' });
    await page.waitForSelector("#id_fecha", { timeout: 15000 });

    await page.type("#id_fecha", FECHA, { delay: 100 });
    await page.select("#n-nivel", NIVEL);
    await page.select("#id_moneda", MONEDA);
    await page.select("#id_juego", JUEGO);

    await page.click('button[type="submit"]');
    await page.waitForSelector("table tbody tr", { timeout: 20000 });
    console.log("📊 Filtros aplicados y resultados cargados");

    // === BUSCAR Y HACER CLIC EN LA NAVE GRUPO ===
    console.log("3. Buscando 'LA NAVE GRUPO'...");
    
    // Buscar el enlace que contiene "LA NAVE GRUPO"
    const linkSelector = "a[title='Detalles Ventas']";
    const links = await page.$$(linkSelector);
    
    let targetLink = null;
    for (const link of links) {
      const linkText = await page.evaluate(el => el.textContent, link);
      if (linkText && linkText.includes("LA NAVE GRUPO")) {
        targetLink = link;
        break;
      }
    }
    
    if (targetLink) {
      await targetLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      console.log("🔍 Click exitoso en 'LA NAVE GRUPO'");
      
      await page.waitForSelector("table tbody tr", { timeout: 10000 });

      // === EXTRAER DATA DE DETALLES ===
      console.log("4. Extrayendo datos de la tabla...");
      const tableRows = await page.$$("table tbody tr");
      
      if (tableRows.length === 0) {
        console.log("⚠️ Tabla de detalles vacía");
        return {
          data: { status: "success", data: [], message: "No hay datos para esta fecha" },
          type: "application/json"
        };
      }
      
      for (const row of tableRows) {
        const cells = await row.$$("td");
        if (cells.length === 0) continue;
        
        const rowData = [];
        for (const cell of cells) {
          const cellText = await page.evaluate(el => el.textContent, cell);
          rowData.push(cellText ? cellText.trim() : "");
        }
        data.push(rowData);
      }

      console.log("✅ Extraídos " + data.length + " registros de " + JUEGO_NAME);
    } else {
      console.log("⚠️ No se encontró el enlace de LA NAVE GRUPO");
      return {
        data: { status: "error", message: "No se encontró LA NAVE GRUPO", data: [] },
        type: "application/json"
      };
    }

    // === LOGOUT ===
    console.log("5. Cerrando sesión...");
    try {
      await page.goto("https://web.maxplaygo.com/logout", { waitUntil: 'networkidle0' });
      console.log("✅ Logout exitoso");
    } catch (e) {
      console.log("⚠️ Error en logout (no crítico):", e.message);
    }

  } catch (error) {
    console.error("⛔️ Error en " + JUEGO_NAME + ":", error.message);
    return {
      data: { status: "error", message: error.message, data: [] },
      type: "application/json"
    };
  }

  console.log("===== FIN SCRAPING " + JUEGO_NAME + " =====");
  return {
    data: { status: "success", data: data },
    type: "application/json"
  };
}`;
      
      return code;
    };

    // Function to call Browserless.io
    const callBrowserless = async (juego: string, juegoName: string) => {
      console.log(`\n>>> Iniciando scraping de ${juegoName}...`);
      
      const scriptCode = createPuppeteerScript(juego, juegoName);
      console.log(`Code preview (first 150 chars): ${scriptCode.slice(0, 150)}...`);
      
      const payload = {
        code: scriptCode
      };

      const response = await fetch(browserlessUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(90000), // 90 seconds timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Browserless API error for ${juegoName}: ${response.status} - ${errorText}`);
      }

      const raw = await response.json();
      console.log(`<<< Scraping de ${juegoName} completado`);
      console.log(`Full result object:`, JSON.stringify(raw).slice(0, 300));

      // Unwrap Browserless payload: sometimes returns { data: {...}, type: 'application/json' }
      const payload = (raw && typeof raw === 'object' && 'data' in raw && (raw as any).type === 'application/json')
        ? (raw as any).data
        : raw;

      console.log(`Status: ${payload?.status}`);
      console.log(`Data array length: ${Array.isArray(payload?.data) ? payload.data.length : 'not an array'}`);
      console.log(`Registros obtenidos: ${Array.isArray(payload?.data) ? payload.data.length : 0}`);
      
      return payload;
    };

    // Scrape both FIGURAS and LOTERIAS
    console.log('\n=== PHASE 1: SCRAPING FIGURAS ===');
    const figurasResult = await callBrowserless('O', 'FIGURAS');
    
    console.log('\n=== PHASE 2: SCRAPING LOTERIAS ===');
    const loteriasResult = await callBrowserless('A', 'LOTERIAS');

    // Process and combine results
    const figurasData = figurasResult.status === 'success' ? figurasResult.data : [];
    const loteriasData = loteriasResult.status === 'success' ? loteriasResult.data : [];

    console.log('\n=== RESULTADOS DEL SCRAPING ===');
    console.log(`FIGURAS: ${figurasData.length} registros`);
    console.log(`LOTERIAS: ${loteriasData.length} registros`);

    // Transform data to match the expected format for sync-maxplaygo-agency
    const transformData = (rawData: any[], tipo: string) => {
      return rawData.map((row: any[]) => {
        // Assuming row format: [Agencia, Ventas, Premios, ...]
        // Adjust indices based on actual MaxPlayGo table structure
        return {
          agency_name: row[0] || '',
          sales: parseFloat(row[1]?.replace(/[^\d.-]/g, '') || '0'),
          prizes: parseFloat(row[2]?.replace(/[^\d.-]/g, '') || '0'),
          tipo: tipo
        };
      }).filter(item => item.agency_name && (item.sales > 0 || item.prizes > 0));
    };

    const processedFiguras = transformData(figurasData, 'FIGURAS');
    const processedLoterias = transformData(loteriasData, 'LOTERIAS');

    console.log('\n=== DATOS PROCESADOS ===');
    console.log(`FIGURAS procesadas: ${processedFiguras.length}`);
    console.log(`LOTERIAS procesadas: ${processedLoterias.length}`);

    // Call sync-maxplaygo-agency to save the data
    if (processedFiguras.length > 0 || processedLoterias.length > 0) {
      console.log('\n=== PHASE 3: SINCRONIZANDO CON BASE DE DATOS ===');
      
      const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
      
      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-maxplaygo-agency', {
        body: {
          target_date,
          figuras: processedFiguras,
          loterias: processedLoterias
        }
      });

      if (syncError) {
        console.error('Error al sincronizar con la base de datos:', syncError);
        throw new Error(`Sync error: ${syncError.message}`);
      }

      console.log('✅ Datos sincronizados exitosamente');
      console.log('Sync result:', syncData);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Scraping y sincronización exitosa: ${processedFiguras.length} figuras y ${processedLoterias.length} loterías`,
          data: {
            figuras: processedFiguras.length,
            loterias: processedLoterias.length,
            syncResult: syncData
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      console.log('⚠️ No se encontraron datos para sincronizar');
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No se encontraron datos en MaxPlayGo para la fecha especificada',
          data: {
            figuras: 0,
            loterias: 0
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

  } catch (error) {
    console.error('⛔️ ERROR GENERAL:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
