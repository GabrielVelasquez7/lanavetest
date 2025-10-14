-- Update EL INMEJORABLE to support subcategories
UPDATE lottery_systems 
SET has_subcategories = true 
WHERE code = 'INMEJORABLE';

-- Create EL INMEJORABLE MULTIS subcategories
INSERT INTO lottery_systems (name, code, has_subcategories, parent_system_id, is_active)
VALUES 
  ('EL INMEJORABLE MULTIS (1 LOGROS)', 'INMEJORABLE-MULTIS-1', false, (SELECT id FROM lottery_systems WHERE code = 'INMEJORABLE'), true),
  ('EL INMEJORABLE MULTIS (2 LOGROS)', 'INMEJORABLE-MULTIS-2', false, (SELECT id FROM lottery_systems WHERE code = 'INMEJORABLE'), true),
  ('EL INMEJORABLE MULTIS (3 LOGROS)', 'INMEJORABLE-MULTIS-3', false, (SELECT id FROM lottery_systems WHERE code = 'INMEJORABLE'), true),
  ('EL INMEJORABLE MULTIS (4 LOGROS)', 'INMEJORABLE-MULTIS-4', false, (SELECT id FROM lottery_systems WHERE code = 'INMEJORABLE'), true),
  ('EL INMEJORABLE 5Y6', 'INMEJORABLE-5Y6', false, (SELECT id FROM lottery_systems WHERE code = 'INMEJORABLE'), true);

-- Create MULTISPORT CABALLOS parent system
INSERT INTO lottery_systems (name, code, has_subcategories, is_active)
VALUES ('MULTISPORT CABALLOS', 'MULTISPORT-CABALLOS', true, true);

-- Create MULTISPORT CABALLOS subcategories
INSERT INTO lottery_systems (name, code, has_subcategories, parent_system_id, is_active)
VALUES 
  ('MULTISPORT CABALLOS (NACIONALES)', 'MULTISPORT-CABALLOS-NAC', false, (SELECT id FROM lottery_systems WHERE code = 'MULTISPORT-CABALLOS'), true),
  ('MULTISPORT CABALLOS (INTERNACIONALES)', 'MULTISPORT-CABALLOS-INT', false, (SELECT id FROM lottery_systems WHERE code = 'MULTISPORT-CABALLOS'), true);

-- Create MULTISPORT 5Y6
INSERT INTO lottery_systems (name, code, has_subcategories, is_active)
VALUES ('MULTISPORT 5Y6', 'MULTISPORT-5Y6', false, true);