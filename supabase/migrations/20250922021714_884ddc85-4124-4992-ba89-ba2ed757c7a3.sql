-- Step 1: Add agency_id to expenses and mobile_payments for encargada records
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id),
ADD COLUMN IF NOT EXISTS transaction_date date DEFAULT CURRENT_DATE;

ALTER TABLE public.mobile_payments 
ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id),
ADD COLUMN IF NOT EXISTS transaction_date date DEFAULT CURRENT_DATE;

-- Step 2: Update RLS policies for expenses to handle encargada role
DROP POLICY IF EXISTS "Admin users can view all expenses" ON public.expenses;

-- New policies for expenses
CREATE POLICY "Encargadas can manage all expenses" 
ON public.expenses 
FOR ALL 
USING (get_current_user_role() = 'encargada'::user_role)
WITH CHECK (get_current_user_role() = 'encargada'::user_role);

CREATE POLICY "Admin users can manage all expenses" 
ON public.expenses 
FOR ALL 
USING (get_current_user_role() = 'administrador'::user_role)
WITH CHECK (get_current_user_role() = 'administrador'::user_role);

-- Step 3: Update RLS policies for mobile_payments to handle encargada role
DROP POLICY IF EXISTS "Admin users can view all mobile payments" ON public.mobile_payments;

-- New policies for mobile_payments
CREATE POLICY "Encargadas can manage all mobile payments" 
ON public.mobile_payments 
FOR ALL 
USING (get_current_user_role() = 'encargada'::user_role)
WITH CHECK (get_current_user_role() = 'encargada'::user_role);

CREATE POLICY "Admin users can manage all mobile payments" 
ON public.mobile_payments 
FOR ALL 
USING (get_current_user_role() = 'administrador'::user_role)
WITH CHECK (get_current_user_role() = 'administrador'::user_role);

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_agency_date ON public.expenses(agency_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_mobile_payments_agency_date ON public.mobile_payments(agency_id, transaction_date);