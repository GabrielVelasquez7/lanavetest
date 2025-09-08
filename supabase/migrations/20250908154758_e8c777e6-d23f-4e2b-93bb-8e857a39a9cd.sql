-- Allow encargadas to view all profiles for supervision purposes
CREATE POLICY "Encargadas can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (get_current_user_role() = 'encargada'::user_role);