-- Tabla para almacenar porcentajes de comisión por sistema
CREATE TABLE IF NOT EXISTS public.system_commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_system_id UUID NOT NULL REFERENCES public.lottery_systems(id) ON DELETE CASCADE,
  commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  utility_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (utility_percentage >= 0 AND utility_percentage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT venezuela_now(),
  UNIQUE(lottery_system_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_system_commission_rates_lottery_system ON public.system_commission_rates(lottery_system_id);
CREATE INDEX idx_system_commission_rates_active ON public.system_commission_rates(is_active);

-- RLS Policies
ALTER TABLE public.system_commission_rates ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden modificar
CREATE POLICY "Admin users can manage system commission rates"
ON public.system_commission_rates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador'::user_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::user_role));

-- Encargadas pueden ver
CREATE POLICY "Encargadas can view system commission rates"
ON public.system_commission_rates
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'encargada'::user_role));

-- Trigger para updated_at
CREATE TRIGGER update_system_commission_rates_updated_at
BEFORE UPDATE ON public.system_commission_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();

COMMENT ON TABLE public.system_commission_rates IS 'Almacena los porcentajes de comisión configurables por el administrador para cada sistema de lotería';