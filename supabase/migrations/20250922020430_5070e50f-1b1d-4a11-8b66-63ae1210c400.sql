-- Step 1: Make session_id nullable to support encargada records
ALTER TABLE public.daily_cuadres_summary 
ALTER COLUMN session_id DROP NOT NULL;

-- Step 2: Add lottery_system_id to daily_cuadres_summary to support detailed system tracking
ALTER TABLE public.daily_cuadres_summary 
ADD COLUMN IF NOT EXISTS lottery_system_id uuid REFERENCES public.lottery_systems(id);

-- Step 3: Add weekly closure fields to daily_cuadres_summary
ALTER TABLE public.daily_cuadres_summary 
ADD COLUMN IF NOT EXISTS week_start_date date,
ADD COLUMN IF NOT EXISTS week_end_date date,
ADD COLUMN IF NOT EXISTS is_weekly_closed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_closure_notes text;

-- Step 4: Migrate data from daily_system_cuadres to daily_cuadres_summary
-- Encargadas don't need session_id, so we'll set it to NULL
INSERT INTO public.daily_cuadres_summary (
  user_id,
  agency_id,
  session_date,
  lottery_system_id,
  total_sales_bs,
  total_sales_usd,
  total_prizes_bs,
  total_prizes_usd,
  balance_bs,
  session_id,
  created_at,
  updated_at
)
SELECT 
  dsc.user_id,
  dsc.agency_id,
  dsc.cuadre_date as session_date,
  dsc.lottery_system_id,
  dsc.amount_bs as total_sales_bs,
  dsc.amount_usd as total_sales_usd,
  0 as total_prizes_bs,
  0 as total_prizes_usd,
  dsc.amount_bs as balance_bs,
  NULL as session_id, -- Encargada records don't have sessions
  dsc.created_at,
  dsc.updated_at
FROM public.daily_system_cuadres dsc
WHERE NOT EXISTS (
  SELECT 1 FROM public.daily_cuadres_summary 
  WHERE user_id = dsc.user_id 
  AND session_date = dsc.cuadre_date 
  AND lottery_system_id = dsc.lottery_system_id
);

-- Step 5: Update RLS policies for daily_cuadres_summary to handle encargada role
DROP POLICY IF EXISTS "Encargadas can view all cuadres summary" ON public.daily_cuadres_summary;
DROP POLICY IF EXISTS "Encargadas can update review fields in cuadres summary" ON public.daily_cuadres_summary;

-- New policy for encargadas to manage all cuadres (view, insert, update)
CREATE POLICY "Encargadas can manage all cuadres summary" 
ON public.daily_cuadres_summary 
FOR ALL 
USING (get_current_user_role() = 'encargada'::user_role)
WITH CHECK (get_current_user_role() = 'encargada'::user_role);

-- Step 6: Drop the redundant tables
DROP TABLE IF EXISTS public.weekly_cuadres_details;
DROP TABLE IF EXISTS public.weekly_cuadres_summary;
DROP TABLE IF EXISTS public.daily_system_cuadres;

-- Step 7: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_cuadres_session_date ON public.daily_cuadres_summary(session_date);
CREATE INDEX IF NOT EXISTS idx_daily_cuadres_user_date ON public.daily_cuadres_summary(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_daily_cuadres_weekly ON public.daily_cuadres_summary(week_start_date, week_end_date) WHERE is_weekly_closed = true;