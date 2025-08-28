-- Función para obtener la hora actual en zona horaria de Venezuela
CREATE OR REPLACE FUNCTION venezuela_now() RETURNS timestamp with time zone AS $$
BEGIN
    RETURN timezone('America/Caracas', now());
END;
$$ LANGUAGE plpgsql;

-- Actualizar defaults de created_at y updated_at para usar zona horaria de Venezuela
ALTER TABLE daily_sessions ALTER COLUMN created_at SET DEFAULT venezuela_now();
ALTER TABLE daily_sessions ALTER COLUMN updated_at SET DEFAULT venezuela_now();

ALTER TABLE expenses ALTER COLUMN created_at SET DEFAULT venezuela_now();
ALTER TABLE expenses ALTER COLUMN updated_at SET DEFAULT venezuela_now();

ALTER TABLE mobile_payments ALTER COLUMN created_at SET DEFAULT venezuela_now();
ALTER TABLE mobile_payments ALTER COLUMN updated_at SET DEFAULT venezuela_now();

ALTER TABLE point_of_sale ALTER COLUMN created_at SET DEFAULT venezuela_now();
ALTER TABLE point_of_sale ALTER COLUMN updated_at SET DEFAULT venezuela_now();

ALTER TABLE sales_transactions ALTER COLUMN created_at SET DEFAULT venezuela_now();
ALTER TABLE sales_transactions ALTER COLUMN updated_at SET DEFAULT venezuela_now();

ALTER TABLE prize_transactions ALTER COLUMN created_at SET DEFAULT venezuela_now();
ALTER TABLE prize_transactions ALTER COLUMN updated_at SET DEFAULT venezuela_now();

-- Actualizar la función de trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column_venezuela()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = venezuela_now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear triggers para usar la nueva función con zona horaria de Venezuela
DROP TRIGGER IF EXISTS update_daily_sessions_updated_at ON daily_sessions;
CREATE TRIGGER update_daily_sessions_updated_at
    BEFORE UPDATE ON daily_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_venezuela();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_venezuela();

DROP TRIGGER IF EXISTS update_mobile_payments_updated_at ON mobile_payments;
CREATE TRIGGER update_mobile_payments_updated_at
    BEFORE UPDATE ON mobile_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_venezuela();

DROP TRIGGER IF EXISTS update_point_of_sale_updated_at ON point_of_sale;
CREATE TRIGGER update_point_of_sale_updated_at
    BEFORE UPDATE ON point_of_sale
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_venezuela();

DROP TRIGGER IF EXISTS update_sales_transactions_updated_at ON sales_transactions;
CREATE TRIGGER update_sales_transactions_updated_at
    BEFORE UPDATE ON sales_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_venezuela();

DROP TRIGGER IF EXISTS update_prize_transactions_updated_at ON prize_transactions;
CREATE TRIGGER update_prize_transactions_updated_at
    BEFORE UPDATE ON prize_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_venezuela();