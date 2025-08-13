-- First, we need to drop dependent objects and recreate them
-- Drop policies that depend on user_role
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all agencies" ON agencies;  
DROP POLICY IF EXISTS "Admins can manage all sessions" ON daily_sessions;
DROP POLICY IF EXISTS "Anyone can view active lottery systems" ON lottery_systems;
DROP POLICY IF EXISTS "Admins can manage lottery systems" ON lottery_systems;

-- Drop the function that depends on user_role
DROP FUNCTION IF EXISTS get_user_role(uuid);

-- Now update the enum
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM ('taquillero', 'encargado', 'administrador');

-- Update existing profiles with new role mapping
ALTER TABLE profiles 
ALTER COLUMN role DROP DEFAULT;

ALTER TABLE profiles 
ALTER COLUMN role TYPE user_role 
USING CASE 
  WHEN role::text = 'admin' THEN 'administrador'::user_role
  WHEN role::text = 'administrador' THEN 'administrador'::user_role  
  WHEN role::text = 'supervisor' THEN 'encargado'::user_role
  WHEN role::text = 'taquillera' THEN 'taquillero'::user_role
  ELSE 'taquillero'::user_role
END;

ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'taquillero'::user_role;

-- Drop old enum
DROP TYPE user_role_old;

-- Recreate the function with new enum
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM public.profiles WHERE profiles.user_id = $1;
$function$;

-- Recreate the policies
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'administrador'::user_role);

CREATE POLICY "Admins can manage all agencies" 
ON public.agencies 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'administrador'::user_role);

CREATE POLICY "Admins can manage all sessions" 
ON public.daily_sessions 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'administrador'::user_role);

CREATE POLICY "Anyone can view active lottery systems" 
ON public.lottery_systems 
FOR SELECT
TO authenticated
USING ((is_active = true) OR (get_user_role(auth.uid()) = 'administrador'::user_role));

CREATE POLICY "Admins can manage lottery systems" 
ON public.lottery_systems 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'administrador'::user_role);