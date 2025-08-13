-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all agencies" ON agencies;  
DROP POLICY IF EXISTS "Admins can manage all sessions" ON daily_sessions;
DROP POLICY IF EXISTS "Anyone can view active lottery systems" ON lottery_systems;
DROP POLICY IF EXISTS "Admins can manage lottery systems" ON lottery_systems;
DROP POLICY IF EXISTS "Taquilleras can view their agency" ON agencies;

-- Fix the trigger function to bypass RLS and handle agency_id properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Insert with security definer to bypass RLS
  INSERT INTO public.profiles (user_id, full_name, role, agency_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::user_role,
      'taquillero'::user_role
    ),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'agency_id' IN ('null', '', 'none') OR NEW.raw_user_meta_data ->> 'agency_id' IS NULL
      THEN NULL
      ELSE (NEW.raw_user_meta_data ->> 'agency_id')::uuid
    END
  );
  RETURN NEW;
END;
$function$;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admin policy using specific user ID to avoid recursion
CREATE POLICY "Admin user can manage all profiles" 
ON public.profiles 
FOR ALL
TO authenticated
USING (auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);

-- Agencies policies
CREATE POLICY "Admin user can manage all agencies" 
ON public.agencies 
FOR ALL
TO authenticated
USING (auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);

CREATE POLICY "Users can view agencies" 
ON public.agencies 
FOR SELECT
TO authenticated
USING (true);

-- Sessions policies  
CREATE POLICY "Admin user can manage all sessions" 
ON public.daily_sessions 
FOR ALL
TO authenticated
USING (auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);

-- Lottery systems policies
CREATE POLICY "Anyone can view active lottery systems" 
ON public.lottery_systems 
FOR SELECT
TO authenticated
USING (is_active = true OR auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);

CREATE POLICY "Admin user can manage lottery systems" 
ON public.lottery_systems 
FOR ALL
TO authenticated
USING (auth.uid() = '8e1640f1-35e8-4ade-b289-a0c2ce2d0abc'::uuid);