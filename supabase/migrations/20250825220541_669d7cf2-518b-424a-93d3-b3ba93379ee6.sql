-- Create user using admin API
-- This requires direct insertion since we can't call the edge function from SQL
-- We'll insert directly into auth.users and profiles

-- First, let's create the user entry manually (this would normally be done by auth.admin.createUser)
-- Note: In production this would be handled by the create-user edge function
-- For now, we'll create the profile entry assuming the user will be created via the API

-- Insert a temporary profile that will be updated when the actual user signs up
INSERT INTO public.profiles (
  user_id,
  full_name, 
  role,
  agency_id,
  is_active
) VALUES (
  gen_random_uuid(), -- This would normally be the auth.users.id
  'Usuario Prueba Taquillero',
  'taquillero'::user_role,
  '4e331754-2ca9-44c6-8a9f-c9888a9ccf10', -- Agencia Central
  true
);