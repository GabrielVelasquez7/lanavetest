-- Create table for weekly cuadre configuration
CREATE TABLE IF NOT EXISTS public.weekly_cuadre_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  exchange_rate numeric NOT NULL DEFAULT 36,
  cash_bs numeric NOT NULL DEFAULT 0,
  dollars_to_bs numeric NOT NULL DEFAULT 0,
  excess_usd numeric NOT NULL DEFAULT 0,
  final_difference numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT venezuela_now(),
  updated_at timestamptz NOT NULL DEFAULT venezuela_now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE(agency_id, week_start_date, week_end_date)
);

-- Enable RLS
ALTER TABLE public.weekly_cuadre_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin users can manage all weekly cuadre config"
  ON public.weekly_cuadre_config
  FOR ALL
  USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Encargadas can manage all weekly cuadre config"
  ON public.weekly_cuadre_config
  FOR ALL
  USING (has_role(auth.uid(), 'encargada'));

-- Trigger for updated_at
CREATE TRIGGER update_weekly_cuadre_config_updated_at
  BEFORE UPDATE ON public.weekly_cuadre_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_venezuela();

-- Index for better performance
CREATE INDEX idx_weekly_cuadre_config_agency_week 
  ON public.weekly_cuadre_config(agency_id, week_start_date, week_end_date);

-- Comment
COMMENT ON TABLE public.weekly_cuadre_config IS 'Configuration for weekly cuadre including exchange rate, cash, and dollar calculations';