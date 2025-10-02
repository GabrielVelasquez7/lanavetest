-- ============================================
-- MIGRACIÓN: Sistema de Roles Seguro (v2)
-- Usando el enum user_role existente
-- ============================================

-- 1. Crear tabla user_roles usando el enum existente
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at timestamptz DEFAULT venezuela_now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Crear función security definer para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 3. Función auxiliar para obtener rol actual (mantener compatibilidad)
CREATE OR REPLACE FUNCTION public.get_user_role_from_roles(_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = _user_id 
  LIMIT 1;
$$;

-- 4. Migrar datos existentes de profiles a user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT user_id, role, created_at
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Políticas RLS para user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 6. Actualizar trigger de creación de usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role user_role;
BEGIN
  user_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::user_role,
    'taquillero'::user_role
  );

  INSERT INTO public.profiles (user_id, full_name, agency_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'agency_id' IS NULL OR 
           NEW.raw_user_meta_data ->> 'agency_id' = '' OR
           NEW.raw_user_meta_data ->> 'agency_id' = 'null'
      THEN NULL
      ELSE (NEW.raw_user_meta_data ->> 'agency_id')::uuid
    END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;

-- ============================================
-- ACTUALIZAR POLÍTICAS RLS EN TODAS LAS TABLAS
-- ============================================

-- PROFILES
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.profiles;
CREATE POLICY "Admin users can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can view all profiles" ON public.profiles;
CREATE POLICY "Encargadas can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'encargada'));

DROP POLICY IF EXISTS "Admin users can insert profiles" ON public.profiles;
CREATE POLICY "Admin users can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Admin users can delete profiles" ON public.profiles;
CREATE POLICY "Admin users can delete profiles"
ON public.profiles FOR DELETE
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'administrador'))
WITH CHECK ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'administrador'));

-- DAILY_CUADRES_SUMMARY
DROP POLICY IF EXISTS "Admin users can view all cuadres summary" ON public.daily_cuadres_summary;
CREATE POLICY "Admin users can view all cuadres summary"
ON public.daily_cuadres_summary FOR SELECT
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can manage all cuadres summary" ON public.daily_cuadres_summary;
CREATE POLICY "Encargadas can manage all cuadres summary"
ON public.daily_cuadres_summary FOR ALL
USING (public.has_role(auth.uid(), 'encargada'))
WITH CHECK (public.has_role(auth.uid(), 'encargada'));

-- DAILY_SESSIONS
DROP POLICY IF EXISTS "Admin users can manage all sessions" ON public.daily_sessions;
CREATE POLICY "Admin users can manage all sessions"
ON public.daily_sessions FOR ALL
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can view all sessions" ON public.daily_sessions;
CREATE POLICY "Encargadas can view all sessions"
ON public.daily_sessions FOR SELECT
USING (public.has_role(auth.uid(), 'encargada'));

-- EXPENSES
DROP POLICY IF EXISTS "Admin users can manage all expenses" ON public.expenses;
CREATE POLICY "Admin users can manage all expenses"
ON public.expenses FOR ALL
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can manage all expenses" ON public.expenses;
CREATE POLICY "Encargadas can manage all expenses"
ON public.expenses FOR ALL
USING (public.has_role(auth.uid(), 'encargada'))
WITH CHECK (public.has_role(auth.uid(), 'encargada'));

-- MOBILE_PAYMENTS
DROP POLICY IF EXISTS "Admin users can manage all mobile payments" ON public.mobile_payments;
CREATE POLICY "Admin users can manage all mobile payments"
ON public.mobile_payments FOR ALL
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can manage all mobile payments" ON public.mobile_payments;
CREATE POLICY "Encargadas can manage all mobile payments"
ON public.mobile_payments FOR ALL
USING (public.has_role(auth.uid(), 'encargada'))
WITH CHECK (public.has_role(auth.uid(), 'encargada'));

-- POINT_OF_SALE
DROP POLICY IF EXISTS "Admin users can view all POS transactions" ON public.point_of_sale;
CREATE POLICY "Admin users can view all POS transactions"
ON public.point_of_sale FOR SELECT
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can manage all POS transactions" ON public.point_of_sale;
CREATE POLICY "Encargadas can manage all POS transactions"
ON public.point_of_sale FOR ALL
USING (public.has_role(auth.uid(), 'encargada'))
WITH CHECK (public.has_role(auth.uid(), 'encargada'));

-- SALES_TRANSACTIONS
DROP POLICY IF EXISTS "Admin users can view all sales transactions" ON public.sales_transactions;
CREATE POLICY "Admin users can view all sales transactions"
ON public.sales_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can view all sales transactions" ON public.sales_transactions;
CREATE POLICY "Encargadas can view all sales transactions"
ON public.sales_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'encargada'));

-- PRIZE_TRANSACTIONS
DROP POLICY IF EXISTS "Admin users can view all prize transactions" ON public.prize_transactions;
CREATE POLICY "Admin users can view all prize transactions"
ON public.prize_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can view all prize transactions" ON public.prize_transactions;
CREATE POLICY "Encargadas can view all prize transactions"
ON public.prize_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'encargada'));

-- PENDING_PRIZES
DROP POLICY IF EXISTS "Admin users can view all pending prizes" ON public.pending_prizes;
CREATE POLICY "Admin users can view all pending prizes"
ON public.pending_prizes FOR SELECT
USING (public.has_role(auth.uid(), 'administrador'));

-- AGENCIES
DROP POLICY IF EXISTS "Admin users can manage all agencies" ON public.agencies;
CREATE POLICY "Admin users can manage all agencies"
ON public.agencies FOR ALL
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can view all agencies" ON public.agencies;
CREATE POLICY "Encargadas can view all agencies"
ON public.agencies FOR SELECT
USING (public.has_role(auth.uid(), 'encargada'));

-- LOTTERY_SYSTEMS
DROP POLICY IF EXISTS "Admin users can manage lottery systems" ON public.lottery_systems;
CREATE POLICY "Admin users can manage lottery systems"
ON public.lottery_systems FOR ALL
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Authenticated users can view active lottery systems" ON public.lottery_systems;
CREATE POLICY "Authenticated users can view active lottery systems"
ON public.lottery_systems FOR SELECT
USING ((auth.uid() IS NOT NULL) AND ((is_active = true) OR public.has_role(auth.uid(), 'administrador')));

-- INTER_AGENCY_LOANS
DROP POLICY IF EXISTS "Admin users can manage all inter-agency loans" ON public.inter_agency_loans;
CREATE POLICY "Admin users can manage all inter-agency loans"
ON public.inter_agency_loans FOR ALL
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can manage all inter-agency loans" ON public.inter_agency_loans;
CREATE POLICY "Encargadas can manage all inter-agency loans"
ON public.inter_agency_loans FOR ALL
USING (public.has_role(auth.uid(), 'encargada'));

-- INTER_AGENCY_DEBTS
DROP POLICY IF EXISTS "Admin users can manage all inter-agency debts" ON public.inter_agency_debts;
CREATE POLICY "Admin users can manage all inter-agency debts"
ON public.inter_agency_debts FOR ALL
USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Encargadas can manage all inter-agency debts" ON public.inter_agency_debts;
CREATE POLICY "Encargadas can manage all inter-agency debts"
ON public.inter_agency_debts FOR ALL
USING (public.has_role(auth.uid(), 'encargada'));

-- SECURITY_AUDIT_LOG
DROP POLICY IF EXISTS "Admin users can view audit logs" ON public.security_audit_log;
CREATE POLICY "Admin users can view audit logs"
ON public.security_audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'administrador'));