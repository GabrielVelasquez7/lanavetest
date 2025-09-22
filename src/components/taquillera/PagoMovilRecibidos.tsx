import { getTodayVenezuela } from '@/lib/dateUtils';

// Helper function to update daily cuadres summary
const updateDailyCuadresSummary = async (sessionId: string, userId: string, sessionDate: string) => {
  // Get all data for this session
  const [salesRes, prizesRes, posRes, expensesRes, mobilePaymentsRes, sessionRes] = await Promise.all([
    supabase.from('sales_transactions').select('amount_bs, amount_usd').eq('session_id', sessionId),
    supabase.from('prize_transactions').select('amount_bs, amount_usd').eq('session_id', sessionId),
    supabase.from('point_of_sale').select('amount_bs').eq('session_id', sessionId),
    supabase.from('expenses').select('amount_bs, amount_usd, category').eq('session_id', sessionId),
    supabase.from('mobile_payments').select('amount_bs').eq('session_id', sessionId),
    supabase.from('daily_sessions').select('cash_available_bs, cash_available_usd, exchange_rate').eq('id', sessionId).single()
  ]);

  // Calculate totals
  const totalSalesBs = salesRes.data?.reduce((sum, item) => sum + Number(item.amount_bs), 0) || 0;
  const totalSalesUsd = salesRes.data?.reduce((sum, item) => sum + Number(item.amount_usd), 0) || 0;
  const totalPrizesBs = prizesRes.data?.reduce((sum, item) => sum + Number(item.amount_bs), 0) || 0;
  const totalPrizesUsd = prizesRes.data?.reduce((sum, item) => sum + Number(item.amount_usd), 0) || 0;
  const totalPosBs = posRes.data?.reduce((sum, item) => sum + Number(item.amount_bs), 0) || 0;
  
  // Calculate expenses by category
  const gastos = expensesRes.data?.filter(exp => exp.category === 'gasto_operativo') || [];
  const deudas = expensesRes.data?.filter(exp => exp.category === 'deuda') || [];
  
  const totalGastosBs = gastos.reduce((sum, item) => sum + Number(item.amount_bs), 0);
  const totalGastosUsd = gastos.reduce((sum, item) => sum + Number(item.amount_usd), 0);
  const totalDeudasBs = deudas.reduce((sum, item) => sum + Number(item.amount_bs), 0);
  const totalDeudasUsd = deudas.reduce((sum, item) => sum + Number(item.amount_usd), 0);
  
  // Calculate mobile payments
  const totalMobilePaymentsBs = mobilePaymentsRes.data?.reduce((sum, item) => sum + Number(item.amount_bs), 0) || 0;

  const sessionData = sessionRes.data;
  const cashAvailableBs = Number(sessionData?.cash_available_bs || 0);
  const cashAvailableUsd = Number(sessionData?.cash_available_usd || 0);
  const exchangeRate = Number(sessionData?.exchange_rate || 36);

  // Calculate cuadre and balance
  const cuadreVentasPremiosBs = totalSalesBs - totalPrizesBs;
  const cuadreVentasPremiosUsd = totalSalesUsd - totalPrizesUsd;
  const balanceBs = cuadreVentasPremiosBs - totalGastosBs - totalDeudasBs + totalMobilePaymentsBs + totalPosBs;

  // Upsert the summary
  await supabase
    .from('daily_cuadres_summary')
    .upsert({
      session_id: sessionId,
      user_id: userId,
      session_date: sessionDate,
      total_sales_bs: totalSalesBs,
      total_sales_usd: totalSalesUsd,
      total_prizes_bs: totalPrizesBs,
      total_prizes_usd: totalPrizesUsd,
      total_expenses_bs: totalGastosBs + totalDeudasBs,
      total_expenses_usd: totalGastosUsd + totalDeudasUsd,
      total_debt_bs: totalDeudasBs,
      total_debt_usd: totalDeudasUsd,
      total_mobile_payments_bs: totalMobilePaymentsBs,
      total_pos_bs: totalPosBs,
      cash_available_bs: cashAvailableBs,
      cash_available_usd: cashAvailableUsd,
      exchange_rate: exchangeRate,
      balance_bs: balanceBs
    }, { onConflict: 'session_id' });
};

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Minus, Save, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PagoRecibido {
  id: string;
  amount_bs: string;
  reference_number: string;
  description: string;
}

interface PagoMovilRecibidosProps {
  onSuccess?: () => void;
  selectedAgency?: string;
  selectedDate?: Date;
}

