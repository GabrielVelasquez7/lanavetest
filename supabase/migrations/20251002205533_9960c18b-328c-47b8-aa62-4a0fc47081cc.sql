-- Agregar columnas para subcategorías
ALTER TABLE lottery_systems 
ADD COLUMN has_subcategories BOOLEAN DEFAULT FALSE,
ADD COLUMN parent_system_id UUID REFERENCES lottery_systems(id) ON DELETE CASCADE;

-- Crear índice para mejor performance
CREATE INDEX idx_lottery_systems_parent ON lottery_systems(parent_system_id);

-- Crear sistema GATO principal
INSERT INTO lottery_systems (name, code, is_active, has_subcategories)
VALUES ('GATO', 'GATO', true, true);

-- Marcar sistemas existentes como padres con subcategorías
UPDATE lottery_systems 
SET has_subcategories = true 
WHERE code IN ('matilot', 'ATENAS', 'AGENCIAS', 'MAXPLAY', 'PREMIER');

-- Crear subcategorías para MATILOT (Figuras y Terminales)
INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'MATILOT - Figuras', 'matilot-figuras', true, id 
FROM lottery_systems WHERE code = 'matilot';

INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'MATILOT - Terminales', 'matilot-terminales', true, id 
FROM lottery_systems WHERE code = 'matilot';

-- Crear subcategorías para ATENAS (Figuras y Loterías)
INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'ATENAS - Figuras', 'ATENAS-figuras', true, id 
FROM lottery_systems WHERE code = 'ATENAS';

INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'ATENAS - Loterías', 'ATENAS-loterias', true, id 
FROM lottery_systems WHERE code = 'ATENAS';

-- Crear subcategorías para GATO (Figuras y Loterías)
INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'GATO - Figuras', 'GATO-figuras', true, id 
FROM lottery_systems WHERE code = 'GATO';

INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'GATO - Loterías', 'GATO-loterias', true, id 
FROM lottery_systems WHERE code = 'GATO';

-- Crear subcategorías para AGENCIAS (Figuras y Loterías)
INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'AGENCIAS - Figuras', 'AGENCIAS-figuras', true, id 
FROM lottery_systems WHERE code = 'AGENCIAS';

INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'AGENCIAS - Loterías', 'AGENCIAS-loterias', true, id 
FROM lottery_systems WHERE code = 'AGENCIAS';

-- Crear subcategorías para MAXPLAY (Figuras y Loterías)
INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'MAXPLAY - Figuras', 'MAXPLAY-figuras', true, id 
FROM lottery_systems WHERE code = 'MAXPLAY';

INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'MAXPLAY - Loterías', 'MAXPLAY-loterias', true, id 
FROM lottery_systems WHERE code = 'MAXPLAY';

-- Crear subcategorías para PREMIER (Figuras y Loterías)
INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'PREMIER - Figuras', 'PREMIER-figuras', true, id 
FROM lottery_systems WHERE code = 'PREMIER';

INSERT INTO lottery_systems (name, code, is_active, parent_system_id)
SELECT 'PREMIER - Loterías', 'PREMIER-loterias', true, id 
FROM lottery_systems WHERE code = 'PREMIER';