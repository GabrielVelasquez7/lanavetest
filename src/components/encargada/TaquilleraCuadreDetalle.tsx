import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Calculator, CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDateForDB } from '@/lib/dateUtils';

interface TaquilleraCuadreDetalleProps {
  userId: string;
  selectedDate: Date;
  userFullName: string;
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

export const TaquilleraCuadreDetalle = ({ userId, selectedDate, userFullName }: TaquilleraCuadreDetalleProps) => {
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
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && selectedDate) {
      fetchCuadreData();
    }
  }, [userId, selectedDate]);

  const fetchCuadreData = async () => {
    if (!userId || !selectedDate) return;

    try {
      setLoading(true);
      
      const formattedDate = formatDateForDB(selectedDate);

      console.log('🔍 CUADRE DETALLE DEBUG - Fetching for:', { userId, formattedDate });

      // Get session for the specific date and user
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select('id, cash_available_bs, cash_available_usd, daily_closure_confirmed, closure_notes, exchange_rate')
        .eq('user_id', userId)
        .eq('session_date', formattedDate);

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        console.log('🔍 CUADRE DETALLE DEBUG - No session found, setting empty cuadre');
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

      const sessionData = sessions[0];
      const sessionId = sessionData.id;

      // Fetch all data in parallel
      const [
        salesData, 
        prizesData, 
        expensesData, 
        mobilePaymentsData, 
        posData,
        cuadreSummary
      ] = await Promise.all([
        supabase
          .from('sales_transactions')
          .select('amount_bs, amount_usd')
          .eq('session_id', sessionId),
        supabase
          .from('prize_transactions')
          .select('amount_bs, amount_usd')
          .eq('session_id', sessionId),
        supabase
          .from('expenses')
          .select('amount_bs, amount_usd, category')
          .eq('session_id', sessionId),
        supabase
          .from('mobile_payments')
          .select('amount_bs, description')
          .eq('session_id', sessionId),
        supabase
          .from('point_of_sale')
          .select('amount_bs')
          .eq('session_id', sessionId),
        supabase
          .from('daily_cuadres_summary')
          .select('total_prizes_bs')
          .eq('session_id', sessionId)
          .single()
      ]);

      console.log('🔍 CUADRE DETALLE DEBUG - Query results:', {
        salesData: { data: salesData.data, error: salesData.error },
        prizesData: { data: prizesData.data, error: prizesData.error },
        expensesData: { data: expensesData.data, error: expensesData.error },
        mobilePaymentsData: { data: mobilePaymentsData.data, error: mobilePaymentsData.error },
        posData: { data: posData.data, error: posData.error },
        cuadreSummary: { data: cuadreSummary.data, error: cuadreSummary.error }
      });

      // Check for errors (ignore cuadreSummary error as it might not exist)
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

      // Get premios por pagar from summary or use total prizes
      const premiosPorPagar = cuadreSummary.data?.total_prizes_bs || 0;

      const finalCuadre = {
        totalSales,
        totalPrizes,
        totalGastos,
        totalDeudas,
        pagoMovilRecibidos,
        pagoMovilPagados,
        totalPointOfSale,
        cashAvailable: Number(sessionData.cash_available_bs || 0),
        cashAvailableUsd: Number(sessionData.cash_available_usd || 0),
        closureConfirmed: sessionData.daily_closure_confirmed || false,
        closureNotes: sessionData.closure_notes || '',
        premiosPorPagar: Number(premiosPorPagar),
        exchangeRate: Number(sessionData.exchange_rate || 36.00),
        sessionId: sessionData.id,
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
          <p>Calculando cuadre de {userFullName}...</p>
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
        <h3 className="text-lg font-semibold">Cuadre de {userFullName}</h3>
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
            <div className="text-lg font-bold">{cuadre.exchangeRate.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Tasa del día (Bs por USD)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cash Available Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Efectivo disponible del día</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{cuadre.cashAvailable.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Bs</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Efectivo disponible en USD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{cuadre.cashAvailableUsd.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">$</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Premios por pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{cuadre.premiosPorPagar.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Bs</p>
          </CardContent>
        </Card>
      </div>

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

      {/* Notes Section */}
      {cuadre.closureNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notas del cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{cuadre.closureNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};