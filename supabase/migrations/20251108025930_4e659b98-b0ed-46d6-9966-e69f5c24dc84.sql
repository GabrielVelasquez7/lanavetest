-- Create agency_groups table
CREATE TABLE IF NOT EXISTS public.agency_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now()
);

-- Enable RLS
ALTER TABLE public.agency_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agency_groups
CREATE POLICY "Admin users can manage all groups"
  ON public.agency_groups
  FOR ALL
  USING (has_role(auth.uid(), 'administrador'::user_role));

CREATE POLICY "Encargadas can view all groups"
  ON public.agency_groups
  FOR SELECT
  USING (has_role(auth.uid(), 'encargada'::user_role));

CREATE POLICY "Authenticated users can view groups"
  ON public.agency_groups
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add group_id to agencies table
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.agency_groups(id);

-- Add group_id to weekly_bank_expenses table
ALTER TABLE public.weekly_bank_expenses 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.agency_groups(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_agencies_group_id ON public.agencies(group_id);
CREATE INDEX IF NOT EXISTS idx_weekly_bank_expenses_group_id ON public.weekly_bank_expenses(group_id);

-- Add trigger for updated_at
CREATE TRIGGER update_agency_groups_updated_at
  BEFORE UPDATE ON public.agency_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_venezuela();