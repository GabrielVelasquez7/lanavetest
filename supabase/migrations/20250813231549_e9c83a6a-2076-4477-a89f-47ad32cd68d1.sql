-- Verificar y recrear el trigger para manejar usuarios nuevos
-- Primero eliminar el trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Verificar que tenemos el enum correcto
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('taquillero', 'encargado', 'administrador');
    END IF;
END $$;

-- Recrear la función del trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, agency_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.user_role,
      'taquillero'::public.user_role
    ),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'agency_id' IS NULL OR 
           NEW.raw_user_meta_data ->> 'agency_id' = '' OR
           NEW.raw_user_meta_data ->> 'agency_id' = 'null'
      THEN NULL
      ELSE (NEW.raw_user_meta_data ->> 'agency_id')::uuid
    END
  );
  RETURN NEW;
END;
$function$;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();