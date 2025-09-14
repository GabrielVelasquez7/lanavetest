-- Add UPDATE policy for encargadas to review cuadres
CREATE POLICY "Encargadas can update review fields in cuadres summary"
ON public.daily_cuadres_summary
FOR UPDATE
USING (get_current_user_role() = 'encargada'::user_role)
WITH CHECK (get_current_user_role() = 'encargada'::user_role);