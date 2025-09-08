import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Calculator, CheckCircle2, XCircle, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDateForDB } from '@/lib/dateUtils';

interface CuadreGeneralProps {
  refreshKey?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

interface CuadreData {
  // Sales & Prizes
  totalSales: { bs: number; usd: number };
  totalPrizes: { bs: number; usd: number };
  
  // Expenses separated by category
  totalGastos: { bs: number; usd: number };
  totalDeudas: { bs: number; usd: number };
  
  // Mobile payments separated
  pagoMovilRecibidos: number;
  pagoMovilPagados: number;
  
  // Point of sale
  totalPointOfSale: number;
  
  // Daily closure data
  cashAvailable: number;
  cashAvailableUsd: number;
  closureConfirmed: boolean;
  closureNotes: string;
  premiosPorPagar: number;
  
  // Exchange rate
  exchangeRate: number;
  
  // Session info
  sessionId?: string;
}

export const CuadreGeneral = ({ refreshKey = 0, dateRange }: CuadreGeneralProps) => {
  const [cuadre, setCuadre] = useState<CuadreData>({
    totalSales: { bs: 0, usd: 0 },
    totalPrizes: { bs: 0, usd: 0 },
    totalGastos: { bs: 0, usd: 0 },
    totalDeudas: { bs: 0, usd: 0 },
    pagoMovilRecibidos: 0,
    pagoMovilPagados: 0,
    totalPointOfSale: 0,
    cashAvailable: 0,
    cashAvailableUsd: 0,
    closureConfirmed: false,
    closureNotes: '',
    premiosPorPagar: 0,
    exchangeRate: 36.00,
  });
  
  // Temporary string states for input fields
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('36.00');
  const [cashAvailableInput, setCashAvailableInput] = useState<string>('0');
  const [cashAvailableUsdInput, setCashAvailableUsdInput] = useState<string>('0');
  const [premiosPorPagarInput, setPremiosPorPagarInput] = useState<string>('0');
  
  // Track if user has manually edited the fields to prevent overriding them
  const [fieldsEditedByUser, setFieldsEditedByUser] = useState({
    exchangeRate: false,
    cashAvailable: false,
    cashAvailableUsd: false,
    premiosPorPagar: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && dateRange) {
      fetchCuadreData();
    }
  }, [user, refreshKey, dateRange]);

  const fetchCuadreData = async () => {
    if (!user || !dateRange) return;

    try {
      setLoading(true);
      
      const fromDate = formatDateForDB(dateRange.from);
      const toDate = formatDateForDB(dateRange.to);

      console.log('🔍 CUADRE DEBUG - Fechas:', { fromDate, toDate, dateRange });

      // Get sessions in date range - using user.id (auth user ID)
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select('id, cash_available_bs, cash_available_usd, daily_closure_confirmed, closure_notes, exchange_rate')
        .eq('user_id', user.id)
        .gte('session_date', fromDate)
        .lte('session_date', toDate);

      console.log('🔍 CUADRE DEBUG - Sessions query:', { sessions, sessionsError, userId: user.id });

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        console.log('🔍 CUADRE DEBUG - No sessions found, setting empty cuadre');
        setCuadre({
          totalSales: { bs: 0, usd: 0 },
          totalPrizes: { bs: 0, usd: 0 },
          totalGastos: { bs: 0, usd: 0 },
          totalDeudas: { bs: 0, usd: 0 },
          pagoMovilRecibidos: 0,
          pagoMovilPagados: 0,
          totalPointOfSale: 0,
          cashAvailable: 0,
          cashAvailableUsd: 0,
          closureConfirmed: false,
          closureNotes: '',
          premiosPorPagar: 0,
          exchangeRate: 36.00,
        });
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);
      console.log('🔍 CUADRE DEBUG - Session IDs to query:', sessionIds);
      
      // For single day, get session data
      let sessionData = null;
      if (sessions.length === 1) {
        sessionData = sessions[0];
      }

      // Fetch all data in parallel
      const [
        salesData, 
        prizesData, 
        expensesData, 
        mobilePaymentsData, 
        posData
      ] = await Promise.all([
        supabase
          .from('sales_transactions')
          .select('amount_bs, amount_usd')
          .in('session_id', sessionIds),
        supabase
          .from('prize_transactions')
          .select('amount_bs, amount_usd')
          .in('session_id', sessionIds),
        supabase
          .from('expenses')
          .select('amount_bs, amount_usd, category')
          .in('session_id', sessionIds),
        supabase
          .from('mobile_payments')
          .select('amount_bs, description')
          .in('session_id', sessionIds),
        supabase
          .from('point_of_sale')
          .select('amount_bs')
          .in('session_id', sessionIds)
      ]);

      console.log('🔍 CUADRE DEBUG - Query results:', {
        salesData: { data: salesData.data, error: salesData.error },
        prizesData: { data: prizesData.data, error: prizesData.error },
        expensesData: { data: expensesData.data, error: expensesData.error },
        mobilePaymentsData: { data: mobilePaymentsData.data, error: mobilePaymentsData.error },
        posData: { data: posData.data, error: posData.error }
      });

      // Check for errors
      if (salesData.error) throw salesData.error;
      if (prizesData.error) throw prizesData.error;
      if (expensesData.error) throw expensesData.error;
      if (mobilePaymentsData.error) throw mobilePaymentsData.error;
      if (posData.error) throw posData.error;

      // Calculate totals
      const totalSales = salesData.data?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      const totalPrizes = prizesData.data?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      // Separate expenses by category
      const gastos = expensesData.data?.filter(e => e.category === 'gasto_operativo') || [];
      const deudas = expensesData.data?.filter(e => e.category === 'deuda') || [];

      const totalGastos = gastos.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      );

