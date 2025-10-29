import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatDateForDB } from '@/lib/dateUtils';

interface Premio {
  id?: string;
  amount: string;
  description: string;
}

interface PremiosPorPagarEncargadaProps {
  onSuccess?: () => void;
  mode: 'pending' | 'paid';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Esta función actualiza el resumen diario de cuadres
const updateDailyCuadresSummary = async (sessionId: string) => {
  try {
    // Obtener datos de ventas
    const { data: sales, error: salesError } = await supabase
      .from('sales_transactions')
      .select('amount_bs, amount_usd')
      .eq('session_id', sessionId);

    if (salesError) throw salesError;

    const totalSalesBs = sales?.reduce((sum, sale) => sum + Number(sale.amount_bs), 0) || 0;
    const totalSalesUsd = sales?.reduce((sum, sale) => sum + Number(sale.amount_usd), 0) || 0;

    // Obtener datos de premios
    const { data: prizes, error: prizesError } = await supabase
      .from('prize_transactions')
      .select('amount_bs, amount_usd')
      .eq('session_id', sessionId);

    if (prizesError) throw prizesError;

    const totalPrizesBs = prizes?.reduce((sum, prize) => sum + Number(prize.amount_bs), 0) || 0;
    const totalPrizesUsd = prizes?.reduce((sum, prize) => sum + Number(prize.amount_usd), 0) || 0;

    // Obtener datos de gastos
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount_bs, amount_usd')
      .eq('session_id', sessionId);

    if (expensesError) throw expensesError;

    const totalExpensesBs = expenses?.reduce((sum, expense) => sum + Number(expense.amount_bs), 0) || 0;
    const totalExpensesUsd = expenses?.reduce((sum, expense) => sum + Number(expense.amount_usd), 0) || 0;

    // Obtener datos de pagos móviles
    const { data: payments, error: paymentsError } = await supabase
      .from('mobile_payments')
      .select('amount_bs')
      .eq('session_id', sessionId);

    if (paymentsError) throw paymentsError;

    const totalMobilePaymentsBs = payments?.reduce((sum, payment) => sum + Number(payment.amount_bs), 0) || 0;

    // Obtener datos de punto de venta
    const { data: pos, error: posError } = await supabase
      .from('point_of_sale')
      .select('amount_bs')
      .eq('session_id', sessionId);

    if (posError) throw posError;

    const totalPosBs = pos?.reduce((sum, p) => sum + Number(p.amount_bs), 0) || 0;

    // Obtener premios pendientes
    const { data: pendingPrizes, error: pendingError } = await supabase
      .from('pending_prizes')
      .select('amount_bs')
      .eq('session_id', sessionId)
      .eq('is_paid', false);

    if (pendingError) throw pendingError;

    const totalPendingPrizes = pendingPrizes?.reduce((sum, p) => sum + Number(p.amount_bs), 0) || 0;

    // Obtener datos de la sesión
    const { data: session, error: sessionError } = await supabase
      .from('daily_sessions')
      .select('user_id, session_date, exchange_rate, cash_available_bs, cash_available_usd')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Calcular balance
    const balanceBs = totalSalesBs - totalPrizesBs - totalExpensesBs - totalMobilePaymentsBs - totalPosBs;
    const cashAvailableBs = session.cash_available_bs || 0;
    const diferenciaFinal = cashAvailableBs - balanceBs;

    // Actualizar o crear el resumen
    const { error: updateError } = await supabase
      .from('daily_cuadres_summary')
      .upsert({
        session_id: sessionId,
        user_id: session.user_id,
        session_date: session.session_date,
        total_sales_bs: totalSalesBs,
        total_sales_usd: totalSalesUsd,
        total_prizes_bs: totalPrizesBs,
        total_prizes_usd: totalPrizesUsd,
        total_expenses_bs: totalExpensesBs,
        total_expenses_usd: totalExpensesUsd,
        total_mobile_payments_bs: totalMobilePaymentsBs,
        total_pos_bs: totalPosBs,
        cash_available_bs: cashAvailableBs,
        cash_available_usd: session.cash_available_usd || 0,
        exchange_rate: session.exchange_rate || 36,
        balance_bs: balanceBs,
        diferencia_final: diferenciaFinal,
        pending_prizes: totalPendingPrizes,
      }, {
        onConflict: 'session_id'
      });

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating daily cuadres summary:', error);
    throw error;
  }
};

export const PremiosPorPagarEncargada = ({ onSuccess, mode, dateRange }: PremiosPorPagarEncargadaProps) => {
  const [premios, setPremios] = useState<Premio[]>([{ amount: '', description: '' }]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [agencies, setAgencies] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAgencies();
  }, []);

