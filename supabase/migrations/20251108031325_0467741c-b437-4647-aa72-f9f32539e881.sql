-- 1) Asegurar que las comisiones fijas sean GLOBAL (group_id NULL)
UPDATE weekly_bank_expenses
SET group_id = NULL
WHERE description IN (
  'Comisión P/M Pagados',
  'Comisión Puntos Bancamiga',
  'Comisión Semanal 1$ Punto Bancamiga',
  'Comisión Puntos Banesco',
  'Comisión Diaria Mantenimiento Banesco',
  'Comisión Punto Venezuela',
  'Comisión Diaria Mantenimiento Venezuela',
  'Comisión Cierre Punto BNC',
  'Comisión Diaria Mantenimiento BNC'
) AND group_id IS NOT NULL;

-- 2) Eliminar duplicados conservando el registro más reciente (solo comisiones fijas)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY week_start_date, week_end_date, lower(trim(description)), coalesce(group_id::text,'GLOBAL')
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM weekly_bank_expenses
  WHERE description IN (
    'Comisión P/M Pagados',
    'Comisión Puntos Bancamiga',
    'Comisión Semanal 1$ Punto Bancamiga',
    'Comisión Puntos Banesco',
    'Comisión Diaria Mantenimiento Banesco',
    'Comisión Punto Venezuela',
    'Comisión Diaria Mantenimiento Venezuela',
    'Comisión Cierre Punto BNC',
    'Comisión Diaria Mantenimiento BNC'
  )
)
DELETE FROM weekly_bank_expenses w
USING ranked r
WHERE w.id = r.id AND r.rn > 1;