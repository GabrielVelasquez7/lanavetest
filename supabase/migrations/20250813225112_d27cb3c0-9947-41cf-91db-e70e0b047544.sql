-- Update user roles enum to only include taquillero, encargado, administrador
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM ('taquillero', 'encargado', 'administrador');

-- Update existing profiles with new role mapping
ALTER TABLE profiles 
ALTER COLUMN role DROP DEFAULT;

ALTER TABLE profiles 
ALTER COLUMN role TYPE user_role 
USING CASE 
  WHEN role::text = 'admin' THEN 'administrador'::user_role
  WHEN role::text = 'administrador' THEN 'administrador'::user_role  
  WHEN role::text = 'supervisor' THEN 'encargado'::user_role
  WHEN role::text = 'taquillera' THEN 'taquillero'::user_role
  ELSE 'taquillero'::user_role
END;

ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'taquillero'::user_role;

-- Drop old enum
DROP TYPE user_role_old;