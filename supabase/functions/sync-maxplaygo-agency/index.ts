import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agency mapping from internal agency IDs to MaxPlayGo names
const AGENCY_MAPPING: Record<string, string> = {
  "4e331754-2ca9-44c6-8a9f-c9888a9ccf10": "NAVE AV SUCRE PC", // Agencia Central (ajustar si aplica)
  "3ed75efe-3a2a-4185-9611-eaaf57669360": "NAVE AV SUCRE PC", // AV.SUCRE
  "97e6b008-51eb-47b1-9c06-6fc173340a42": "NAVE BARALT PC", // BARALT
  "71c6537f-22a7-477b-beab-8628242505e1": "NAVE CANDELARIA PC", // CANDELARIA
  "719863b3-6a37-4344-a348-0cf9a1da0967": "NAVE CEMENTERIO PC", // CEMENTERIO
  "a2ebaac9-c3b4-4571-ac17-6d9ad3a8ff0d": "NAVE PANTEON 2 PC", // PANTEON 2
  "1b143ea9-48ee-4660-ac53-af641c2759f8": "NAVE PARQUE CENTRAL PC", // PARQUE CENTRAL
  "5226973d-bc0e-4755-8e5c-aeff41bac811": "NAVE VICTORIA 1 T2 PC", // VICTORIA 1
  "6b4040aa-4fb8-475f-9ac0-08ff313709ad": "NAVE VICTORIA 2 PC" // VICTORIA 2
};

interface SyncRequest {
  agency_id: string;
  target_date: string; // Format: DD-MM-YYYY
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agency_id, target_date }: SyncRequest = await req.json();
    console.log(`Starting MaxPlayGo sync for agency: ${agency_id}, date: ${target_date}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch agency info
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('name')
      .eq('id', agency_id)
      .maybeSingle();

    if (agencyError || !agency) {
      console.warn('Agency not found or error:', agencyError);
      return new Response(
        JSON.stringify({ success: false, error: `Agencia no encontrada: ${agency_id}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Resolve MaxPlayGo name (mapping or heuristic)
    let maxPlayGoName = AGENCY_MAPPING[agency_id];
    if (!maxPlayGoName) {
      const norm = (agency.name || '').replace(/\./g, '').trim().toUpperCase();
      maxPlayGoName = `NAVE ${norm} PC`;
      if (norm === 'VICTORIA 1') maxPlayGoName = 'NAVE VICTORIA 1 T2 PC';
      if (norm === 'VICTORIA 2') maxPlayGoName = 'NAVE VICTORIA 2 PC';
    }
    console.log('MaxPlayGo name resolved:', maxPlayGoName);

    // TODO: Replace this with real scraping extracting montos[1] (ventas) and montos[2] (premios)
    const mockData: Record<string, { totalSales: number; totalPrizes: number }> = {
      'NAVE AV SUCRE PC': { totalSales: 34370, totalPrizes: 33600 },
      'NAVE BARALT PC': { totalSales: 12410, totalPrizes: 2400 },
      'NAVE CANDELARIA PC': { totalSales: 4125, totalPrizes: 1200 },
      'NAVE CEMENTERIO PC': { totalSales: 6295, totalPrizes: 6600 },
      'NAVE PANTEON 2 PC': { totalSales: 5460, totalPrizes: 11200 },
      'NAVE PARQUE CENTRAL PC': { totalSales: 7355, totalPrizes: 8800 },
      'NAVE VICTORIA 1 T2 PC': { totalSales: 7230, totalPrizes: 6900 },
      'NAVE VICTORIA 2 PC': { totalSales: 3380, totalPrizes: 7000 },
    };

    const scrapedData = mockData[maxPlayGoName];
    if (!scrapedData) {
      console.warn('No mock data for', maxPlayGoName);
      return new Response(
        JSON.stringify({ success: false, error: `No hay datos simulados para: ${maxPlayGoName}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Convert DD-MM-YYYY -> YYYY-MM-DD
    const [day, month, year] = target_date.split('-');
    const dbDate = `${year}-${month}-${day}`;

    // Get MAXPLAY system ID
    const { data: maxplaySystem, error: maxplayError } = await supabase
      .from('lottery_systems')
      .select('id')
      .eq('code', 'MAXPLAY')
      .eq('is_active', true)
      .maybeSingle();

    if (maxplayError || !maxplaySystem) {
      console.warn('MAXPLAY system not found or error:', maxplayError);
      return new Response(
        JSON.stringify({ success: false, error: 'Sistema MAXPLAY no encontrado o inactivo' }),
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

    let updatedAgenciesCount = 0;

    // Update/Create summary for each agency with MAXPLAY data
    for (const agencyItem of agencies) {
      try {
        // Check existing summary for this agency and MAXPLAY system
        const { data: existingSummary, error: fetchError } = await supabase
          .from('daily_cuadres_summary')
          .select('id')
          .eq('agency_id', agencyItem.id)
          .eq('session_date', dbDate)
          .eq('lottery_system_id', maxplaySystem.id)
          .is('session_id', null)
          .maybeSingle();

        if (fetchError) {
          console.error(`Fetch existing summary error for agency ${agencyItem.name}:`, fetchError);
          continue;
        }

        const updateData = {
          total_sales_bs: scrapedData.totalSales,
          total_prizes_bs: scrapedData.totalPrizes,
          balance_bs: scrapedData.totalSales - scrapedData.totalPrizes,
          updated_at: new Date().toISOString(),
        };

        if (existingSummary) {
          const { error: updateError } = await supabase
            .from('daily_cuadres_summary')
            .update(updateData)
            .eq('id', existingSummary.id);

          if (updateError) {
            console.error(`Update summary error for agency ${agencyItem.name}:`, updateError);
            continue;
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
              lottery_system_id: maxplaySystem.id,
            });

          if (insertError) {
            console.error(`Insert summary error for agency ${agencyItem.name}:`, insertError);
            continue;
          }
        }

        updatedAgenciesCount++;
        console.log(`Updated MAXPLAY data for agency: ${agencyItem.name}`);
      } catch (error) {
        console.error(`Error processing agency ${agencyItem.name}:`, error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalSales: scrapedData.totalSales,
          totalPrizes: scrapedData.totalPrizes,
          updatedAgenciesCount,
        },
        maxplaygo_name: maxPlayGoName,
        date: target_date,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-maxplaygo-agency:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
