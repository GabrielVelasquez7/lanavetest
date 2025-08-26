-- Fix RLS policies for profiles table to prevent unauthorized access

-- First, drop the existing problematic policies
DROP POLICY IF EXISTS "Admin users can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create secure RLS policies that properly restrict access

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Users can only update their own profile (except admins can update any)
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR get_current_user_role() = 'administrador'::user_role)
WITH CHECK (auth.uid() = user_id OR get_current_user_role() = 'administrador'::user_role);

-- Only admins can insert new profiles (for user creation)
CREATE POLICY "Admin users can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (get_current_user_role() = 'administrador'::user_role);

-- Only admins can delete profiles
CREATE POLICY "Admin users can delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (get_current_user_role() = 'administrador'::user_role);

-- Admins can view all profiles for management purposes
CREATE POLICY "Admin users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (get_current_user_role() = 'administrador'::user_role);