export const PagoMovilRecibidos = ({ onSuccess, selectedAgency: propSelectedAgency, selectedDate: propSelectedDate }: PagoMovilRecibidosProps) => {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [agencies, setAgencies] = useState<any[]>([]);
  
  // Use props if provided, otherwise fallback to internal state
  const selectedAgency = propSelectedAgency || '';
  const selectedDate = propSelectedDate || new Date();
  const [pagos, setPagos] = useState<PagoRecibido[]>([
    { id: '1', amount_bs: '', reference_number: '', description: '' }
  ]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load user profile and agencies for encargadas
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      // Get user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, agency_id')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);

      // If user is encargada, load agencies
      if (profile?.role === 'encargada') {
        const { data: agenciesData } = await supabase
          .from('agencies')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        
        setAgencies(agenciesData || []);
        
        // Note: Agency selection is handled by parent component when props are provided
      }
    };

    loadUserData();
  }, [user]);

  const addPago = () => {
    setPagos(prev => [...prev, { 
      id: Date.now().toString(), 
      amount_bs: '', 
      reference_number: '', 
      description: '' 
    }]);
  };

  const removePago = (id: string) => {
    if (pagos.length > 1) {
      setPagos(prev => prev.filter(p => p.id !== id));
    }
  };

  const updatePago = (id: string, field: keyof PagoRecibido, value: string) => {
    setPagos(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const onSubmit = async () => {
    if (!user || !userProfile) return;

    // Validate all fields
    const validPagos = pagos.filter(p => 
      p.amount_bs && p.reference_number && parseFloat(p.amount_bs.replace(',', '.')) > 0
    );

    if (validPagos.length === 0) {
      toast({
        title: 'Error',
        description: 'Debes agregar al menos un pago válido',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const isEncargada = userProfile.role === 'encargada';

      if (isEncargada) {
        // Encargada workflow - insert directly with agency_id and transaction_date
        if (!selectedAgency) {
          toast({
            title: 'Error',
            description: 'Debes seleccionar una agencia',
            variant: 'destructive',
          });
          return;
        }

        // Prepare payments for insertion
        const paymentsToInsert = validPagos.map(pago => ({
          agency_id: selectedAgency,
          transaction_date: format(selectedDate, 'yyyy-MM-dd'),
          amount_bs: parseFloat(pago.amount_bs.replace(',', '.')),
          reference_number: pago.reference_number,
          description: pago.description ? `[RECIBIDO] ${pago.description}` : '[RECIBIDO]',
          session_id: null, // Encargada doesn't have sessions
        }));

        // Insert all payments
        const { error } = await supabase
          .from('mobile_payments')
          .insert(paymentsToInsert);

        if (error) throw error;
      } else {
        // Taquillera workflow - use session_id (existing logic)
        const today = getTodayVenezuela();
        
        let { data: session, error: sessionError } = await supabase
          .from('daily_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('session_date', today)
          .maybeSingle();

        if (!session) {
          const { data: newSession, error: createError } = await supabase
            .from('daily_sessions')
            .insert({
              user_id: user.id,
              session_date: today,
            })
            .select('id')
            .single();

          if (createError) throw createError;
          session = newSession;
        }

        // Prepare payments for insertion
        const paymentsToInsert = validPagos.map(pago => ({
          session_id: session.id,
          amount_bs: parseFloat(pago.amount_bs.replace(',', '.')),
          reference_number: pago.reference_number,
          description: pago.description ? `[RECIBIDO] ${pago.description}` : '[RECIBIDO]',
        }));

        // Insert all payments
        const { error } = await supabase
          .from('mobile_payments')
          .insert(paymentsToInsert);

        if (error) throw error;

        // Update daily cuadres summary for taquillera
        await updateDailyCuadresSummary(session.id, user.id, today);
      }

      toast({
        title: 'Éxito',
        description: `${validPagos.length} pago${validPagos.length > 1 ? 's' : ''} móvil${validPagos.length > 1 ? 'es' : ''} recibido${validPagos.length > 1 ? 's' : ''} registrado${validPagos.length > 1 ? 's' : ''} correctamente`,
      });

      // Reset form
      setPagos([{ id: '1', amount_bs: '', reference_number: '', description: '' }]);
      
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar los pagos móviles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Only show agency and date selectors if not provided as props (taquillera mode) */}
      {!propSelectedAgency && userProfile?.role === 'encargada' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Agencia</Label>
            <Select value={selectedAgency} onValueChange={() => {}}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una agencia" />
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
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {}}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Pagos Móviles Recibidos</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPago}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar Pago
        </Button>
      </div>

      {/* Payment forms */}
      <div className="space-y-4">
        {pagos.map((pago, index) => (
          <Card key={pago.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Pago {index + 1}</CardTitle>
                {pagos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePago(pago.id)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Monto (Bs)</Label>
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={pago.amount_bs}
                    onChange={(e) => updatePago(pago.id, 'amount_bs', e.target.value)}
                    onBlur={(e) => {
                      const cleanValue = e.target.value.replace(/[^\d,]/g, '');
                      const numValue = parseFloat(cleanValue.replace(',', '.')) || 0;
                      const formatted = numValue > 0 ? numValue.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) : '';
                      updatePago(pago.id, 'amount_bs', formatted);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input
                    placeholder="123456789"
                    value={pago.reference_number}
                    onChange={(e) => updatePago(pago.id, 'reference_number', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    placeholder="Cliente, concepto..."
                    value={pago.description}
                    onChange={(e) => updatePago(pago.id, 'description', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit button */}
      <Button onClick={onSubmit} disabled={loading} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {loading ? 'Registrando...' : `Registrar ${pagos.length} Pago${pagos.length > 1 ? 's' : ''} Recibido${pagos.length > 1 ? 's' : ''}`}
      </Button>
    </div>
  );
};