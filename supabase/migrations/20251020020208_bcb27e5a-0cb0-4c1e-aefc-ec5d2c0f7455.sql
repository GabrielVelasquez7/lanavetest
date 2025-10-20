-- Add unique constraint to support upsert in encargada daily summary
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_cuadres_unique_agency_date_user'
  ) THEN
    ALTER TABLE public.daily_cuadres_summary
    ADD CONSTRAINT daily_cuadres_unique_agency_date_user
    UNIQUE (agency_id, session_date, user_id);
  END IF;
END
$$;