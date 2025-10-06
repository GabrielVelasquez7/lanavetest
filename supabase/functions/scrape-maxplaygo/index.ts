import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeResult {
  figuras_data: Array<[string, string, string]>;
  loterias_data: Array<[string, string, string]>;
}

async function scrapeMaxPlayGo(targetDate: string): Promise<ScrapeResult> {
  console.log(`🚀 Iniciando scraping para fecha: ${targetDate}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  
  try {
    const username = Deno.env.get('MAXPLAYGO_USERNAME') || '';
    const password = Deno.env.get('MAXPLAYGO_PASSWORD') || '';
    
    // Login
    console.log('📝 Iniciando sesión en MaxPlayGo...');
    await page.goto('https://www.maxplaygo.com/login', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Login exitoso');
    
    // Scrape FIGURAS (Juego O)
    console.log(`\n🔍 Scraping FIGURAS para fecha ${targetDate}...`);
    const figurasData = await scrapeGameData(page, targetDate, 'O');
    console.log(`✅ FIGURAS: ${figurasData.length} agencias`);
    
    // Scrape LOTERIAS (Juego A)
    console.log(`\n🔍 Scraping LOTERIAS para fecha ${targetDate}...`);
    const loteriasData = await scrapeGameData(page, targetDate, 'A');
    console.log(`✅ LOTERIAS: ${loteriasData.length} agencias`);
    
    // Logout
    console.log('\n🚪 Cerrando sesión...');
    await logout(page);
    
    await browser.close();
    
    return {
      figuras_data: figurasData,
      loterias_data: loteriasData
    };
  } catch (error) {
    console.error('❌ Error en scraping:', error);
    await browser.close();
    throw error;
  }
}

async function scrapeGameData(
  page: any, 
  targetDate: string, 
  juego: 'O' | 'A'
): Promise<Array<[string, string, string]>> {
  // Navegar a venxcom
  console.log('📊 Navegando a venxcom...');
  await page.goto('https://www.maxplaygo.com/venxcom', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  // Aplicar filtros
  console.log(`🎯 Aplicando filtros: Fecha=${targetDate}, Nivel=G, Moneda=BS, Juego=${juego}`);
  
  // Selector de fecha
  await page.waitForSelector('input[name="fecha"]', { timeout: 30000 });
  await page.evaluate((date: string) => {
    const input = document.querySelector('input[name="fecha"]') as HTMLInputElement;
    if (input) input.value = date;
  }, targetDate);
  
  // Selector de nivel (G)
  await page.select('select[name="nivel"]', 'G');
  
  // Selector de moneda (BS)
  await page.select('select[name="moneda"]', 'BS');
  
  // Selector de juego
  await page.select('select[name="juego"]', juego);
  
  // Aplicar filtros
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
  console.log('✅ Filtros aplicados');
  
  // Buscar "LA NAVE GRUPO"
  console.log('🎯 Buscando LA NAVE GRUPO...');
  await page.waitForSelector('input[type="search"]', { timeout: 30000 });
  await page.type('input[type="search"]', 'LA NAVE GRUPO');
  await page.waitForTimeout(2000);
  
  // Click en el grupo para expandir detalles
  const grupoSelector = 'tr:has-text("LA NAVE GRUPO")';
  await page.waitForSelector(grupoSelector, { timeout: 30000 });
  await page.click(grupoSelector);
  await page.waitForTimeout(2000);
  console.log('✅ Detalles cargados');
  
  // Extraer datos de la tabla
  console.log('📋 Extrayendo datos de tabla...');
  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows
      .filter((row: any) => {
        const firstCell = row.querySelector('td:first-child')?.textContent || '';
        return firstCell.startsWith('NAVE');
      })
      .map((row: any) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return [
          cells[0]?.textContent?.trim() || '', // Nombre agencia
          cells[cells.length - 2]?.textContent?.trim() || '0', // Ventas
          cells[cells.length - 1]?.textContent?.trim() || '0'  // Premios
        ];
      });
  });
  
  console.log(`✅ Extraídas ${data.length} agencias`);
  return data as Array<[string, string, string]>;
}

async function logout(page: any): Promise<void> {
  try {
    // Buscar y hacer click en el botón de salir
    const logoutButton = await page.waitForSelector('button.bg-gradient-cyan', { timeout: 10000 });
    if (logoutButton) {
      await logoutButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      console.log('✅ Sesión cerrada exitosamente');
    }
  } catch (error) {
    console.log('⚠️ No se pudo cerrar sesión:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SCRAPE MAXPLAYGO FUNCTION START ===');
    
    const { target_date } = await req.json();
    
    if (!target_date) {
      throw new Error('target_date is required (format: DD-MM-YYYY)');
    }
    
    console.log(`Target date received: ${target_date}`);
    
    // Realizar scraping
    const scrapedData = await scrapeMaxPlayGo(target_date);
    
    // Llamar a sync-maxplaygo-agency para guardar los datos
    console.log('\n📤 Enviando datos a Supabase...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const syncResponse = await fetch(
      `${supabaseUrl}/functions/v1/sync-maxplaygo-agency`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          target_date,
          figuras_data: scrapedData.figuras_data,
          loterias_data: scrapedData.loterias_data,
        }),
      }
    );
    
    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      throw new Error(`Sync failed: ${syncResponse.status} - ${errorText}`);
    }
    
    const syncResult = await syncResponse.json();
    console.log('✅ Sincronización exitosa!');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scraping y sincronización completados',
        figuras_count: scrapedData.figuras_data.length,
        loterias_count: scrapedData.loterias_data.length,
        sync_result: syncResult,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('❌ Error en scrape-maxplaygo function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