  useEffect(() => {
    if (selectedAgency) {
      fetchUsers();
    }
  }, [selectedAgency]);

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgencies(data || []);
      
      // Auto-seleccionar primera agencia si existe
      if (data && data.length > 0 && !selectedAgency) {
        setSelectedAgency(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching agencies:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las agencias',
        variant: 'destructive',
      });
    }
  };

  const fetchUsers = async () => {
    if (!selectedAgency) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('agency_id', selectedAgency)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
      
      // Auto-seleccionar primer usuario si existe
      if (data && data.length > 0 && !selectedUser) {
        setSelectedUser(data[0].user_id);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    }
  };

  const addPremio = () => {
    setPremios([...premios, { amount: '', description: '' }]);
  };

  const removePremio = (index: number) => {
    setPremios(premios.filter((_, i) => i !== index));
  };

  const updatePremio = (index: number, field: keyof Premio, value: string) => {
    const newPremios = [...premios];
    newPremios[index] = { ...newPremios[index], [field]: value };
    setPremios(newPremios);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || !dateRange) {
      toast({
        title: 'Error',
        description: 'Selecciona un usuario y un rango de fechas',
        variant: 'destructive',
      });
      return;
    }

    const validPremios = premios.filter(p => p.amount && parseFloat(p.amount) > 0);

    if (validPremios.length === 0) {
      toast({
        title: 'Error',
        description: 'Agrega al menos un premio válido',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const sessionDate = formatDateForDB(dateRange.from);

      // Obtener o crear sesión del día
      let { data: session, error: sessionError } = await supabase
        .from('daily_sessions')
        .select('id')
        .eq('user_id', selectedUser)
        .eq('session_date', sessionDate)
        .maybeSingle();

      if (sessionError) throw sessionError;

      let sessionId: string;

      if (!session) {
        const { data: newSession, error: createError } = await supabase
          .from('daily_sessions')
          .insert({
            user_id: selectedUser,
            session_date: sessionDate,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        sessionId = newSession.id;
      } else {
        sessionId = session.id;
      }

      // Insertar premios
      const premiosToInsert = validPremios.map(premio => ({
        session_id: sessionId,
        amount_bs: parseFloat(premio.amount),
        description: premio.description,
        is_paid: mode === 'paid',
      }));

      const { error: insertError } = await supabase
        .from('pending_prizes')
        .insert(premiosToInsert);

      if (insertError) throw insertError;

      // Actualizar resumen
      await updateDailyCuadresSummary(sessionId);

      toast({
        title: 'Éxito',
        description: `Premios ${mode === 'pending' ? 'por pagar' : 'pagados'} registrados correctamente`,
      });

      setPremios([{ amount: '', description: '' }]);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar los premios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const total = premios.reduce((sum, premio) => {
    const amount = parseFloat(premio.amount) || 0;
    return sum + amount;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Registrar Premios {mode === 'pending' ? 'Por Pagar' : 'Pagados'}
        </CardTitle>
        <CardDescription>
          {mode === 'pending' 
            ? 'Registra los premios que quedan pendientes de pago' 
            : 'Registra los premios que ya fueron pagados'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agencia</label>
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona agencia" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Taquillera</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona taquillera" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {premios.map((premio, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 border rounded-lg">
                <div className="md:col-span-3">
                  <label className="text-sm font-medium">Monto (Bs)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={premio.amount}
                    onChange={(e) => updatePremio(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="md:col-span-8">
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea
                    value={premio.description}
                    onChange={(e) => updatePremio(index, 'description', e.target.value)}
                    placeholder="Detalles del premio..."
                    rows={2}
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  {premios.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removePremio(index)}
                      className="mt-6"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button type="button" variant="outline" onClick={addPremio}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Premio
            </Button>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !selectedUser}>
            {loading ? 'Registrando...' : 'Registrar Premios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
