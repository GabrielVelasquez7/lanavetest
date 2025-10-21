-- Tabla de detalles por sistema para el perfil de encargada
CREATE TABLE IF NOT EXISTS public.encargada_cuadre_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  session_date date NOT NULL,
  lottery_system_id uuid NOT NULL,
  sales_bs numeric NOT NULL DEFAULT 0,
  sales_usd numeric NOT NULL DEFAULT 0,
  prizes_bs numeric NOT NULL DEFAULT 0,
  prizes_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT venezuela_now(),
  updated_at timestamptz NOT NULL DEFAULT venezuela_now()
);

-- Unicidad: una fila por agencia/fecha/usuario/sistema
CREATE UNIQUE INDEX IF NOT EXISTS encargada_details_unique
ON public.encargada_cuadre_details (agency_id, session_date, user_id, lottery_system_id);

-- Índices de ayuda para consultas
CREATE INDEX IF NOT EXISTS idx_encargada_details_agency_date
ON public.encargada_cuadre_details (agency_id, session_date);

-- Habilitar RLS
ALTER TABLE public.encargada_cuadre_details ENABLE ROW LEVEL SECURITY;

-- Políticas (usando función existente has_role)
CREATE POLICY "Admin users can manage all encargada details"
ON public.encargada_cuadre_details
FOR ALL
USING (has_role(auth.uid(), 'administrador'::user_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::user_role));

CREATE POLICY "Encargadas can manage all encargada details"
ON public.encargada_cuadre_details
FOR ALL
USING (has_role(auth.uid(), 'encargada'::user_role))
WITH CHECK (has_role(auth.uid(), 'encargada'::user_role));

CREATE POLICY "Users can manage their own encargada details"
ON public.encargada_cuadre_details
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
