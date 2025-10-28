-- Add total_banco_bs column to daily_cuadres_summary
ALTER TABLE public.daily_cuadres_summary 
ADD COLUMN total_banco_bs numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.daily_cuadres_summary.total_banco_bs IS 'Total en banco: Pago Móvil Recibidos + Punto de Venta - Pago Móvil Pagados';