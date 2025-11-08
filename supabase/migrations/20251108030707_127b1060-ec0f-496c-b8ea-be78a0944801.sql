-- Estandarizar nombres de comisiones fijas existentes
UPDATE weekly_bank_expenses 
SET description = 'Comisión P/M Pagados'
WHERE description ILIKE '%comision P/M PAGADOS%' OR description ILIKE '%comision%pagados%';

UPDATE weekly_bank_expenses 
SET description = 'Comisión Puntos Bancamiga'
WHERE description ILIKE '%comision puntos bancamiga%' OR description ILIKE '%comision%bancamiga%puntos%';

UPDATE weekly_bank_expenses 
SET description = 'Comisión Semanal 1$ Punto Bancamiga'
WHERE description ILIKE '%comision semanal 1$%bancamiga%';

UPDATE weekly_bank_expenses 
SET description = 'Comisión Puntos Banesco'
WHERE description ILIKE '%comision puntos banesco%';

UPDATE weekly_bank_expenses 
SET description = 'Comisión Diaria Mantenimiento Banesco'
WHERE description ILIKE '%comision diaria%mantenimiento banesco%';

UPDATE weekly_bank_expenses 
SET description = 'Comisión Punto Venezuela'
WHERE description ILIKE '%comision%punto venezuela%';

UPDATE weekly_bank_expenses 
SET description = 'Comisión Diaria Mantenimiento Venezuela'
WHERE description ILIKE '%comision diaria%mantenimiento venezuela%';

UPDATE weekly_bank_expenses 
SET description = 'Comisión Cierre Punto BNC'
WHERE description ILIKE '%comision%cierre%punto bnc%';

UPDATE weekly_bank_expenses 
SET description = 'Comisión Diaria Mantenimiento BNC'
WHERE description ILIKE '%comision diaria%mantenimiento bnc%';