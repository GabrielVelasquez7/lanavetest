import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Calculator, CheckCircle2, XCircle, Save, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDateForDB } from '@/lib/dateUtils';

interface CuadreGeneralEncargadaProps {
  selectedAgency: string;
  selectedDate: Date;
  refreshKey?: number;
}

interface CuadreData {
  // Sales & Prizes
  totalSales: { bs: number; usd: number };
  totalPrizes: { bs: number; usd: number };
  
  // Expenses separated by category
  totalGastos: { bs: number; usd: number };
  totalDeudas: { bs: number; usd: number };
  
  // Detailed expenses for dropdowns
  gastosDetails: Array<{ description: string; amount_bs: number; amount_usd: number; created_at: string }>;
  deudasDetails: Array<{ description: string; amount_bs: number; amount_usd: number; created_at: string }>;
  
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
  
  // Multiple sessions for agency
  sessionsCount: number;
}

export const CuadreGeneralEncargada = ({ selectedAgency, selectedDate, refreshKey = 0 }: CuadreGeneralEncargadaProps) => {
  const [cuadre, setCuadre] = useState<CuadreData>({
    totalSales: { bs: 0, usd: 0 },
    totalPrizes: { bs: 0, usd: 0 },
    totalGastos: { bs: 0, usd: 0 },
    totalDeudas: { bs: 0, usd: 0 },
    gastosDetails: [],
    deudasDetails: [],
    pagoMovilRecibidos: 0,
    pagoMovilPagados: 0,
    totalPointOfSale: 0,
    cashAvailable: 0,
    cashAvailableUsd: 0,
    closureConfirmed: false,
    closureNotes: '',
    premiosPorPagar: 0,
    exchangeRate: 36.00,
    sessionsCount: 0,
  });
  
  // State for collapsible dropdowns
  const [gastosOpen, setGastosOpen] = useState(false);
  const [deudasOpen, setDeudasOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && selectedAgency && selectedDate) {
      fetchCuadreData();
    }
  }, [user, selectedAgency, selectedDate, refreshKey]);

  const fetchCuadreData = async () => {
    if (!user || !selectedAgency || !selectedDate) return;

    try {
      setLoading(true);
      const dateStr = formatDateForDB(selectedDate);

      console.log('🔍 CUADRE ENCARGADA DEBUG - Fechas:', { dateStr, selectedAgency });

      // Get sessions for the agency on the selected date
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select(`
          id, 
          cash_available_bs, 
          cash_available_usd, 
          daily_closure_confirmed, 
          closure_notes, 
          exchange_rate,
          user_id,
          profiles!inner(agency_id)
        `)
        .eq('profiles.agency_id', selectedAgency)
        .eq('session_date', dateStr);

      console.log('🔍 CUADRE ENCARGADA DEBUG - Sessions query:', { sessions, sessionsError });

      if (sessionsError) throw sessionsError;

      const sessionIds = sessions?.map(s => s.id) || [];
      console.log('🔍 CUADRE ENCARGADA DEBUG - Session IDs to query:', sessionIds);

      if (sessionIds.length === 0) {
        setCuadre({
          totalSales: { bs: 0, usd: 0 },
          totalPrizes: { bs: 0, usd: 0 },
          totalGastos: { bs: 0, usd: 0 },
          totalDeudas: { bs: 0, usd: 0 },
          gastosDetails: [],
          deudasDetails: [],
          pagoMovilRecibidos: 0,
          pagoMovilPagados: 0,
          totalPointOfSale: 0,
          cashAvailable: 0,
          cashAvailableUsd: 0,
          closureConfirmed: false,
          closureNotes: '',
          premiosPorPagar: 0,
          exchangeRate: 36.00,
          sessionsCount: 0,
        });
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [
        salesData, 
        prizesData, 
        expensesData, 
        mobilePaymentsData, 
        posData,
        pendingPrizesData
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
          .select('amount_bs, amount_usd, category, description, created_at')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        supabase
          .from('mobile_payments')
          .select('amount_bs, description')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        supabase
          .from('point_of_sale')
          .select('amount_bs')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        supabase
          .from('pending_prizes')
          .select('amount_bs, is_paid')
          .in('session_id', sessionIds)
      ]);

      console.log('🔍 CUADRE ENCARGADA DEBUG - Query results:', {
        salesData: { data: salesData.data, error: salesData.error },
        prizesData: { data: prizesData.data, error: prizesData.error },
        expensesData: { data: expensesData.data, error: expensesData.error },
        mobilePaymentsData: { data: mobilePaymentsData.data, error: mobilePaymentsData.error },
        posData: { data: posData.data, error: posData.error },
        pendingPrizesData: { data: pendingPrizesData.data, error: pendingPrizesData.error }
      });

      // Check for errors
      if (salesData.error) throw salesData.error;
      if (prizesData.error) throw prizesData.error;
      if (expensesData.error) throw expensesData.error;
      if (mobilePaymentsData.error) throw mobilePaymentsData.error;
      if (posData.error) throw posData.error;
      if (pendingPrizesData.error) throw pendingPrizesData.error;

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

      // Calculate pending prizes from new table
      const premiosPorPagarFromDB = pendingPrizesData.data?.filter(p => !p.is_paid)
        .reduce((sum, item) => sum + Number(item.amount_bs || 0), 0) || 0;

      // Aggregate session data
      const totalCashAvailable = sessions?.reduce((sum, s) => sum + Number(s.cash_available_bs || 0), 0) || 0;
      const totalCashAvailableUsd = sessions?.reduce((sum, s) => sum + Number(s.cash_available_usd || 0), 0) || 0;
      const averageExchangeRate = sessions?.length ? 
        sessions.reduce((sum, s) => sum + Number(s.exchange_rate || 36), 0) / sessions.length : 36;
      const allConfirmed = sessions?.every(s => s.daily_closure_confirmed) || false;
      const combinedNotes = sessions?.map(s => s.closure_notes).filter(n => n).join(' | ') || '';

      const finalCuadre = {
        totalSales,
        totalPrizes,
        totalGastos,
        totalDeudas,
        gastosDetails: gastos,
        deudasDetails: deudas,
        pagoMovilRecibidos,
        pagoMovilPagados,
        totalPointOfSale,
        cashAvailable: totalCashAvailable,
        cashAvailableUsd: totalCashAvailableUsd,
        closureConfirmed: allConfirmed,
        closureNotes: combinedNotes,
        premiosPorPagar: premiosPorPagarFromDB,
        exchangeRate: averageExchangeRate,
        sessionId: sessions?.[0]?.id,
        sessionsCount: sessions?.length || 0,
      };
      
      setCuadre(finalCuadre);
    } catch (error) {
      console.error('Error fetching cuadre data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Calculando resumen general...</p>
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
  const excessUsd = cuadre.cashAvailableUsd - cuadreVentasPremios.usd;
  
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

  return (
    <div className="space-y-6">
      {/* Title and Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Resumen General</h2>
          {cuadre.sessionsCount > 0 && (
            <Badge variant="outline">
              {cuadre.sessionsCount} sesión{cuadre.sessionsCount !== 1 ? 'es' : ''}
            </Badge>
          )}
        </div>
        {cuadre.closureConfirmed && (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Cuadre Confirmado
          </Badge>
        )}
      </div>

      {/* Exchange Rate Display */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="text-center space-y-2">
            <div className="text-lg">💱</div>
            <p className="text-sm text-muted-foreground">
              Tasa promedio del día: <span className="font-bold">{cuadre.exchangeRate.toFixed(2)} Bs por USD</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Sales */}
        <Card className="border-2 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(cuadre.totalSales.bs, 'VES')}
            </p>
            <p className="text-sm text-green-600">
              {formatCurrency(cuadre.totalSales.usd, 'USD')}
            </p>
          </CardContent>
        </Card>

        {/* Total Prizes */}
        <Card className="border-2 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">Total Premios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(cuadre.totalPrizes.bs, 'VES')}
            </p>
            <p className="text-sm text-red-600">
              {formatCurrency(cuadre.totalPrizes.usd, 'USD')}
            </p>
          </CardContent>
        </Card>

        {/* Net Sales */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700">Cuadre (Ventas - Premios)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(cuadreVentasPremios.bs, 'VES')}
            </p>
            <p className="text-sm text-blue-600">
              {formatCurrency(cuadreVentasPremios.usd, 'USD')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Final Balance */}
      <Card className={`border-2 ${isCuadreBalanced ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}>
        <CardHeader>
          <CardTitle className="text-primary">Balance Final</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-3xl font-bold mb-2">
              <span className={isCuadreBalanced ? 'text-success' : 'text-destructive'}>
                {formatCurrency(diferenciaFinal, 'VES')}
              </span>
            </p>
            <div className="flex items-center gap-2 justify-center">
              {isCuadreBalanced ? (
                <Badge variant="default" className="flex items-center gap-2 px-4 py-2 text-base bg-success">
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
        </CardContent>
      </Card>

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
                  <Collapsible open={deudasOpen} onOpenChange={setDeudasOpen}>
                    <CollapsibleTrigger asChild>
                      <div className="flex justify-between items-center cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors">
                        <span className="flex items-center gap-1">
                          {deudasOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          Deudas:
                        </span>
                        <span className="font-medium">{formatCurrency(cuadre.totalDeudas.bs, 'VES')}</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 mt-2 space-y-1 text-xs">
                        {cuadre.deudasDetails.length > 0 ? (
                          cuadre.deudasDetails.map((deuda, index) => (
                            <div key={index} className="flex justify-between items-center py-1 px-2 bg-muted/30 rounded">
                              <div className="flex-1">
                                <span className="text-muted-foreground">{deuda.description}</span>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(deuda.created_at), 'dd/MM/yyyy')}
                                </div>
                              </div>
                              <div className="text-right">
                                <div>{formatCurrency(deuda.amount_bs, 'VES')}</div>
                                {deuda.amount_usd > 0 && (
                                  <div className="text-xs text-muted-foreground">{formatCurrency(deuda.amount_usd, 'USD')}</div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground text-center py-2">No hay deudas registradas</div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible open={gastosOpen} onOpenChange={setGastosOpen}>
                    <CollapsibleTrigger asChild>
                      <div className="flex justify-between items-center cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors">
                        <span className="flex items-center gap-1">
                          {gastosOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          Gastos:
                        </span>
                        <span className="font-medium">{formatCurrency(cuadre.totalGastos.bs, 'VES')}</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 mt-2 space-y-1 text-xs">
                        {cuadre.gastosDetails.length > 0 ? (
                          cuadre.gastosDetails.map((gasto, index) => (
                            <div key={index} className="flex justify-between items-center py-1 px-2 bg-muted/30 rounded">
                              <div className="flex-1">
                                <span className="text-muted-foreground">{gasto.description}</span>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(gasto.created_at), 'dd/MM/yyyy')}
                                </div>
                              </div>
                              <div className="text-right">
                                <div>{formatCurrency(gasto.amount_bs, 'VES')}</div>
                                {gasto.amount_usd > 0 && (
                                  <div className="text-xs text-muted-foreground">{formatCurrency(gasto.amount_usd, 'USD')}</div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground text-center py-2">No hay gastos registrados</div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
                    <span>Total USD:</span>
                    <span>{formatCurrency(cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd, 'USD')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Comparación USD:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total USD:</span>
                    <span className="font-medium">{formatCurrency(cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cuadre USD (V-P):</span>
                    <span className="font-medium">{formatCurrency(cuadreVentasPremios.usd, 'USD')}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-bold text-xl">
                    <span>Diferencia USD:</span>
                    <span className={`${Math.abs(excessUsd) <= 10 ? 'text-success' : 'text-accent'}`}>
                      {formatCurrency(excessUsd, 'USD')}
                    </span>
                  </div>
                  {Math.abs(excessUsd) > 10 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {excessUsd > 0 ? 'Excedente convertido a Bs en el cálculo' : 'Déficit manejado en el cálculo'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      {cuadre.closureNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notas del Cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm p-3 bg-muted/50 rounded border">
              {cuadre.closureNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};