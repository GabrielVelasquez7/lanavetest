-- Delete the duplicate Yosnel Velasquez users and their auth records
-- First user: fe79245e-8500-4819-8eb6-af58e5586599
-- Second user: 6461d81c-790a-436f-899b-0a0e9ba707db

-- Delete from profiles first
DELETE FROM public.profiles WHERE user_id IN (
  'fe79245e-8500-4819-8eb6-af58e5586599',
  '6461d81c-790a-436f-899b-0a0e9ba707db'
);

-- Delete from auth.users (this will cascade to profiles if there are any remaining references)
DELETE FROM auth.users WHERE id IN (
  'fe79245e-8500-4819-8eb6-af58e5586599',
  '6461d81c-790a-436f-899b-0a0e9ba707db'
);