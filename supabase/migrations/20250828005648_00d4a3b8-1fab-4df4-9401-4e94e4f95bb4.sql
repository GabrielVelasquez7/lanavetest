-- Arreglar el search_path para las funciones venezuela_now y update_updated_at_column_venezuela
CREATE OR REPLACE FUNCTION public.venezuela_now() 
RETURNS timestamp with time zone AS $$
BEGIN
    RETURN timezone('America/Caracas', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.update_updated_at_column_venezuela()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = venezuela_now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';