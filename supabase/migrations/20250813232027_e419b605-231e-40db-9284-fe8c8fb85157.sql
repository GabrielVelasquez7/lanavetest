-- Add admin policies for all transaction tables so admin can see all data
CREATE POLICY "Admin user can view all sales transactions" 
ON public.sales_transactions 
FOR SELECT 
USING (auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);

CREATE POLICY "Admin user can view all prize transactions" 
ON public.prize_transactions 
FOR SELECT 
USING (auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);

CREATE POLICY "Admin user can view all expenses" 
ON public.expenses 
FOR SELECT 
USING (auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);

CREATE POLICY "Admin user can view all mobile payments" 
ON public.mobile_payments 
FOR SELECT 
USING (auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);

CREATE POLICY "Admin user can view all POS transactions" 
ON public.point_of_sale 
FOR SELECT 
USING (auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);