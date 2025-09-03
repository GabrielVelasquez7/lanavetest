-- Update only the trigger function to use proper schema reference
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