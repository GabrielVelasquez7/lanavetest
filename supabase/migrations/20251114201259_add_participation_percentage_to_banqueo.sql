-- Add participation_percentage column to banqueo_transactions
ALTER TABLE public.banqueo_transactions
ADD COLUMN IF NOT EXISTS participation_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (participation_percentage >= 0 AND participation_percentage <= 100);

-- Add comment for clarity
COMMENT ON COLUMN public.banqueo_transactions.participation_percentage IS 'Percentage of participation commission for the client';

