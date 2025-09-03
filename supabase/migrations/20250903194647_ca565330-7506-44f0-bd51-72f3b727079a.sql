-- Add cash_available_usd column to daily_sessions table
ALTER TABLE public.daily_sessions 
ADD COLUMN cash_available_usd NUMERIC DEFAULT 0;