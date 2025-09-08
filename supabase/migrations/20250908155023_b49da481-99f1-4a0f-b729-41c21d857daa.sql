-- Allow encargadas to view all sales transactions for supervision
CREATE POLICY "Encargadas can view all sales transactions" 
ON public.sales_transactions 
FOR SELECT 
USING (get_current_user_role() = 'encargada'::user_role);

-- Allow encargadas to view all prize transactions for supervision  
CREATE POLICY "Encargadas can view all prize transactions" 
ON public.prize_transactions 
FOR SELECT 
USING (get_current_user_role() = 'encargada'::user_role);