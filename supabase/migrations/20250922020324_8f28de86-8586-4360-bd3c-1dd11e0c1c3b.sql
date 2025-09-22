-- Step 1: Add lottery_system_id to daily_cuadres_summary to support detailed system tracking
ALTER TABLE public.daily_cuadres_summary 
ADD COLUMN lottery_system_id uuid REFERENCES public.lottery_systems(id);

-- Step 2: Add weekly closure fields to daily_cuadres_summary
ALTER TABLE public.daily_cuadres_summary 
ADD COLUMN week_start_date date,
ADD COLUMN week_end_date date,
ADD COLUMN is_weekly_closed boolean DEFAULT false,
ADD COLUMN weekly_closure_notes text;

-- Step 3: Migrate data from daily_system_cuadres to daily_cuadres_summary
-- First, we need to get the encargada user_id and create consolidated records
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
  0 as total_prizes_bs, -- These will need to be updated separately if needed
  0 as total_prizes_usd,
  dsc.amount_bs as balance_bs, -- Assuming sales = balance for now
  dsc.created_at,
  dsc.updated_at
FROM public.daily_system_cuadres dsc;

-- Step 4: Update RLS policies for daily_cuadres_summary to handle encargada role
DROP POLICY IF EXISTS "Encargadas can view all cuadres summary" ON public.daily_cuadres_summary;
DROP POLICY IF EXISTS "Encargadas can update review fields in cuadres summary" ON public.daily_cuadres_summary;

-- New policy for encargadas to manage all cuadres (view, insert, update)
CREATE POLICY "Encargadas can manage all cuadres summary" 
ON public.daily_cuadres_summary 
FOR ALL 
USING (get_current_user_role() = 'encargada'::user_role)
WITH CHECK (get_current_user_role() = 'encargada'::user_role);

-- Step 5: Drop the redundant tables
DROP TABLE IF EXISTS public.weekly_cuadres_details;
DROP TABLE IF EXISTS public.weekly_cuadres_summary;
DROP TABLE IF EXISTS public.daily_system_cuadres;

-- Step 6: Add index for better performance on date range queries
CREATE INDEX IF NOT EXISTS idx_daily_cuadres_session_date ON public.daily_cuadres_summary(session_date);
CREATE INDEX IF NOT EXISTS idx_daily_cuadres_user_date ON public.daily_cuadres_summary(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_daily_cuadres_weekly ON public.daily_cuadres_summary(week_start_date, week_end_date) WHERE is_weekly_closed = true;