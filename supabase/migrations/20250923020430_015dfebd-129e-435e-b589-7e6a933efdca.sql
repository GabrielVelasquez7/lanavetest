-- Agregar política RLS para encargadas en point_of_sale
CREATE POLICY "Encargadas can manage all POS transactions" 
ON public.point_of_sale 
FOR ALL 
USING (get_current_user_role() = 'encargada'::user_role)
WITH CHECK (get_current_user_role() = 'encargada'::user_role);