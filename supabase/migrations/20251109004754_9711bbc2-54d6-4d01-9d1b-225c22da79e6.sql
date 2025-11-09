-- Add USD commission fields to system_commission_rates table
ALTER TABLE public.system_commission_rates
ADD COLUMN IF NOT EXISTS commission_percentage_usd numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS utility_percentage_usd numeric NOT NULL DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.system_commission_rates.commission_percentage IS 'Commission percentage for Bolivares transactions';
COMMENT ON COLUMN public.system_commission_rates.commission_percentage_usd IS 'Commission percentage for USD transactions';
COMMENT ON COLUMN public.system_commission_rates.utility_percentage IS 'Utility percentage for Bolivares transactions';
COMMENT ON COLUMN public.system_commission_rates.utility_percentage_usd IS 'Utility percentage for USD transactions';