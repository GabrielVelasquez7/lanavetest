-- Create mobile payments table for tracking pago móvil transactions
CREATE TABLE public.mobile_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.daily_sessions(id) ON DELETE CASCADE,
  amount_bs DECIMAL(12,2) NOT NULL DEFAULT 0,
  reference_number TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create point of sale table for daily POS amounts
CREATE TABLE public.point_of_sale (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.daily_sessions(id) ON DELETE CASCADE,
  amount_bs DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id) -- Only one POS entry per session
);

-- Remove mobile payment columns from sales_transactions as they'll be tracked separately
ALTER TABLE public.sales_transactions 
DROP COLUMN mobile_payment_bs,
DROP COLUMN mobile_payment_usd;

-- Enable RLS on new tables
ALTER TABLE public.mobile_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_of_sale ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mobile_payments
CREATE POLICY "Users can manage mobile payments in their sessions" ON public.mobile_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.daily_sessions 
      WHERE daily_sessions.id = mobile_payments.session_id 
      AND daily_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for point_of_sale
CREATE POLICY "Users can manage POS in their sessions" ON public.point_of_sale
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.daily_sessions 
      WHERE daily_sessions.id = point_of_sale.session_id 
      AND daily_sessions.user_id = auth.uid()
    )
  );

-- Create triggers for timestamp updates
CREATE TRIGGER update_mobile_payments_updated_at
  BEFORE UPDATE ON public.mobile_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_point_of_sale_updated_at
  BEFORE UPDATE ON public.point_of_sale
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();