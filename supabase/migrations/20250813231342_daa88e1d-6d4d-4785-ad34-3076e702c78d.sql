-- Create the user_role enum type that's missing
CREATE TYPE public.user_role AS ENUM ('taquillero', 'encargado', 'administrador');

-- Update the trigger function to properly handle the role conversion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Insert with security definer to bypass RLS
  INSERT INTO public.profiles (user_id, full_name, role, agency_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('taquillero', 'encargado', 'administrador') 
      THEN (NEW.raw_user_meta_data ->> 'role')::user_role
      ELSE 'taquillero'::user_role
    END,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'agency_id' IN ('null', '', 'none') OR NEW.raw_user_meta_data ->> 'agency_id' IS NULL
      THEN NULL
      ELSE (NEW.raw_user_meta_data ->> 'agency_id')::uuid
    END
  );
  RETURN NEW;
END;
$function$;