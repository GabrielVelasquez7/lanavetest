-- Add missing columns to weekly_cuadre_config
ALTER TABLE public.weekly_cuadre_config
ADD COLUMN IF NOT EXISTS cash_available_bs numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_available_usd numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS closure_notes text,
ADD COLUMN IF NOT EXISTS additional_amount_bs numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_amount_usd numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_notes text,
ADD COLUMN IF NOT EXISTS apply_excess_usd boolean NOT NULL DEFAULT true;

-- Remove old unused columns
ALTER TABLE public.weekly_cuadre_config
DROP COLUMN IF EXISTS cash_bs,
DROP COLUMN IF EXISTS dollars_to_bs;