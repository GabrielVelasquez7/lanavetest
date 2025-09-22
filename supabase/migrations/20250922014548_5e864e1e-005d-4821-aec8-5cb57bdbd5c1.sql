-- Create table for weekly cuadres summary for encargadas
CREATE TABLE public.weekly_cuadres_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  encargada_id UUID NOT NULL,
  agency_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_sales_bs NUMERIC NOT NULL DEFAULT 0,
  total_sales_usd NUMERIC NOT NULL DEFAULT 0,
  total_prizes_bs NUMERIC NOT NULL DEFAULT 0,
  total_prizes_usd NUMERIC NOT NULL DEFAULT 0,
  total_balance_bs NUMERIC NOT NULL DEFAULT 0,
  total_balance_usd NUMERIC NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  closure_notes TEXT,
  
  -- Ensure unique weekly summary per encargada and week
  UNIQUE(encargada_id, week_start_date, week_end_date)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_cuadres_summary ENABLE ROW LEVEL SECURITY;

-- Create policies for weekly cuadres summary
CREATE POLICY "Encargadas can manage their own weekly cuadres" 
ON public.weekly_cuadres_summary 
FOR ALL 
USING (auth.uid() = encargada_id);

CREATE POLICY "Admin users can view all weekly cuadres" 
ON public.weekly_cuadres_summary 
FOR SELECT 
USING (get_current_user_role() = 'administrador'::user_role);

-- Create table for weekly cuadres details (daily breakdown)
CREATE TABLE public.weekly_cuadres_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_summary_id UUID NOT NULL REFERENCES public.weekly_cuadres_summary(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  day_name TEXT NOT NULL, -- 'Lunes', 'Martes', etc.
  total_sales_bs NUMERIC NOT NULL DEFAULT 0,
  total_sales_usd NUMERIC NOT NULL DEFAULT 0,
  total_prizes_bs NUMERIC NOT NULL DEFAULT 0,
  total_prizes_usd NUMERIC NOT NULL DEFAULT 0,
  balance_bs NUMERIC NOT NULL DEFAULT 0,
  balance_usd NUMERIC NOT NULL DEFAULT 0,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  
  -- Ensure unique daily detail per weekly summary
  UNIQUE(weekly_summary_id, day_date)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_cuadres_details ENABLE ROW LEVEL SECURITY;

-- Create policies for weekly cuadres details
CREATE POLICY "Encargadas can manage weekly cuadres details through summary" 
ON public.weekly_cuadres_details 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.weekly_cuadres_summary 
  WHERE id = weekly_cuadres_details.weekly_summary_id 
  AND encargada_id = auth.uid()
));

CREATE POLICY "Admin users can view all weekly cuadres details" 
ON public.weekly_cuadres_details 
FOR SELECT 
USING (get_current_user_role() = 'administrador'::user_role);

-- Create function to get current week boundaries (Monday to Sunday)
CREATE OR REPLACE FUNCTION public.get_current_week_boundaries()
RETURNS TABLE(week_start DATE, week_end DATE, week_number INTEGER, year INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_date_venezuela DATE;
  days_from_monday INTEGER;
  week_start_calc DATE;
  week_end_calc DATE;
  week_num INTEGER;
  current_year INTEGER;
BEGIN
  -- Get current date in Venezuela timezone
  current_date_venezuela := DATE(venezuela_now());
  
  -- Calculate days from Monday (1 = Monday, 7 = Sunday)
  days_from_monday := EXTRACT(DOW FROM current_date_venezuela);
  IF days_from_monday = 0 THEN
    days_from_monday := 7; -- Sunday becomes 7
  END IF;
  days_from_monday := days_from_monday - 1; -- Adjust so Monday = 0
  
  -- Calculate week boundaries
  week_start_calc := current_date_venezuela - INTERVAL '1 day' * days_from_monday;
  week_end_calc := week_start_calc + INTERVAL '6 days';
  
  -- Get week number and year
  week_num := EXTRACT(WEEK FROM week_start_calc);
  current_year := EXTRACT(YEAR FROM week_start_calc);
  
  RETURN QUERY SELECT week_start_calc, week_end_calc, week_num, current_year;
END;
$$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_weekly_cuadres_summary_updated_at
BEFORE UPDATE ON public.weekly_cuadres_summary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();

CREATE TRIGGER update_weekly_cuadres_details_updated_at
BEFORE UPDATE ON public.weekly_cuadres_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();