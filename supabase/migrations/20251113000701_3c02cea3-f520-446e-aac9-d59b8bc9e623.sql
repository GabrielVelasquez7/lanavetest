-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  group_id UUID REFERENCES public.agency_groups(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now()
);

-- Enable Row Level Security for clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Admin users can manage all clients"
ON public.clients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador'::user_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::user_role));

CREATE POLICY "Encargadas can view all clients"
ON public.clients
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'encargada'::user_role));

CREATE POLICY "Authenticated users can view clients"
ON public.clients
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Create banqueo_transactions table
CREATE TABLE public.banqueo_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  sales_bs NUMERIC NOT NULL DEFAULT 0,
  sales_usd NUMERIC NOT NULL DEFAULT 0,
  prizes_bs NUMERIC NOT NULL DEFAULT 0,
  prizes_usd NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT venezuela_now()
);

-- Enable Row Level Security for banqueo_transactions
ALTER TABLE public.banqueo_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for banqueo_transactions
CREATE POLICY "Admin users can manage all banqueo transactions"
ON public.banqueo_transactions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador'::user_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::user_role));

CREATE POLICY "Encargadas can manage all banqueo transactions"
ON public.banqueo_transactions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'encargada'::user_role))
WITH CHECK (has_role(auth.uid(), 'encargada'::user_role));

-- Create trigger for updated_at on clients
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();

-- Create trigger for updated_at on banqueo_transactions
CREATE TRIGGER update_banqueo_transactions_updated_at
BEFORE UPDATE ON public.banqueo_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_venezuela();