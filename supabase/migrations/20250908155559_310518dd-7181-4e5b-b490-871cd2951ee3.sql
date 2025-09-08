-- Create a test summary record based on existing data
INSERT INTO public.daily_cuadres_summary (
  session_id,
  user_id,
  session_date,
  agency_id,
  total_sales_bs,
  total_sales_usd,
  total_prizes_bs,
  total_prizes_usd,
  total_expenses_bs,
  total_expenses_usd,
  total_mobile_payments_bs,
  total_pos_bs,
  cash_available_bs,
  cash_available_usd,
  exchange_rate,
  balance_bs,
  is_closed,
  daily_closure_confirmed,
  notes,
  closure_notes
) VALUES (
  '8f1214ea-b636-49a0-ae1b-0790d5d43ea6',
  'a95045f7-ac43-4358-adc5-e769cfc776dd',
  '2025-09-04',
  '4e331754-2ca9-44c6-8a9f-c9888a9ccf10',
  13150.00,  -- total sales bs
  97.50,     -- total sales usd  
  6600.00,   -- total prizes bs
  0.00,      -- total prizes usd
  0.00,      -- expenses bs
  0.00,      -- expenses usd
  0.00,      -- mobile payments
  0.00,      -- pos
  1695.00,   -- cash available bs
  25.00,     -- cash available usd
  153.00,    -- exchange rate
  5520.00,   -- balance (calculated: cash_available + sales - prizes in bs equivalent)
  false,     -- is_closed
  true,      -- daily_closure_confirmed
  null,      -- notes
  ''         -- closure_notes
) ON CONFLICT (session_id) DO NOTHING;