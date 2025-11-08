-- Insert groups (initial data)
INSERT INTO agency_groups (name, description) VALUES
  ('GRUPO 1', 'CEMENTERIO, PANTEON, AV. SUCRE, SAN MARTIN, CAPITOLIO, VICTORIA 2, VICTORIA 1, BARALT'),
  ('GRUPO 2', 'CANDELARIA'),
  ('GRUPO 3', 'PARQUE CENTRAL');

-- Update agencies with their group_id
UPDATE agencies SET group_id = (SELECT id FROM agency_groups WHERE name = 'GRUPO 1')
WHERE name IN ('CEMENTERIO', 'PANTEON', 'AV.SUCRE', 'SAN MARTIN', 'CAPITOLIO', 'VICTORIA 2', 'VICTORIA 1', 'BARALT');

UPDATE agencies SET group_id = (SELECT id FROM agency_groups WHERE name = 'GRUPO 2')
WHERE name = 'CANDELARIA';

UPDATE agencies SET group_id = (SELECT id FROM agency_groups WHERE name = 'GRUPO 3')
WHERE name = 'PARQUE CENTRAL';