      const totalDeudas = deudas.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      );

      // Separate mobile payments (positive = received, negative = paid)
      const pagoMovilRecibidos = mobilePaymentsData.data?.reduce(
        (sum, item) => {
          const amount = Number(item.amount_bs || 0);
          return amount > 0 ? sum + amount : sum;
        },
        0
      ) || 0;

      const pagoMovilPagados = Math.abs(mobilePaymentsData.data?.reduce(
        (sum, item) => {
          const amount = Number(item.amount_bs || 0);
          return amount < 0 ? sum + amount : sum;
        },
        0
      ) || 0);

      const totalPointOfSale = posData.data?.reduce(
        (sum, item) => sum + Number(item.amount_bs || 0),
        0
      ) || 0;

      const finalCuadre = {
        totalSales,
        totalPrizes,
        totalGastos,
        totalDeudas,
        pagoMovilRecibidos,
        pagoMovilPagados,
        totalPointOfSale,
        cashAvailable: sessionData ? Number(sessionData.cash_available_bs || 0) : 0,
        cashAvailableUsd: sessionData ? Number(sessionData.cash_available_usd || 0) : 0,
        closureConfirmed: sessionData ? sessionData.daily_closure_confirmed || false : false,
        closureNotes: sessionData ? sessionData.closure_notes || '' : '',
        premiosPorPagar: 0,
        exchangeRate: sessionData ? Number(sessionData.exchange_rate || 36.00) : 36.00,
        sessionId: sessionData?.id,
      };
      
      setCuadre(finalCuadre);
      
      // Update input states only if user hasn't edited them manually
      if (!fieldsEditedByUser.exchangeRate) {
        setExchangeRateInput(finalCuadre.exchangeRate.toString());
      }
      if (!fieldsEditedByUser.cashAvailable) {
        setCashAvailableInput(finalCuadre.cashAvailable.toString());
      }
      if (!fieldsEditedByUser.cashAvailableUsd) {
        setCashAvailableUsdInput(finalCuadre.cashAvailableUsd.toString());
      }
      if (!fieldsEditedByUser.premiosPorPagar) {
        setPremiosPorPagarInput(finalCuadre.premiosPorPagar.toString());
      }
    } catch (error) {
      console.error('Error fetching cuadre data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDailyClosure = async () => {
    if (!user || !cuadre.sessionId) {
      toast({
        title: 'Error',
        description: 'Debes tener una sesión activa para registrar el cierre',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('daily_sessions')
        .update({
          cash_available_bs: cuadre.cashAvailable,
          cash_available_usd: cuadre.cashAvailableUsd,
          daily_closure_confirmed: cuadre.closureConfirmed,
          closure_notes: cuadre.closureNotes,
          exchange_rate: cuadre.exchangeRate,
        })
        .eq('id', cuadre.sessionId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Cierre diario guardado correctamente',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al guardar el cierre',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Calculando cuadre general...</p>
        </div>
      </div>
    );
  }

  // Calculate main cuadre (Sales - Prizes)
  const cuadreVentasPremios = {
    bs: cuadre.totalSales.bs - cuadre.totalPrizes.bs,
    usd: cuadre.totalSales.usd - cuadre.totalPrizes.usd,
  };

  // Calculate bank total (Mobile received + POS - Mobile paid)
  const totalBanco = cuadre.pagoMovilRecibidos + cuadre.totalPointOfSale - cuadre.pagoMovilPagados;

  // Calculate USD excess (difference) for BS formula
  const excessUsd = (cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd) - cuadreVentasPremios.usd;
  
  // Bolivares Closure Formula
  const sumatoriaBolivares = 
    cuadre.cashAvailable + 
    totalBanco + 
    cuadre.totalDeudas.bs + 
    cuadre.totalGastos.bs + 
    (excessUsd * cuadre.exchangeRate);

  const diferenciaCierre = sumatoriaBolivares - cuadreVentasPremios.bs;
  const diferenciaFinal = diferenciaCierre - cuadre.premiosPorPagar;
  const isCuadreBalanced = Math.abs(diferenciaFinal) <= 100; // Allow 100 Bs tolerance

  const isSingleDay = dateRange && format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* Title and Status */}
      <div className="flex items-center justify-between">
        
        {cuadre.closureConfirmed && (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Cuadre Confirmado
          </Badge>
        )}
      </div>

      {/* Daily Closure Section - Only for single day */}
      {isSingleDay && (
        <Card className="border-2 border-accent/20">
          <CardContent className="space-y-4 pt-6">
            {/* Exchange Rate Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="text-center space-y-2">
                    <div className="text-lg">💱</div>
                    <Input
                      id="exchange-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="36.00"
                      value={exchangeRateInput}
                      onChange={(e) => {
                        setExchangeRateInput(e.target.value);
                        setFieldsEditedByUser(prev => ({ ...prev, exchangeRate: true }));
                        const rate = parseFloat(e.target.value);
                        if (!isNaN(rate) && rate > 0) {
                          setCuadre(prev => ({ ...prev, exchangeRate: rate }));
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || parseFloat(e.target.value) <= 0) {
                          setExchangeRateInput('36.00');
                          setCuadre(prev => ({ ...prev, exchangeRate: 36.00 }));
                        }
                      }}
                      className="text-center font-medium"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Tasa del día (Bs por USD)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cash-available">Efectivo disponible del día</Label>
                <div className="relative">
                  <Input
                    id="cash-available"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashAvailableInput}
                    onChange={(e) => {
                      setCashAvailableInput(e.target.value);
                      setFieldsEditedByUser(prev => ({ ...prev, cashAvailable: true }));
                      const amount = parseFloat(e.target.value);
                      if (!isNaN(amount) && amount >= 0) {
                        setCuadre(prev => ({ ...prev, cashAvailable: amount }));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                        setCashAvailableInput('0');
                        setCuadre(prev => ({ ...prev, cashAvailable: 0 }));
                      }
                    }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Bs
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cash-available-usd">Efectivo disponible en USD</Label>
                <div className="relative">
                  <Input
                    id="cash-available-usd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashAvailableUsdInput}
                    onChange={(e) => {
                      setCashAvailableUsdInput(e.target.value);
                      setFieldsEditedByUser(prev => ({ ...prev, cashAvailableUsd: true }));
                      const amount = parseFloat(e.target.value);
                      if (!isNaN(amount) && amount >= 0) {
                        setCuadre(prev => ({ ...prev, cashAvailableUsd: amount }));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                        setCashAvailableUsdInput('0');
                        setCuadre(prev => ({ ...prev, cashAvailableUsd: 0 }));
                      }
                    }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="premios-por-pagar">Premios por pagar</Label>
                <div className="relative">
                  <Input
                    id="premios-por-pagar"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={premiosPorPagarInput}
                    onChange={(e) => {
                      setPremiosPorPagarInput(e.target.value);
                      setFieldsEditedByUser(prev => ({ ...prev, premiosPorPagar: true }));
                      const amount = parseFloat(e.target.value);
                      if (!isNaN(amount) && amount >= 0) {
                        setCuadre(prev => ({ ...prev, premiosPorPagar: amount }));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                        setPremiosPorPagarInput('0');
                        setCuadre(prev => ({ ...prev, premiosPorPagar: 0 }));
                      }
                    }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Bs
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-success flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pago Móvil Recibidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-success">
              {formatCurrency(cuadre.pagoMovilRecibidos, 'VES')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Pago Móvil Pagados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-destructive">
              {formatCurrency(cuadre.pagoMovilPagados, 'VES')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">
              Punto de Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(cuadre.totalPointOfSale, 'VES')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Closure Formula Card */}
      <Card className="border-2 border-primary/20 border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-primary">Resumen en Bolívares</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Sumatoria:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Efectivo del día:</span>
                    <span className="font-medium">{formatCurrency(cuadre.cashAvailable, 'VES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total en banco:</span>
                    <span className="font-medium">{formatCurrency(totalBanco, 'VES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deudas:</span>
                    <span className="font-medium">{formatCurrency(cuadre.totalDeudas.bs, 'VES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos:</span>
                    <span className="font-medium">{formatCurrency(cuadre.totalGastos.bs, 'VES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Excedente USD → Bs (x{cuadre.exchangeRate.toFixed(2)}):</span>
                    <span className="font-medium">{formatCurrency(excessUsd * cuadre.exchangeRate, 'VES')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total Sumatoria:</span>
                    <span>{formatCurrency(sumatoriaBolivares, 'VES')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Comparación:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sumatoria:</span>
                    <span className="font-medium">{formatCurrency(sumatoriaBolivares, 'VES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cuadre (V-P):</span>
                    <span className="font-medium">{formatCurrency(cuadreVentasPremios.bs, 'VES')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Diferencia inicial:</span>
                    <span className="font-medium">{formatCurrency(diferenciaCierre, 'VES')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Menos: Premios por pagar:</span>
                    <span className="font-medium">-{formatCurrency(cuadre.premiosPorPagar, 'VES')}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-bold text-xl mb-4">
                    <span>Diferencia Final:</span>
                    <span className={`${isCuadreBalanced ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(diferenciaFinal, 'VES')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-center mt-4">
                    {isCuadreBalanced ? (
                      <Badge variant="default" className="flex items-center gap-2 px-4 py-2 text-base">
                        <CheckCircle2 className="h-4 w-4" />
                        ¡Cuadre Perfecto!
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-2 px-4 py-2 text-base">
                        <XCircle className="h-4 w-4" />
                        Diferencia encontrada
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* USD Closure Formula Card */}
      <Card className="border-2 border-accent/20 border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="text-accent">Resumen en Dólares (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Sumatoria USD:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Efectivo en dólares:</span>
                    <span className="font-medium">{formatCurrency(cuadre.cashAvailableUsd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos en USD:</span>
                    <span className="font-medium">{formatCurrency(cuadre.totalGastos.usd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deudas en USD:</span>
                    <span className="font-medium">{formatCurrency(cuadre.totalDeudas.usd, 'USD')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total Sumatoria USD:</span>
                    <span>{formatCurrency(cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd, 'USD')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Comparación USD:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sumatoria USD:</span>
                    <span className="font-medium">{formatCurrency(cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cuadre USD (V-P):</span>
                    <span className="font-medium">{formatCurrency(cuadreVentasPremios.usd, 'USD')}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-bold text-xl mb-4">
                    <span>Diferencia USD:</span>
                    <span className={(cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd) - cuadreVentasPremios.usd === 0 ? 'text-success' : 'text-accent'}>
                      {formatCurrency((cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd) - cuadreVentasPremios.usd, 'USD')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-center mt-4">
                    {(cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd) - cuadreVentasPremios.usd === 0 ? (
                      <Badge variant="default" className="flex items-center gap-2 px-4 py-2 text-base">
                        <CheckCircle2 className="h-4 w-4" />
                        ¡Cuadre Perfecto!
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-2 px-5 py-3 text-lg font-semibold">
                        💰 Excedente USD → Bs
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    El excedente en USD se convierte a bolívares según la tasa del día.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation and Notes Section - Only for single day */}
      {isSingleDay && (
        <Card className="border-2 border-accent/20">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <Switch
                  id="closure-confirmed"
                  checked={cuadre.closureConfirmed}
                  onCheckedChange={(checked) => setCuadre(prev => ({ 
                    ...prev, 
                    closureConfirmed: checked 
                  }))}
                />
                <Label htmlFor="closure-confirmed">
                  ¿Confirmas que el cuadre está correcto?
                </Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="closure-notes">Notas del cierre (opcional)</Label>
              <Textarea
                id="closure-notes"
                placeholder="Agregar observaciones sobre el cierre del día..."
                value={cuadre.closureNotes}
                onChange={(e) => setCuadre(prev => ({ 
                  ...prev, 
                  closureNotes: e.target.value 
                }))}
                rows={3}
              />
            </div>
            
            <Button 
              onClick={saveDailyClosure} 
              disabled={saving || !cuadre.sessionId}
              className="w-full"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cierre Diario'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};