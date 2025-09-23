-- Permitir que session_id sea nullable en point_of_sale para encargadas
ALTER TABLE public.point_of_sale 
ALTER COLUMN session_id DROP NOT NULL;