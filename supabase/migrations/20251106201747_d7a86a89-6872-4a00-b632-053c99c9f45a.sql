-- Add is_paid field to expenses table to track paid debts
ALTER TABLE public.expenses 
ADD COLUMN is_paid boolean NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_expenses_category_is_paid ON public.expenses(category, is_paid);

-- Add comment for clarity
COMMENT ON COLUMN public.expenses.is_paid IS 'Indicates if a debt has been paid. Only relevant for category=deuda';