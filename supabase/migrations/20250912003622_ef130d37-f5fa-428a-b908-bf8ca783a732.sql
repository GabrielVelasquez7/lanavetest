-- Eliminar campos duplicados en español de daily_cuadres_summary
ALTER TABLE public.daily_cuadres_summary 
DROP COLUMN IF EXISTS total_gastos_bs,
DROP COLUMN IF EXISTS total_gastos_usd,
DROP COLUMN IF EXISTS total_deudas_bs,
DROP COLUMN IF EXISTS total_deudas_usd,
DROP COLUMN IF EXISTS pago_movil_recibidos,
DROP COLUMN IF EXISTS pago_movil_pagados,
DROP COLUMN IF EXISTS premios_por_pagar,
DROP COLUMN IF EXISTS cuadre_ventas_premios_bs,
DROP COLUMN IF EXISTS cuadre_ventas_premios_usd,
DROP COLUMN IF EXISTS total_banco,
DROP COLUMN IF EXISTS sumatoria_bolivares,
DROP COLUMN IF EXISTS diferencia_cierre;

-- Agregar campos faltantes si no existen
ALTER TABLE public.daily_cuadres_summary
ADD COLUMN IF NOT EXISTS total_debt_bs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_debt_usd numeric DEFAULT 0;