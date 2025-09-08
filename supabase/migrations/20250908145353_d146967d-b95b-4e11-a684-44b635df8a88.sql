-- Create table for daily system cuadres by encargadas
CREATE TABLE public.daily_system_cuadres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agency_id UUID,
  cuadre_date DATE NOT NULL,
  lottery_system_id UUID NOT NULL,
  amount_bs NUMERIC NOT NULL DEFAULT 0,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  UNIQUE(user_id, agency_id, cuadre_date, lottery_system_id)
);

-- Enable Row Level Security
ALTER TABLE public.daily_system_cuadres ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_system_cuadres
CREATE POLICY "Encargadas can manage their agency cuadres" 
ON public.daily_system_cuadres 
FOR ALL 
USING (
  get_current_user_role() = 'encargada'::user_role 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.agency_id = daily_system_cuadres.agency_id
  )
);

CREATE POLICY "Admin users can view all daily system cuadres" 
ON public.daily_system_cuadres 
FOR SELECT 
USING (get_current_user_role() = 'administrador'::user_role);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_system_cuadres_updated_at
BEFORE UPDATE ON public.daily_system_cuadres
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();