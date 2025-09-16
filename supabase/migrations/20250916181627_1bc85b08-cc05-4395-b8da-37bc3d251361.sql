-- Create table for pending prizes transactions
CREATE TABLE public.pending_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  amount_bs NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now()
);

-- Enable Row Level Security
ALTER TABLE public.pending_prizes ENABLE ROW LEVEL SECURITY;

-- Create policies for pending_prizes
CREATE POLICY "Users can manage pending prizes in their sessions" 
ON public.pending_prizes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM daily_sessions 
  WHERE daily_sessions.id = pending_prizes.session_id 
  AND daily_sessions.user_id = auth.uid()
));

CREATE POLICY "Admin users can view all pending prizes" 
ON public.pending_prizes 
FOR SELECT 
USING (get_current_user_role() = 'administrador'::user_role);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_pending_prizes_updated_at
BEFORE UPDATE ON public.pending_prizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();

-- Add column to store balance before applying pending prizes deduction
ALTER TABLE public.daily_cuadres_summary 
ADD COLUMN balance_before_pending_prizes_bs NUMERIC DEFAULT 0;