import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agency mapping from internal agency IDs to MaxPlayGo names
const AGENCY_MAPPING: Record<string, string> = {
  "4e331754-2ca9-44c6-8a9f-c9888a9ccf10": "NAVE AV SUCRE PC",
  "3ed75efe-3a2a-4185-9611-eaaf57669360": "NAVE AV SUCRE PC",
  "97e6b008-51eb-47b1-9c06-6fc173340a42": "NAVE BARALT PC",
  "71c6537f-22a7-477b-beab-8628242505e1": "NAVE CANDELARIA PC",
  "719863b3-6a37-4344-a348-0cf9a1da0967": "NAVE CEMENTERIO PC",
  "a2ebaac9-c3b4-4571-ac17-6d9ad3a8ff0d": "NAVE PANTEON 2 PC",
  "1b143ea9-48ee-4660-ac53-af641c2759f8": "NAVE PARQUE CENTRAL PC",
  "5226973d-bc0e-4755-8e5c-aeff41bac811": "NAVE VICTORIA 1 PC",
  "6b4040aa-4fb8-475f-9ac0-08ff313709ad": "NAVE VICTORIA 2 PC"
};

interface SyncRequest {
  target_date: string; // Format: DD-MM-YYYY
  figuras_data?: Array<[string, string, string]>; // [agency_name, sales, prizes]
  loterias_data?: Array<[string, string, string]>; // [agency_name, sales, prizes]
}

interface MaxPlayGoData {
  [agencyName: string]: {
    totalSales: number;
    totalPrizes: number;
  };
}

