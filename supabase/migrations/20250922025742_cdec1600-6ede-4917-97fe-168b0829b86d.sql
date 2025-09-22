-- Add agency_id and transaction_date columns to point_of_sale table for encargada workflow
ALTER TABLE public.point_of_sale 
ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id),
ADD COLUMN IF NOT EXISTS transaction_date date DEFAULT CURRENT_DATE;