
-- Eliminar datos de prueba de la semana 3-5 de noviembre 2025

-- Eliminar gastos de prueba
DELETE FROM expenses 
WHERE transaction_date BETWEEN '2025-11-03' AND '2025-11-05'
AND description IN (
  'Gastos operativos lunes',
  'Gastos operativos martes', 
  'Gastos operativos miércoles',
  'Deuda pendiente'
);

-- Eliminar resúmenes diarios de prueba
DELETE FROM daily_cuadres_summary
WHERE session_date BETWEEN '2025-11-03' AND '2025-11-05'
AND week_start_date = '2025-11-03'
AND week_end_date = '2025-11-09';

-- Eliminar detalles de cuadre de la encargada de prueba
DELETE FROM encargada_cuadre_details
WHERE session_date BETWEEN '2025-11-03' AND '2025-11-05';