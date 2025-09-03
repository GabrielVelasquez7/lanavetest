-- Fix the venezuela_now function with proper permissions and schema search
DROP FUNCTION IF EXISTS public.venezuela_now();

CREATE OR REPLACE FUNCTION public.venezuela_now()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN timezone('America/Caracas', now());
END;
$function$;

-- Recreate the trigger function with proper search path
DROP FUNCTION IF EXISTS public.update_updated_at_column_venezuela();

CREATE OR REPLACE FUNCTION public.update_updated_at_column_venezuela()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = public.venezuela_now();
    RETURN NEW;
END;
$function$;