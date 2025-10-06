// Edge Function: trigger-maxplaygo-sync
// Dispara el workflow de sincronización (con input opcional de fecha)
// CORS habilitado y respuesta simplificada

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { target_date } = await req.json().catch(() => ({ target_date: undefined }));

    // Secrets de Supabase (configurados en Settings > Functions)
    const GH_TOKEN = Deno.env.get("GITHUB_TOKEN");
    const GH_REPO = Deno.env.get("GITHUB_REPO") || Deno.env.get("GH_REPO"); // owner/repo
    const GH_WORKFLOW = Deno.env.get("GITHUB_WORKFLOW") || Deno.env.get("GH_WORKFLOW") || "maxplaygo-sync.yml"; // archivo del workflow
    const GH_REF = Deno.env.get("GITHUB_REF") || "main"; // rama por defecto

    if (!GH_TOKEN || !GH_REPO) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan secretos: GITHUB_TOKEN o GITHUB_REPO" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const apiUrl = `https://api.github.com/repos/${GH_REPO}/actions/workflows/${GH_WORKFLOW}/dispatches`;

    const body = {
      ref: GH_REF,
      inputs: target_date ? { date: target_date } : {},
    };

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GH_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("GitHub dispatch error:", resp.status, text);
      return new Response(
        JSON.stringify({ success: false, error: `GitHub API ${resp.status}: ${text}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Sincronización iniciada" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    console.error("Trigger error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});