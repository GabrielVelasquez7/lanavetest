-- Update the test record with the correct values from cuadre general
UPDATE public.daily_cuadres_summary 
SET 
  -- Basic totals (already correct)
  total_sales_bs = 13150.00,
  total_sales_usd = 97.50,
  total_prizes_bs = 6600.00,
  total_prizes_usd = 0.00,
  
  -- Exchange rate
  exchange_rate = 153.00,
  
  -- Cash available
  cash_available_bs = 1695.00,
  cash_available_usd = 25.00,
  
  -- Correct values from cuadre general
  total_gastos_bs = 0.00,
  total_gastos_usd = 0.00,
  total_deudas_bs = 0.00,
  total_deudas_usd = 74.00,
  pago_movil_recibidos = 2095.00,
  pago_movil_pagados = 0.00,
  total_pos_bs = 5530.00,
  premios_por_pagar = 0.00,
  
  -- Calculated values
  cuadre_ventas_premios_bs = 13150.00 - 6600.00, -- 6550.00
  cuadre_ventas_premios_usd = 97.50 - 0.00, -- 97.50
  total_banco = 2095.00 + 5530.00, -- 7625.00
  excess_usd = 229.50, -- Excedente USD → Bs
  sumatoria_bolivares = 1695.00 + 7625.00 + 0.00 - 0.00 + 229.50, -- 9549.50
  diferencia_cierre = (1695.00 + 7625.00 + 0.00 - 0.00 + 229.50) - 6550.00, -- 2999.50
  diferencia_final = 2999.50 - 0.00, -- 2999.50
  
  -- Update balance_bs to match diferencia_final
  balance_bs = 2999.50

WHERE session_id = '8f1214ea-b636-49a0-ae1b-0790d5d43ea6';