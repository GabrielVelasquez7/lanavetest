-- Crear usuario de prueba para el perfil encargada
INSERT INTO profiles (user_id, full_name, role, agency_id, is_active)
VALUES (
  gen_random_uuid(),
  'Encargada Prueba',
  'encargada',
  '4e331754-2ca9-44c6-8a9f-c9888a9ccf10',
  true
);