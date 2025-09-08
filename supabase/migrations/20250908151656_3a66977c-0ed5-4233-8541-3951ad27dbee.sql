-- Add foreign key constraint between daily_system_cuadres and lottery_systems
ALTER TABLE public.daily_system_cuadres 
ADD CONSTRAINT daily_system_cuadres_lottery_system_id_fkey 
FOREIGN KEY (lottery_system_id) REFERENCES public.lottery_systems(id);

-- Add foreign key constraint between daily_system_cuadres and agencies
ALTER TABLE public.daily_system_cuadres 
ADD CONSTRAINT daily_system_cuadres_agency_id_fkey 
FOREIGN KEY (agency_id) REFERENCES public.agencies(id);

-- Update RLS policies to allow encargadas to see all agency data
DROP POLICY IF EXISTS "Encargadas can manage their agency cuadres" ON public.daily_system_cuadres;

CREATE POLICY "Encargadas can manage all agency cuadres" 
ON public.daily_system_cuadres 
FOR ALL 
USING (get_current_user_role() = 'encargada'::user_role);

-- Update daily_sessions RLS to allow encargadas to view sessions from all agencies
CREATE POLICY "Encargadas can view all sessions" 
ON public.daily_sessions 
FOR SELECT 
USING (get_current_user_role() = 'encargada'::user_role);