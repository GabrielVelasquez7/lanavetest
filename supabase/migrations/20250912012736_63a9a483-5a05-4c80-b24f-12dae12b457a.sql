-- Add policy for encargadas to view all agencies
CREATE POLICY "Encargadas can view all agencies" 
ON public.agencies 
FOR SELECT 
USING (get_current_user_role() = 'encargada'::user_role);