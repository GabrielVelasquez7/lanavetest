-- Agregar columna para tasa de cambio diaria
ALTER TABLE daily_sessions 
ADD COLUMN exchange_rate NUMERIC DEFAULT 36.00;