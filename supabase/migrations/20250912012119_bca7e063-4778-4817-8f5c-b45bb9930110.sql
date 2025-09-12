-- Add pending_prizes column to track "Premios por pagar" separately from debts
ALTER TABLE public.daily_cuadres_summary
ADD COLUMN IF NOT EXISTS pending_prizes numeric NOT NULL DEFAULT 0;