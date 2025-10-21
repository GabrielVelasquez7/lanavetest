-- Eliminar datos de prueba de BARALT para 2025-10-20

-- Eliminar de encargada_cuadre_details
DELETE FROM encargada_cuadre_details 
WHERE agency_id = '97e6b008-51eb-47b1-9c06-6fc173340a42' 
  AND session_date = '2025-10-20';

-- Eliminar de daily_cuadres_summary (nivel agencia)
DELETE FROM daily_cuadres_summary 
WHERE agency_id = '97e6b008-51eb-47b1-9c06-6fc173340a42' 
  AND session_date = '2025-10-20' 
  AND session_id IS NULL;