-- Create weekly_bank_expenses table
CREATE TABLE public.weekly_bank_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  category expense_category NOT NULL,
  description text NOT NULL,
  amount_bs numeric NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT venezuela_now(),
  updated_at timestamp with time zone NOT NULL DEFAULT venezuela_now()
);

-- Enable RLS
ALTER TABLE public.weekly_bank_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for encargadas and admins
CREATE POLICY "Encargadas can manage all weekly bank expenses"
ON public.weekly_bank_expenses
FOR ALL
USING (has_role(auth.uid(), 'encargada'::user_role))
WITH CHECK (has_role(auth.uid(), 'encargada'::user_role));

CREATE POLICY "Admin users can manage all weekly bank expenses"
ON public.weekly_bank_expenses
FOR ALL
USING (has_role(auth.uid(), 'administrador'::user_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::user_role));

-- Create indexes for performance
CREATE INDEX idx_weekly_bank_expenses_week_dates ON public.weekly_bank_expenses(week_start_date, week_end_date);
CREATE INDEX idx_weekly_bank_expenses_agency ON public.weekly_bank_expenses(agency_id);

-- Create trigger for updated_at
CREATE TRIGGER update_weekly_bank_expenses_updated_at
BEFORE UPDATE ON public.weekly_bank_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();