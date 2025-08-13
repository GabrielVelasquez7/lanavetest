-- First delete daily sessions and related data for the duplicate users
DELETE FROM public.daily_sessions WHERE user_id IN (
  'fe79245e-8500-4819-8eb6-af58e5586599',
  '6461d81c-790a-436f-899b-0a0e9ba707db'
);

-- Delete from profiles
DELETE FROM public.profiles WHERE user_id IN (
  'fe79245e-8500-4819-8eb6-af58e5586599',
  '6461d81c-790a-436f-899b-0a0e9ba707db'
);

-- Delete from auth.users
DELETE FROM auth.users WHERE id IN (
  'fe79245e-8500-4819-8eb6-af58e5586599',
  '6461d81c-790a-436f-899b-0a0e9ba707db'
);