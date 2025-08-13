-- Create a security definer function to get current user's role
-- This prevents RLS recursion issues when checking roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Update RLS policies to use role-based access instead of hardcoded UUIDs

-- Update agencies policies
DROP POLICY IF EXISTS "Admin user can manage all agencies" ON public.agencies;
CREATE POLICY "Admin users can manage all agencies" 
ON public.agencies 
FOR ALL 
USING (public.get_current_user_role() = 'administrador');

-- Update daily_sessions policies  
DROP POLICY IF EXISTS "Admin user can manage all sessions" ON public.daily_sessions;
CREATE POLICY "Admin users can manage all sessions" 
ON public.daily_sessions 
FOR ALL 
USING (public.get_current_user_role() = 'administrador');

-- Update expenses policies
DROP POLICY IF EXISTS "Admin user can view all expenses" ON public.expenses;
CREATE POLICY "Admin users can view all expenses" 
ON public.expenses 
FOR SELECT 
USING (public.get_current_user_role() = 'administrador');

-- Update lottery_systems policies
DROP POLICY IF EXISTS "Admin user can manage lottery systems" ON public.lottery_systems;
DROP POLICY IF EXISTS "Anyone can view active lottery systems" ON public.lottery_systems;
CREATE POLICY "Admin users can manage lottery systems" 
ON public.lottery_systems 
FOR ALL 
USING (public.get_current_user_role() = 'administrador');
CREATE POLICY "Anyone can view active lottery systems" 
ON public.lottery_systems 
FOR SELECT 
USING (is_active = true OR public.get_current_user_role() = 'administrador');

-- Update mobile_payments policies
DROP POLICY IF EXISTS "Admin user can view all mobile payments" ON public.mobile_payments;
CREATE POLICY "Admin users can view all mobile payments" 
ON public.mobile_payments 
FOR SELECT 
USING (public.get_current_user_role() = 'administrador');

-- Update point_of_sale policies
DROP POLICY IF EXISTS "Admin user can view all POS transactions" ON public.point_of_sale;
CREATE POLICY "Admin users can view all POS transactions" 
ON public.point_of_sale 
FOR SELECT 
USING (public.get_current_user_role() = 'administrador');

-- Update prize_transactions policies
DROP POLICY IF EXISTS "Admin user can view all prize transactions" ON public.prize_transactions;
CREATE POLICY "Admin users can view all prize transactions" 
ON public.prize_transactions 
FOR SELECT 
USING (public.get_current_user_role() = 'administrador');

-- Update profiles policies
DROP POLICY IF EXISTS "Admin user can manage all profiles" ON public.profiles;
CREATE POLICY "Admin users can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (public.get_current_user_role() = 'administrador');

-- Update sales_transactions policies
DROP POLICY IF EXISTS "Admin user can view all sales transactions" ON public.sales_transactions;
CREATE POLICY "Admin users can view all sales transactions" 
ON public.sales_transactions 
FOR SELECT 
USING (public.get_current_user_role() = 'administrador');

-- Ensure the existing admin user has the correct role
UPDATE public.profiles 
SET role = 'administrador' 
WHERE user_id = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc';