-- Add missing fields to daily_cuadres_summary table
ALTER TABLE public.daily_cuadres_summary 
ADD COLUMN total_gastos_bs NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN total_gastos_usd NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN total_deudas_bs NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN total_deudas_usd NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN pago_movil_recibidos NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN pago_movil_pagados NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN premios_por_pagar NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN cuadre_ventas_premios_bs NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN cuadre_ventas_premios_usd NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN total_banco NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN excess_usd NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN sumatoria_bolivares NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN diferencia_cierre NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN diferencia_final NUMERIC NOT NULL DEFAULT 0;