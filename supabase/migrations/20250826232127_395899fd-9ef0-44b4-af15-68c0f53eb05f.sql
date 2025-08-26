-- Fix security vulnerability: Restrict agencies table access
-- Remove the overly permissive policy that allows all authenticated users to view agencies
DROP POLICY IF EXISTS "Authenticated users can view agencies" ON public.agencies;

-- Create more restrictive policies
-- Users can only view their own agency (if they have one assigned)
CREATE POLICY "Users can view their assigned agency" 
ON public.agencies 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  id IN (
    SELECT agency_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() AND agency_id IS NOT NULL
  )
);

-- Admin users already have full access via existing policy, no changes needed there