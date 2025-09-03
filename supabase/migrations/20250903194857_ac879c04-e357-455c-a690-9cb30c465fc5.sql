-- Create the venezuela_now() function for Venezuela timezone
CREATE OR REPLACE FUNCTION public.venezuela_now()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    RETURN timezone('America/Caracas', now());
END;
$function$;