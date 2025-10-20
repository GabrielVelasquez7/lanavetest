-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  base_salary_usd NUMERIC NOT NULL DEFAULT 0,
  base_salary_bs NUMERIC NOT NULL DEFAULT 0,
  sunday_rate_usd NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now()
);

-- Create weekly payroll table
CREATE TABLE IF NOT EXISTS public.weekly_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  weekly_base_salary NUMERIC NOT NULL DEFAULT 0,
  absences_deductions NUMERIC NOT NULL DEFAULT 0,
  other_deductions NUMERIC NOT NULL DEFAULT 0,
  bonuses_extras NUMERIC NOT NULL DEFAULT 0,
  sunday_payment NUMERIC NOT NULL DEFAULT 0,
  total_usd NUMERIC NOT NULL DEFAULT 0,
  total_bs NUMERIC NOT NULL DEFAULT 0,
  exchange_rate NUMERIC NOT NULL DEFAULT 36,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  UNIQUE(employee_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_payroll ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Admin users can manage all employees"
  ON public.employees
  FOR ALL
  USING (has_role(auth.uid(), 'administrador'::user_role));

CREATE POLICY "Encargadas can manage all employees"
  ON public.employees
  FOR ALL
  USING (has_role(auth.uid(), 'encargada'::user_role));

-- RLS Policies for weekly_payroll
CREATE POLICY "Admin users can manage all payroll"
  ON public.weekly_payroll
  FOR ALL
  USING (has_role(auth.uid(), 'administrador'::user_role));

CREATE POLICY "Encargadas can manage all payroll"
  ON public.weekly_payroll
  FOR ALL
  USING (has_role(auth.uid(), 'encargada'::user_role));

-- Triggers for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_venezuela();

CREATE TRIGGER update_weekly_payroll_updated_at
  BEFORE UPDATE ON public.weekly_payroll
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_venezuela();