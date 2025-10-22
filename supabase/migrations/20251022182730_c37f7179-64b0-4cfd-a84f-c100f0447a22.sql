-- Phase 1: Clean up mixed data in daily_cuadres_summary
-- Delete records with session_id = NULL that are not from the current encargada user
-- This includes BARALT agency data and other problematic records

-- Delete daily_cuadres_summary records where session_id is NULL and:
-- 1. agency_id is not in the agencies table (orphaned data)
-- 2. OR the record doesn't have proper agency_id (data integrity issue)
DELETE FROM public.daily_cuadres_summary 
WHERE session_id IS NULL 
  AND (
    agency_id IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM public.agencies 
      WHERE agencies.id = daily_cuadres_summary.agency_id
    )
  );

-- Note: We keep records with session_id = NULL that have valid agency_id
-- These are legitimate encargada records that will now only use fields like:
-- - cash_available_bs/usd
-- - exchange_rate  
-- - closure_notes
-- - daily_closure_confirmed
-- Sales and prizes data will come from encargada_cuadre_details instead