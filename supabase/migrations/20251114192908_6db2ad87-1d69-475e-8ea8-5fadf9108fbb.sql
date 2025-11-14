-- Modify banqueo_transactions to support per-system entries
ALTER TABLE banqueo_transactions
ADD COLUMN lottery_system_id uuid REFERENCES lottery_systems(id);

-- Create index for better performance
CREATE INDEX idx_banqueo_transactions_client_system 
ON banqueo_transactions(client_id, lottery_system_id, week_start_date);

-- Update RLS policies remain the same since they already handle admin and encargada access