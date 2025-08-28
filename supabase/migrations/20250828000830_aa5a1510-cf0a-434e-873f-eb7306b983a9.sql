-- Add cash_available field to daily_sessions table
ALTER TABLE public.daily_sessions 
ADD COLUMN cash_available_bs numeric DEFAULT 0,
ADD COLUMN daily_closure_confirmed boolean DEFAULT false,
ADD COLUMN closure_notes text;