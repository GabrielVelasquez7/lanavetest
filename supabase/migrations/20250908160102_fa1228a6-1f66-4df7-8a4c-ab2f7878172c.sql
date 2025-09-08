-- Update the test record with correct calculated values using the exact formula from CuadreGeneral
UPDATE public.daily_cuadres_summary 
SET 
  -- Basic totals (already correct)
  total_sales_bs = 13150.00,
  total_sales_usd = 97.50,
  total_prizes_bs = 6600.00,
  total_prizes_usd = 0.00,
  
  -- Missing fields (need to fetch real data)
  total_gastos_bs = 0.00,
  total_gastos_usd = 0.00,
  total_deudas_bs = 0.00,
  total_deudas_usd = 0.00,
  pago_movil_recibidos = 0.00,
  pago_movil_pagados = 0.00,
  premios_por_pagar = 0.00,
  
  -- Calculated values using the exact formula from CuadreGeneral
  cuadre_ventas_premios_bs = 13150.00 - 6600.00, -- 6550.00
  cuadre_ventas_premios_usd = 97.50 - 0.00, -- 97.50
  total_banco = 0.00 + 0.00 - 0.00, -- 0.00
  excess_usd = (25.00 + 0.00 + 0.00) - (97.50 - 0.00), -- -72.50
  sumatoria_bolivares = 1695.00 + 0.00 + 0.00 + 0.00 + (((25.00 + 0.00 + 0.00) - (97.50 - 0.00)) * 153.00), -- 1695.00 - 11092.50 = -9397.50  
  diferencia_cierre = (1695.00 + 0.00 + 0.00 + 0.00 + (((25.00 + 0.00 + 0.00) - (97.50 - 0.00)) * 153.00)) - (13150.00 - 6600.00), -- -15947.50
  diferencia_final = ((1695.00 + 0.00 + 0.00 + 0.00 + (((25.00 + 0.00 + 0.00) - (97.50 - 0.00)) * 153.00)) - (13150.00 - 6600.00)) - 0.00, -- -15947.50
  
  -- Update balance_bs to match diferencia_final
  balance_bs = ((1695.00 + 0.00 + 0.00 + 0.00 + (((25.00 + 0.00 + 0.00) - (97.50 - 0.00)) * 153.00)) - (13150.00 - 6600.00)) - 0.00 -- -15947.50

WHERE session_id = '8f1214ea-b636-49a0-ae1b-0790d5d43ea6';