// Parse amount from "36.950,00" format to number
function parseAmount(str: string): number {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

// Convert array data to MaxPlayGoData format
function parseScrapedData(rawData: Array<[string, string, string]>): MaxPlayGoData {
  const data: MaxPlayGoData = {};
  for (const row of rawData) {
    const agencyName = row[0];
    const sales = parseAmount(row[1]);
    const prizes = parseAmount(row[2]);

    if (agencyName && agencyName.startsWith('NAVE')) {
      data[agencyName] = { totalSales: sales, totalPrizes: prizes };
    }
  }
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { target_date, figuras_data, loterias_data }: SyncRequest = await req.json();
    console.log(`Starting MaxPlayGo sync for date: ${target_date}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get MAXPLAY subcategory IDs
    const { data: figurasSystem, error: figurasError } = await supabase
      .from('lottery_systems')
      .select('id')
      .eq('code', 'MAXPLAY-figuras')
      .eq('is_active', true)
      .maybeSingle();

    const { data: loteriasSystem, error: loteriasError } = await supabase
      .from('lottery_systems')
      .select('id')
      .eq('code', 'MAXPLAY-loterias')
      .eq('is_active', true)
      .maybeSingle();

    if (figurasError || !figurasSystem || loteriasError || !loteriasSystem) {
      console.error('MAXPLAY subcategories not found:', { figurasError, loteriasError });
      return new Response(
        JSON.stringify({ success: false, error: 'Sistemas MAXPLAY-figuras o MAXPLAY-loterias no encontrados' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get all active agencies
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('is_active', true);

    if (agenciesError || !agencies?.length) {
      console.warn('No active agencies found or error:', agenciesError);
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontraron agencias activas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get a fallback user for insertions
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'encargada')
      .limit(1);

    let fallbackUserId: string | null = null;
    if (!profilesError && profiles && profiles.length > 0) {
      fallbackUserId = profiles[0].user_id;
    } else {
      const { data: anyProf, error: anyErr } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);
      if (!anyErr && anyProf && anyProf.length > 0) {
        fallbackUserId = anyProf[0].user_id;
      }
    }

    if (!fallbackUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No hay usuarios disponibles para asociar el resumen' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Validate input data
    if (!figuras_data || !loterias_data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan datos: figuras_data y loterias_data son requeridos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Convert DD-MM-YYYY -> YYYY-MM-DD
    const [day, month, year] = target_date.split('-');
    const dbDate = `${year}-${month}-${day}`;

    // Parse scraped data
    console.log('📊 Parsing FIGURAS data...');
    const figurasData = parseScrapedData(figuras_data);
    console.log(`✅ Parsed ${Object.keys(figurasData).length} agencies for FIGURAS`);

    console.log('📊 Parsing LOTERIAS data...');
    const loteriasData = parseScrapedData(loterias_data);
    console.log(`✅ Parsed ${Object.keys(loteriasData).length} agencies for LOTERIAS`);

    let updatedAgenciesCount = 0;
    const agencyResults: Array<{name: string, system: string, sales: number, prizes: number}> = [];

    // Update/Create summaries for each agency
    for (const agencyItem of agencies) {
      try {
        // Resolve MaxPlayGo name for this agency
        let agencyMaxPlayGoName = AGENCY_MAPPING[agencyItem.id];
        if (!agencyMaxPlayGoName) {
          const norm = (agencyItem.name || '').replace(/\./g, '').trim().toUpperCase();
          agencyMaxPlayGoName = `NAVE ${norm} PC`;
        }

        // Helper to upsert summary
        const upsertSummary = async (systemId: string, systemCode: string, scrapedData: MaxPlayGoData) => {
          const agencyData = scrapedData[agencyMaxPlayGoName];
          if (!agencyData) {
            console.warn(`No data for agency: ${agencyItem.name} (${agencyMaxPlayGoName}) in ${systemCode}`);
            return;
          }

          // Check existing summary
          const { data: existingSummary, error: fetchError } = await supabase
            .from('daily_cuadres_summary')
            .select('id')
            .eq('agency_id', agencyItem.id)
            .eq('session_date', dbDate)
            .eq('lottery_system_id', systemId)
            .is('session_id', null)
            .maybeSingle();

          if (fetchError) {
            console.error(`Fetch error for ${agencyItem.name} - ${systemCode}:`, fetchError);
            return;
          }

          const updateData = {
            total_sales_bs: agencyData.totalSales,
            total_prizes_bs: agencyData.totalPrizes,
            balance_bs: agencyData.totalSales - agencyData.totalPrizes,
            updated_at: new Date().toISOString(),
          };

          if (existingSummary) {
            const { error: updateError } = await supabase
              .from('daily_cuadres_summary')
              .update(updateData)
              .eq('id', existingSummary.id);

            if (updateError) {
              console.error(`Update error for ${agencyItem.name} - ${systemCode}:`, updateError);
              return;
            }
          } else {
            const { error: insertError } = await supabase
              .from('daily_cuadres_summary')
              .insert({
                ...updateData,
                user_id: fallbackUserId,
                agency_id: agencyItem.id,
                session_date: dbDate,
                session_id: null,
                exchange_rate: 36,
                lottery_system_id: systemId,
              });

            if (insertError) {
              console.error(`Insert error for ${agencyItem.name} - ${systemCode}:`, insertError);
              return;
            }
          }

          updatedAgenciesCount++;
          agencyResults.push({
            name: agencyItem.name,
            system: systemCode,
            sales: agencyData.totalSales,
            prizes: agencyData.totalPrizes
          });
          console.log(`✅ Updated ${systemCode} for ${agencyItem.name}: Sales=${agencyData.totalSales}, Prizes=${agencyData.totalPrizes}`);
        };

        // Upsert FIGURAS
        await upsertSummary(figurasSystem.id, 'MAXPLAY-figuras', figurasData);

        // Upsert LOTERIAS
        await upsertSummary(loteriasSystem.id, 'MAXPLAY-loterias', loteriasData);

      } catch (error) {
        console.error(`Error processing agency ${agencyItem.name}:`, error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          updatedAgenciesCount,
          agencyResults,
        },
        date: target_date,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in sync-maxplaygo-agency:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
