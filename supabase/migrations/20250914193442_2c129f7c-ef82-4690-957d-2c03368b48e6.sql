-- Create table for inter-agency loans
CREATE TABLE public.inter_agency_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  to_agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  amount_bs NUMERIC NOT NULL DEFAULT 0,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  reason TEXT NOT NULL, -- 'premios', 'sencillo', 'operativo', etc.
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado', 'vencido')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  
  -- Prevent self-loans
  CONSTRAINT no_self_loans CHECK (from_agency_id != to_agency_id)
);

-- Create table for inter-agency debts (consolidated view)
CREATE TABLE public.inter_agency_debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debtor_agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creditor_agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  total_debt_bs NUMERIC NOT NULL DEFAULT 0,
  total_debt_usd NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  
  -- Unique constraint to prevent duplicate debt records
  UNIQUE(debtor_agency_id, creditor_agency_id),
  -- Prevent self-debts
  CONSTRAINT no_self_debts CHECK (debtor_agency_id != creditor_agency_id)
);

-- Enable RLS on both tables
ALTER TABLE public.inter_agency_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inter_agency_debts ENABLE ROW LEVEL SECURITY;

-- Create policies for inter_agency_loans
CREATE POLICY "Encargadas can manage all inter-agency loans" 
ON public.inter_agency_loans 
FOR ALL 
USING (get_current_user_role() = 'encargada'::user_role);

CREATE POLICY "Admin users can manage all inter-agency loans" 
ON public.inter_agency_loans 
FOR ALL 
USING (get_current_user_role() = 'administrador'::user_role);

-- Create policies for inter_agency_debts
CREATE POLICY "Encargadas can manage all inter-agency debts" 
ON public.inter_agency_debts 
FOR ALL 
USING (get_current_user_role() = 'encargada'::user_role);

CREATE POLICY "Admin users can manage all inter-agency debts" 
ON public.inter_agency_debts 
FOR ALL 
USING (get_current_user_role() = 'administrador'::user_role);

-- Create function to update inter_agency_debts when loans change
CREATE OR REPLACE FUNCTION public.update_inter_agency_debts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or create debt record for the affected agencies
  INSERT INTO public.inter_agency_debts (debtor_agency_id, creditor_agency_id, total_debt_bs, total_debt_usd)
  SELECT 
    to_agency_id as debtor_agency_id,
    from_agency_id as creditor_agency_id,
    COALESCE(SUM(CASE WHEN status = 'pendiente' THEN amount_bs ELSE 0 END), 0) as total_debt_bs,
    COALESCE(SUM(CASE WHEN status = 'pendiente' THEN amount_usd ELSE 0 END), 0) as total_debt_usd
  FROM public.inter_agency_loans
  WHERE (to_agency_id = COALESCE(NEW.to_agency_id, OLD.to_agency_id) AND from_agency_id = COALESCE(NEW.from_agency_id, OLD.from_agency_id))
     OR (to_agency_id = COALESCE(OLD.to_agency_id, NEW.to_agency_id) AND from_agency_id = COALESCE(OLD.from_agency_id, NEW.from_agency_id))
  GROUP BY to_agency_id, from_agency_id
  ON CONFLICT (debtor_agency_id, creditor_agency_id) 
  DO UPDATE SET 
    total_debt_bs = EXCLUDED.total_debt_bs,
    total_debt_usd = EXCLUDED.total_debt_usd,
    last_updated = venezuela_now();
    
  -- Remove debt records where total is 0
  DELETE FROM public.inter_agency_debts 
  WHERE (debtor_agency_id = COALESCE(NEW.to_agency_id, OLD.to_agency_id) AND creditor_agency_id = COALESCE(NEW.from_agency_id, OLD.from_agency_id))
    AND total_debt_bs = 0 AND total_debt_usd = 0;
    
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers to automatically update debts
CREATE TRIGGER update_debts_on_loan_change
AFTER INSERT OR UPDATE OR DELETE ON public.inter_agency_loans
FOR EACH ROW EXECUTE FUNCTION public.update_inter_agency_debts();

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inter_agency_loans_updated_at
BEFORE UPDATE ON public.inter_agency_loans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();