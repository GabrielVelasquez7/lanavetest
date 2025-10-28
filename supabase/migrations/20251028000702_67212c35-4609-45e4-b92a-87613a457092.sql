-- Add unique constraint for encargada cuadres (session_id NULL case)
-- This allows upsert to work properly with onConflict parameter

-- First, clean up any duplicates that might exist
-- Keep only the most recent record per user_id, agency_id, session_date combination where session_id is NULL
DELETE FROM public.daily_cuadres_summary a
USING public.daily_cuadres_summary b
WHERE 
  a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.agency_id = b.agency_id 
  AND a.session_date = b.session_date
  AND a.session_id IS NULL
  AND b.session_id IS NULL;

-- Create unique constraint for encargada records (where session_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS daily_cuadres_summary_encargada_unique 
ON public.daily_cuadres_summary (user_id, agency_id, session_date) 
WHERE session_id IS NULL;

-- Note: This partial unique index only applies when session_id IS NULL
-- This means encargada records (session_id NULL) must be unique per user/agency/date
-- while taquillera records (session_id NOT NULL) can have multiple entries