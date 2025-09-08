-- Create table to store daily cuadres summary when taquillera confirms their closure
CREATE TABLE public.daily_cuadres_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.daily_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_date DATE NOT NULL,
  agency_id UUID REFERENCES public.agencies(id),
  
  -- Sales totals
  total_sales_bs NUMERIC NOT NULL DEFAULT 0,
  total_sales_usd NUMERIC NOT NULL DEFAULT 0,
  
  -- Prizes totals  
  total_prizes_bs NUMERIC NOT NULL DEFAULT 0,
  total_prizes_usd NUMERIC NOT NULL DEFAULT 0,
  
  -- Other transactions
  total_expenses_bs NUMERIC NOT NULL DEFAULT 0,
  total_expenses_usd NUMERIC NOT NULL DEFAULT 0,
  total_mobile_payments_bs NUMERIC NOT NULL DEFAULT 0,
  total_pos_bs NUMERIC NOT NULL DEFAULT 0,
  
  -- Cash available
  cash_available_bs NUMERIC NOT NULL DEFAULT 0,
  cash_available_usd NUMERIC NOT NULL DEFAULT 0,
  
  -- Exchange rate and balance
  exchange_rate NUMERIC NOT NULL DEFAULT 36,
  balance_bs NUMERIC NOT NULL DEFAULT 0,
  
  -- Session details
  is_closed BOOLEAN NOT NULL DEFAULT false,
  daily_closure_confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  closure_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  
  -- Ensure unique summary per session
  UNIQUE(session_id)
);

-- Enable RLS
ALTER TABLE public.daily_cuadres_summary ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own cuadres summary
CREATE POLICY "Users can manage their own cuadres summary" 
ON public.daily_cuadres_summary 
FOR ALL 
USING (auth.uid() = user_id);

-- Allow encargadas to view all cuadres summary for supervision
CREATE POLICY "Encargadas can view all cuadres summary" 
ON public.daily_cuadres_summary 
FOR SELECT 
USING (get_current_user_role() = 'encargada'::user_role);

-- Allow admin users to view all cuadres summary
CREATE POLICY "Admin users can view all cuadres summary" 
ON public.daily_cuadres_summary 
FOR SELECT 
USING (get_current_user_role() = 'administrador'::user_role);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_cuadres_summary_updated_at
BEFORE UPDATE ON public.daily_cuadres_summary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();