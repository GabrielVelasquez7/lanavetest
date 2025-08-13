-- Update user nelsongvr26@gmail.com to admin role
UPDATE profiles 
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'nelsongvr26@gmail.com'
);