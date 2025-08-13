-- Security Fix 1: Restrict agencies access to authenticated users only
DROP POLICY IF EXISTS "Users can view agencies" ON public.agencies;
CREATE POLICY "Authenticated users can view agencies" 
ON public.agencies 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Security Fix 2: Restrict lottery systems access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active lottery systems" ON public.lottery_systems;
CREATE POLICY "Authenticated users can view active lottery systems" 
ON public.lottery_systems 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (is_active = true OR public.get_current_user_role() = 'administrador')
);

-- Security Fix 3: Update user profile policy to prevent role self-modification
-- We'll handle this by ensuring only admins can update roles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  public.get_current_user_role() = 'administrador'
);