-- Limpiar todos los datos de prueba relacionados a ventas, premios, gastos y cuadres
-- Mantenemos la estructura de las tablas, solo borramos los registros

-- Limpiar transacciones de ventas
DELETE FROM public.sales_transactions;

-- Limpiar transacciones de premios  
DELETE FROM public.prize_transactions;

-- Limpiar gastos
DELETE FROM public.expenses;

-- Limpiar pagos móviles
DELETE FROM public.mobile_payments;

-- Limpiar punto de venta
DELETE FROM public.point_of_sale;

-- Limpiar resúmenes de cuadres
DELETE FROM public.daily_cuadres_summary;

-- Limpiar sesiones diarias
DELETE FROM public.daily_sessions;