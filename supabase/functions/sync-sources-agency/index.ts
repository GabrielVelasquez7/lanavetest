import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agency mapping: Internal ID -> SOURCES API details
const AGENCY_MAPPING: Record<string, { sourcesName: string, grupoId: string }> = {
  "97e6b008-51eb-47b1-9c06-6fc173340a42": { sourcesName: "NAVE BARALT T1", grupoId: "534" },
  "3ed75efe-3a2a-4185-9611-eaaf57669360": { sourcesName: "NAVE AV SUCRE T1", grupoId: "534" },
  "71c6537f-22a7-477b-beab-8628242505e1": { sourcesName: "NAVE CANDELARIA T1", grupoId: "534" },
  "719863b3-6a37-4344-a348-0cf9a1da0967": { sourcesName: "NAVE CEMENTERIO T1", grupoId: "534" },
  "b93be4ea-df86-4272-89df-f4e7cad5a67e": { sourcesName: "NAVE PANTEON1 T1", grupoId: "534" },
  "1b143ea9-48ee-4660-ac53-af641c2759f8": { sourcesName: "NAVE PARQUE CENTRAL T1", grupoId: "534" },
  "c900cfe5-260c-4a53-95cd-a00b31d228c0": { sourcesName: "NAVE SAN MARTIN T1", grupoId: "534" },
  "5226973d-bc0e-4755-8e5c-aeff41bac811": { sourcesName: "NAVE VICTORIA 1 T1", grupoId: "534" },
  "6b4040aa-4fb8-475f-9ac0-08ff313709ad": { sourcesName: "NAVE VICTORIA2 T1", grupoId: "534" },
  "6f2171de-8fcf-4bec-82ad-787d9d50fe5d": { sourcesName: "NAVE MIRAFLORES", grupoId: "579" },
  "a2ebaac9-c3b4-4571-ac17-6d9ad3a8ff0d": { sourcesName: "NAVE PANTEON2 T1", grupoId: "551" },
  "5e644e85-d56e-4a71-95cb-d85425eaca30": { sourcesName: "NAVE CAPITOLIO", grupoId: "534" }
};

interface SyncRequest {
  target_date: string; // Format: DD-MM-YYYY
}

interface SourcesComercio {
  divisa_id: number;
  divisa_code: string;
  divisa: string;
  comercio_id: number;
  comercio_type: string;
  comercio: string;
  venta: number;
  comision: number;
  premio: number;
  total: number;
  percent: number;
  banqueo: number[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SOURCES SYNC FUNCTION START ===');
    
    const { target_date }: SyncRequest = await req.json();
    console.log('Target date received:', target_date);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Authenticate with SOURCES API
    console.log('Step 1: Authenticating with SOURCES API...');
    const loginResponse = await fetch('https://api.sourcesws.com/dashboard/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://admin.sourcesws.com',
        'Referer': 'https://admin.sourcesws.com/'
      },
      body: JSON.stringify({
        username: 'lanavecom',
        password: '123456789'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`SOURCES login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData?.data?.token;
    
    if (!token) {
      console.error('Login response structure:', JSON.stringify(loginData, null, 2));
      throw new Error('Token not found in SOURCES login response');
    }

    console.log('Authentication successful, token acquired');

    // Convert date from DD-MM-YYYY to YYYY-MM-DD
    const [day, month, year] = target_date.split('-');
    const formattedDate = `${year}-${month}-${day}`;
    console.log('Formatted date for API:', formattedDate);

    // Step 2: Get SOURCES system ID
    const { data: sourcesSystem, error: systemError } = await supabase
      .from('lottery_systems')
      .select('id')
      .in('code', ['SOURCES', 'SOURCE'])
      .single();

    if (systemError || !sourcesSystem) {
      throw new Error('SOURCES lottery system not found in database');
    }

    console.log('SOURCES system ID:', sourcesSystem.id);

    // Step 3: Fetch all active agencies
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('is_active', true);

    if (agenciesError) {
      throw new Error(`Failed to fetch agencies: ${agenciesError.message}`);
    }

    console.log(`Found ${agencies?.length || 0} active agencies`);

    // Step 4: Fetch sales data from SOURCES API (3 grupo_id calls)
    console.log('Step 2: Fetching sales data from SOURCES API...');
    
    const grupoIds = ['534', '579', '551'];
    const allComerciosData: SourcesComercio[] = [];

    for (const grupoId of grupoIds) {
      console.log(`Fetching data for grupo_id: ${grupoId}`);

      // Try multiple parameter encodings for daterange
      const paramCandidates: URLSearchParams[] = [
        new URLSearchParams({
          daterange: JSON.stringify([formattedDate, formattedDate]),
          master_id: '3',
          comercializadora_id: '123',
          grupo_id: grupoId,
          divisa_id: '1'
        }),
        (() => {
          const p = new URLSearchParams({
            master_id: '3',
            comercializadora_id: '123',
            grupo_id: grupoId,
            divisa_id: '1'
          });
          p.append('daterange[]', formattedDate);
          p.append('daterange[]', formattedDate);
          return p;
        })()
      ];

      let salesData: any = null;
      let lastErrorBody: string | null = null;

      for (const qp of paramCandidates) {
        const url = `https://api.sourcesws.com/dashboard/reporte/venta/comercio/consolidado?${qp}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            // Some SOURCES endpoints require these headers to be present
            'Origin': 'https://admin.sourcesws.com',
            'Referer': 'https://admin.sourcesws.com/'
          }
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`Failed to fetch data for grupo_id ${grupoId} with params "${qp.toString()}": ${res.status} ${res.statusText} - ${errText}`);
          lastErrorBody = errText;
          continue;
        }

