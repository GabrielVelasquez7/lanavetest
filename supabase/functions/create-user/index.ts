import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

// Lista de orígenes permitidos para CORS
const ALLOWED_ORIGINS = [
  'https://bdd3ec42-db8e-4092-9bdf-a0870d4f520c.lovableproject.com',
  'https://localhost:8080',
  'http://localhost:8080',
  'http://localhost:5173', // Vite dev server alternativo
]

// Función para obtener headers CORS seguros
function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== CREATE USER FUNCTION START ===')
    
    // Validar que las variables de entorno estén configuradas
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'Error de configuración del servidor',
          details: 'Variables de entorno no configuradas correctamente'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const requestData = await req.json()
    const { email, password, full_name, role, agency_id } = requestData

    console.log('Request data received:', { 
      email, 
      full_name, 
      role, 
      agency_id,
      hasPassword: !!password 
    })

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      console.error('Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Email, password, full_name, and role are required' }),
        { 
          status: 400, 
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate role
    const validRoles = ['taquillero', 'encargado', 'administrador', 'encargada']
    if (!validRoles.includes(role)) {
      console.error('Invalid role:', role)
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be taquillero, encargado, administrador, or encargada' }),
        { 
          status: 400, 
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Creating user in auth.users...')
    
    // Create user in auth.users table
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        full_name,
        role,
        agency_id: agency_id && agency_id !== 'none' ? agency_id : null
      },
      email_confirm: true // Auto-confirm email
    })

    if (authError) {
      console.error('Auth error details:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        details: authError
      })
      
      // More specific error messages
      let errorMessage = authError.message
      if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
        errorMessage = 'Este email ya está registrado en el sistema'
      } else if (authError.message?.includes('Password')) {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres'
      } else if (authError.message?.includes('Email')) {
        errorMessage = 'Email inválido'
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400, 
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('User created successfully:', authData.user?.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: full_name,
          role: role
        }
      }),
      { 
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in create-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
      }
    )
  }
})