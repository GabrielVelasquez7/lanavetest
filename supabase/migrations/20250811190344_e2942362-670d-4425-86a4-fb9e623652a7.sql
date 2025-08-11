-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('taquillera', 'supervisor', 'administrador');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'taquillera',
  agency_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lottery systems table
CREATE TABLE public.lottery_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily sessions table to group transactions by day
CREATE TABLE public.daily_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_date)
);

-- Create sales transactions table
CREATE TABLE public.sales_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.daily_sessions(id) ON DELETE CASCADE,
  lottery_system_id UUID NOT NULL REFERENCES public.lottery_systems(id),
  amount_bs DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  mobile_payment_bs DECIMAL(12,2) NOT NULL DEFAULT 0,
  mobile_payment_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prize transactions table
CREATE TABLE public.prize_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.daily_sessions(id) ON DELETE CASCADE,
  lottery_system_id UUID NOT NULL REFERENCES public.lottery_systems(id),
  amount_bs DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense categories enum
CREATE TYPE public.expense_category AS ENUM ('deuda', 'gasto_operativo', 'otros');

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.daily_sessions(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  description TEXT NOT NULL,
  amount_bs DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default lottery systems based on the Excel
INSERT INTO public.lottery_systems (name, code) VALUES
('Matica', 'MATICA'),
('Matrix', 'MATRIX'),
('Atenas', 'ATENAS'),
('Agencias', 'AGENCIAS'),
('Gato', 'GATO'),
('Source', 'SOURCE'),
('Maxplay', 'MAXPLAY'),
('El Inmemorable', 'INMEMORABLE'),
('La Ruleta', 'RULETA'),
('Polla Hípica', 'POLLA'),
('Caballos Nacionales', 'CABALLOS_NAC'),
('Caballos Internacionales', 'CABALLOS_INT'),
('5Y6', '5Y6'),
('Maquinitas', 'MAQUINITAS'),
('Lotto Max', 'LOTTO_MAX'),
('Scala', 'SCALA');

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE profiles.user_id = $1;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for lottery_systems (public read)
CREATE POLICY "Anyone can view lottery systems" ON public.lottery_systems
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for daily_sessions
CREATE POLICY "Users can manage their own sessions" ON public.daily_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for sales_transactions
CREATE POLICY "Users can manage sales in their sessions" ON public.sales_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.daily_sessions 
      WHERE daily_sessions.id = sales_transactions.session_id 
      AND daily_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for prize_transactions
CREATE POLICY "Users can manage prizes in their sessions" ON public.prize_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.daily_sessions 
      WHERE daily_sessions.id = prize_transactions.session_id 
      AND daily_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for expenses
CREATE POLICY "Users can manage expenses in their sessions" ON public.expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.daily_sessions 
      WHERE daily_sessions.id = expenses.session_id 
      AND daily_sessions.user_id = auth.uid()
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'taquillera'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_sessions_updated_at
  BEFORE UPDATE ON public.daily_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_transactions_updated_at
  BEFORE UPDATE ON public.sales_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prize_transactions_updated_at
  BEFORE UPDATE ON public.prize_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();