        salesData = await res.json();
        break;
      }

      if (!salesData) {
        console.error(`Giving up fetching grupo_id ${grupoId} after ${paramCandidates.length} attempts. Last error body: ${lastErrorBody || 'n/a'}`);
        continue;
      }

      console.log(`Response structure for grupo_id ${grupoId}:`, JSON.stringify(salesData).substring(0, 200));
      
      // Extract comercios array from response
      // Structure: { data: [{ comercios: [...] }] }
      let comercios: SourcesComercio[] = [];
      
      if (salesData?.data) {
        if (Array.isArray(salesData.data)) {
          // If data is array, look for comercios in first element
          if (salesData.data[0]?.comercios) {
            comercios = salesData.data[0].comercios;
          }
        } else if (salesData.data.comercios) {
          // If data is object with comercios
          comercios = salesData.data.comercios;
        }
      }
      
      console.log(`Found ${comercios.length} comercios for grupo_id ${grupoId}`);
      allComerciosData.push(...comercios);
    }

    console.log(`Total comercios fetched: ${allComerciosData.length}`);

    // Step 5: Find a user for database operations (fallback)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'encargada')
      .limit(1);

    const fallbackUserId = profiles?.[0]?.user_id;
    if (!fallbackUserId) {
      throw new Error('No encargada user found for database operations');
    }

    // Step 6: Process each agency
    const agencyResults: Array<{name: string, sales: number, prizes: number}> = [];
    let updatedCount = 0;

    for (const agency of agencies || []) {
      const mappingData = AGENCY_MAPPING[agency.id];
      
      if (!mappingData) {
        console.log(`Agency ${agency.name} (${agency.id}) not in SOURCES mapping, skipping`);
        continue;
      }

      console.log(`Processing agency: ${agency.name} -> ${mappingData.sourcesName}`);

      // Find comercio in the fetched data
      const comercioData = allComerciosData.find(
        c => c.comercio === mappingData.sourcesName
      );

      if (!comercioData) {
        console.log(`No data found for ${mappingData.sourcesName}`);
        continue;
      }

      const salesBs = comercioData.venta || 0;
      const prizesBs = comercioData.premio || 0;
      const balanceBs = salesBs - prizesBs;

      console.log(`${agency.name}: Sales=${salesBs} Bs, Prizes=${prizesBs} Bs`);

      // Check if summary already exists
      const { data: existingSummary } = await supabase
        .from('daily_cuadres_summary')
        .select('id')
        .eq('agency_id', agency.id)
        .eq('session_date', formattedDate)
        .eq('lottery_system_id', sourcesSystem.id)
        .maybeSingle();

      if (existingSummary) {
        // Update existing
        const { error: updateError } = await supabase
          .from('daily_cuadres_summary')
          .update({
            total_sales_bs: salesBs,
            total_prizes_bs: prizesBs,
            balance_bs: balanceBs,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSummary.id);

        if (updateError) {
          console.error(`Failed to update summary for ${agency.name}:`, updateError);
        } else {
          updatedCount++;
          agencyResults.push({ name: agency.name, sales: salesBs, prizes: prizesBs });
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('daily_cuadres_summary')
          .insert({
            user_id: fallbackUserId,
            agency_id: agency.id,
            session_date: formattedDate,
            lottery_system_id: sourcesSystem.id,
            total_sales_bs: salesBs,
            total_sales_usd: 0,
            total_prizes_bs: prizesBs,
            total_prizes_usd: 0,
            balance_bs: balanceBs,
            exchange_rate: 36,
            is_closed: false
          });

        if (insertError) {
          console.error(`Failed to insert summary for ${agency.name}:`, insertError);
        } else {
          updatedCount++;
          agencyResults.push({ name: agency.name, sales: salesBs, prizes: prizesBs });
        }
      }
    }

    console.log(`=== SOURCES SYNC COMPLETE: ${updatedCount} agencies updated ===`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          updatedAgenciesCount: updatedCount,
          agencyResults,
          date: target_date
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in sync-sources-agency:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
