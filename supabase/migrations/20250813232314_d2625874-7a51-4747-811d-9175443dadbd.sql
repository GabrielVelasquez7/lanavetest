-- Borrar todos los datos de transacciones del usuario Gabriel Velasquez (user_id: 2483cde7-a9d1-4acc-a34c-3fbab7e37787)
-- para que pueda rehacer el cuadre

-- Primero obtener el session_id
DO $$
DECLARE
    session_uuid uuid := 'c3552039-c822-4431-8ed2-debc6f129753';
BEGIN
    -- Borrar todas las transacciones de esta sesión
    DELETE FROM sales_transactions WHERE session_id = session_uuid;
    DELETE FROM prize_transactions WHERE session_id = session_uuid;
    DELETE FROM expenses WHERE session_id = session_uuid;
    DELETE FROM mobile_payments WHERE session_id = session_uuid;
    DELETE FROM point_of_sale WHERE session_id = session_uuid;
    
    -- Resetear la sesión a abierta
    UPDATE daily_sessions 
    SET is_closed = false, notes = null, updated_at = now()
    WHERE id = session_uuid;
END $$;