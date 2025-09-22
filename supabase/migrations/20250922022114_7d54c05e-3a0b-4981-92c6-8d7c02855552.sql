-- Make session_id nullable in expenses and mobile_payments for encargada records
ALTER TABLE public.expenses 
ALTER COLUMN session_id DROP NOT NULL;

ALTER TABLE public.mobile_payments 
ALTER COLUMN session_id DROP NOT NULL;