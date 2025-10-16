-- Limpiar todas las tablas de cuadres para testing
-- IMPORTANTE: Esto eliminará TODOS los datos de cuadres

-- Eliminar datos de las tablas dependientes primero
DELETE FROM daily_cuadres_summary;
DELETE FROM pending_prizes;
DELETE FROM point_of_sale;
DELETE FROM mobile_payments;
DELETE FROM expenses;
DELETE FROM prize_transactions;
DELETE FROM sales_transactions;
DELETE FROM daily_sessions;