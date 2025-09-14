-- Add fields to daily_cuadres_summary for encargada review process
ALTER TABLE public.daily_cuadres_summary 
ADD COLUMN encargada_status text DEFAULT 'pendiente'::text CHECK (encargada_status IN ('pendiente', 'aprobado', 'rechazado')),
ADD COLUMN encargada_observations text,
ADD COLUMN encargada_reviewed_by uuid,
ADD COLUMN encargada_reviewed_at timestamp with time zone;

-- Add foreign key reference for the encargada who reviewed
COMMENT ON COLUMN public.daily_cuadres_summary.encargada_reviewed_by IS 'ID of the encargada who reviewed this cuadre';
COMMENT ON COLUMN public.daily_cuadres_summary.encargada_status IS 'Status assigned by encargada: pendiente, aprobado, rechazado';
COMMENT ON COLUMN public.daily_cuadres_summary.encargada_observations IS 'Observations or corrections noted by the encargada';