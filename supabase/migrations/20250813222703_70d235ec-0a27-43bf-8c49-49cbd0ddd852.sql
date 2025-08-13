-- Create agencies table
CREATE TABLE public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on agencies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Add agency_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;

-- Update profiles RLS to include agency filtering
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- New RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS policies for agencies
CREATE POLICY "Admins can manage all agencies" 
ON public.agencies 
FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Taquilleras can view their agency" 
ON public.agencies 
FOR SELECT 
USING (
  id IN (
    SELECT agency_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Update daily_sessions RLS to filter by agency
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.daily_sessions;

CREATE POLICY "Users can manage their own sessions" 
ON public.daily_sessions 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all sessions" 
ON public.daily_sessions 
FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

-- Update lottery_systems RLS to allow admin management
DROP POLICY IF EXISTS "Anyone can view lottery systems" ON public.lottery_systems;

CREATE POLICY "Anyone can view active lottery systems" 
ON public.lottery_systems 
FOR SELECT 
USING (is_active = true OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage lottery systems" 
ON public.lottery_systems 
FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

-- Add trigger for agencies updated_at
CREATE TRIGGER update_agencies_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample agencies
INSERT INTO public.agencies (name, address, phone) VALUES 
('Agencia Central', 'Av. Principal #123', '+58-212-1234567'),
('Agencia Norte', 'Calle 5 con Av. Norte', '+58-212-7654321'),
('Agencia Sur', 'Centro Comercial Sur, Local 45', '+58-212-9876543');

-- Update the user role enum if needed (should already exist)
-- The get_user_role function should already exist from previous setup