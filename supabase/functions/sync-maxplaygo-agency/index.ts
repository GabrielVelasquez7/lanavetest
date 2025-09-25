import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agency mapping from MaxPlayGo names to system IDs  
const AGENCY_MAPPING: Record<string, string> = {
  "NAVE AV SUCRE PC": "3ed75efe-3a2a-4185-9611-eaaf57669360", // AV.SUCRE
  "NAVE BARALT PC": "97e6b008-51eb-47b1-9c06-6fc173340a42", // BARALT
  "NAVE CANDELARIA PC": "71c6537f-22a7-477b-beab-8628242505e1", // CANDELARIA
  "NAVE CEMENTERIO PC": "719863b3-6a37-4344-a348-0cf9a1da0967", // CEMENTERIO
  "NAVE PANTEON 2 PC": "a2ebaac9-c3b4-4571-ac17-6d9ad3a8ff0d", // PANTEON 2
  "NAVE PARQUE CENTRAL PC": "1b143ea9-48ee-4660-ac53-af641c2759f8", // PARQUE CENTRAL
  "NAVE VICTORIA 1 T2 PC": "5226973d-bc0e-4755-8e5c-aeff41bac811", // VICTORIA 1
  "NAVE VICTORIA 2 PC": "6b4040aa-4fb8-475f-9ac0-08ff313709ad" // VICTORIA 2
};

interface SyncRequest {
  agency_id: string;
  credentials: {
    usuario: string;
    clave: string;
  };
  target_date: string; // Format: DD-MM-YYYY
}

function parseNumber(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agency_id, credentials, target_date }: SyncRequest = await req.json();

    console.log(`Starting MaxPlayGo sync for agency: ${agency_id}, date: ${target_date}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get agency name for mapping validation
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('name')
      .eq('id', agency_id)
      .single();

    if (agencyError || !agency) {
      throw new Error(`Agency not found: ${agency_id}`);
    }

    // Find MaxPlayGo name for this agency
    const maxPlayGoName = Object.keys(AGENCY_MAPPING).find(
      key => AGENCY_MAPPING[key] === agency_id
    );

    if (!maxPlayGoName) {
      throw new Error(`No MaxPlayGo mapping found for agency: ${agency.name}`);
    }

    console.log(`MaxPlayGo name found: ${maxPlayGoName}`);

    // TODO: Implement actual scraping logic here
    // For now, return mock data for testing the integration
    console.log('Simulating MaxPlayGo scraping...');
    
    // Mock data based on the provided example
    const mockData = {
      "NAVE AV SUCRE PC": { totalSales: 34370, totalPrizes: 33600 },
      "NAVE BARALT PC": { totalSales: 12410, totalPrizes: 2400 },
      "NAVE CANDELARIA PC": { totalSales: 4125, totalPrizes: 1200 },
      "NAVE CEMENTERIO PC": { totalSales: 6295, totalPrizes: 6600 },
      "NAVE PANTEON 2 PC": { totalSales: 5460, totalPrizes: 11200 },
      "NAVE PARQUE CENTRAL PC": { totalSales: 7355, totalPrizes: 8800 },
      "NAVE VICTORIA 1 T2 PC": { totalSales: 7230, totalPrizes: 6900 },
      "NAVE VICTORIA 2 PC": { totalSales: 3380, totalPrizes: 7000 }
    };

    const scrapedData = mockData[maxPlayGoName as keyof typeof mockData];
    
    if (!scrapedData) {
      throw new Error(`No mock data available for agency: ${maxPlayGoName}`);
    }

    console.log(`Mock data - Sales: ${scrapedData.totalSales}, Prizes: ${scrapedData.totalPrizes}`);

    // Convert target_date to database format (YYYY-MM-DD)
    const [day, month, year] = target_date.split('-');
    const dbDate = `${year}-${month}-${day}`;

    // Update or create daily_cuadres_summary
    const { data: existingSummary, error: fetchError } = await supabase
      .from('daily_cuadres_summary')
      .select('*')
      .eq('agency_id', agency_id)
      .eq('session_date', dbDate)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing summary:', fetchError);
      throw fetchError;
    }

    const updateData = {
      total_sales_bs: scrapedData.totalSales,
      total_prizes_bs: scrapedData.totalPrizes,
      updated_at: new Date().toISOString(),
    };

    if (existingSummary) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('daily_cuadres_summary')
        .update(updateData)
        .eq('id', existingSummary.id);

      if (updateError) {
        console.error('Error updating summary:', updateError);
        throw updateError;
      }

      console.log('Successfully updated existing summary');
    } else {
      // Create new record - we need a user_id, let's get one from the agency
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('agency_id', agency_id)
        .limit(1);

      if (profileError || !profiles?.length) {
        throw new Error(`No users found for agency: ${agency_id}`);
      }

      const { error: insertError } = await supabase
        .from('daily_cuadres_summary')
        .insert({
          ...updateData,
          user_id: profiles[0].user_id,
          agency_id: agency_id,
          session_date: dbDate,
        });

      if (insertError) {
        console.error('Error inserting summary:', insertError);
        throw insertError;
      }

      console.log('Successfully created new summary');
    }

    return new Response(
      JSON.stringify({
        success: true,
        agency_name: agency.name,
        maxplaygo_name: maxPlayGoName,
        data: scrapedData,
        date: target_date,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in sync-maxplaygo-agency:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});