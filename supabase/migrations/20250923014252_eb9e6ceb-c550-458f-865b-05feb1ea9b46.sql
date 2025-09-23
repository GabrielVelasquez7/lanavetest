-- Limpiar todos los datos de cuadres y transacciones para empezar en limpio

-- Eliminar todos los cuadres diarios resumidos
DELETE FROM public.daily_cuadres_summary;

-- Eliminar todas las transacciones de ventas
DELETE FROM public.sales_transactions;

-- Eliminar todas las transacciones de premios
DELETE FROM public.prize_transactions;

-- Eliminar todos los premios pendientes
DELETE FROM public.pending_prizes;

-- Eliminar todos los gastos y deudas
DELETE FROM public.expenses;

-- Eliminar todos los pagos móviles
DELETE FROM public.mobile_payments;

-- Eliminar todas las transacciones de punto de venta
DELETE FROM public.point_of_sale;

-- Eliminar todos los préstamos inter-agencias
DELETE FROM public.inter_agency_loans;

-- Eliminar todas las deudas inter-agencias (se regenerarán automáticamente)
DELETE FROM public.inter_agency_debts;

-- Eliminar todas las sesiones diarias
DELETE FROM public.daily_sessions;

-- Reiniciar las secuencias si las hay (opcional)
-- Esto asegura que los IDs empiecen desde 1 nuevamente para cualquier secuencia