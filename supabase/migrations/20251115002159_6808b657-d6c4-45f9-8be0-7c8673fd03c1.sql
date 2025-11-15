-- Agregar columna participation_percentage a banqueo_transactions
ALTER TABLE public.banqueo_transactions 
ADD COLUMN participation_percentage numeric NOT NULL DEFAULT 0;