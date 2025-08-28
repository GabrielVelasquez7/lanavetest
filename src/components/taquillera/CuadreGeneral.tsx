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
  closureConfirmed: boolean;
  closureNotes: string;
  
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
    closureConfirmed: false,
    closureNotes: '',
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
      
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Get sessions in date range - using user.id (auth user ID)
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select('id, cash_available_bs, daily_closure_confirmed, closure_notes')
        .eq('user_id', user.id)
        .gte('session_date', fromDate)
        .lte('session_date', toDate);

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        setCuadre({
          totalSales: { bs: 0, usd: 0 },
          totalPrizes: { bs: 0, usd: 0 },
          totalGastos: { bs: 0, usd: 0 },
          totalDeudas: { bs: 0, usd: 0 },
          pagoMovilRecibidos: 0,
          pagoMovilPagados: 0,
          totalPointOfSale: 0,
          cashAvailable: 0,
          closureConfirmed: false,
          closureNotes: '',
        });
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);
      
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

      // Check for errors
      if (salesData.error) throw salesData.error;
      if (prizesData.error) throw prizesData.error;
      if (expensesData.error) throw expensesData.error;
      if (mobilePaymentsData.error) throw mobilePaymentsData.error;
      if (posData.error) throw posData.error;

      // DEBUG: Log the raw data to see what's happening
      console.log('=== DEBUG CUADRE GENERAL ===');
      console.log('Sessions:', sessions);
      console.log('Session IDs:', sessionIds);
      console.log('Sales data:', salesData.data);
      console.log('Prizes data:', prizesData.data);
      console.log('Expenses data:', expensesData.data);
      console.log('Mobile payments data:', mobilePaymentsData.data);
      console.log('POS data:', posData.data);

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
        closureConfirmed: sessionData ? sessionData.daily_closure_confirmed || false : false,
        closureNotes: sessionData ? sessionData.closure_notes || '' : '',
        sessionId: sessionData?.id,
      };
      
      setCuadre(finalCuadre);
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
          daily_closure_confirmed: cuadre.closureConfirmed,
          closure_notes: cuadre.closureNotes,
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

  // Bolivares Closure Formula
  const sumatoriaBolivares = 
    cuadre.cashAvailable + 
    totalBanco + 
    cuadre.totalDeudas.bs + 
    cuadre.totalGastos.bs + 
    cuadre.totalSales.usd * 36; // Assuming 36 Bs per USD conversion

  const diferenciaCierre = sumatoriaBolivares - cuadreVentasPremios.bs;
  const isCuadreBalanced = Math.abs(diferenciaCierre) < 1; // Allow 1 Bs difference

  const isSingleDay = dateRange && format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* Title and Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Cuadre General
        </h2>
        {cuadre.closureConfirmed && (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Cuadre Confirmado
          </Badge>
        )}
      </div>

      {/* Main Summary Cards - Bolivares vs Dollars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bolivares Section */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-primary">Resumen en Bolívares (VES)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ventas:</span>
                  <span className="font-medium text-success">
                    {formatCurrency(cuadre.totalSales.bs, 'VES')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Premios:</span>
                  <span className="font-medium text-destructive">
                    {formatCurrency(cuadre.totalPrizes.bs, 'VES')}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Cuadre (V-P):</span>
                  <span className={cuadreVentasPremios.bs >= 0 ? 'text-success' : 'text-destructive'}>
                    {formatCurrency(cuadreVentasPremios.bs, 'VES')}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Gastos:</span>
                  <span className="font-medium text-destructive">
                    {formatCurrency(cuadre.totalGastos.bs, 'VES')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Deudas:</span>
                  <span className="font-medium text-destructive">
                    {formatCurrency(cuadre.totalDeudas.bs, 'VES')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Banco:</span>
                  <span className="font-medium text-primary">
                    {formatCurrency(totalBanco, 'VES')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dollars Section */}
        <Card className="border-l-4 border-l-accent">
          <CardHeader>
            <CardTitle className="text-accent">Resumen en Dólares (USD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ventas USD:</span>
                <span className="font-medium text-success">
                  {formatCurrency(cuadre.totalSales.usd, 'USD')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Premios USD:</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(cuadre.totalPrizes.usd, 'USD')}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Cuadre USD:</span>
                <span className={cuadreVentasPremios.usd >= 0 ? 'text-success' : 'text-destructive'}>
                  {formatCurrency(cuadreVentasPremios.usd, 'USD')}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span>Gastos USD:</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(cuadre.totalGastos.usd, 'USD')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Deudas USD:</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(cuadre.totalDeudas.usd, 'USD')}
                </span>
              </div>
            </div>
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
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Fórmula de Cierre en Bolívares</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Sumatoria:</h4>
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
                    <span>USD → Bs (x36):</span>
                    <span className="font-medium">{formatCurrency(cuadre.totalSales.usd * 36, 'VES')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total Sumatoria:</span>
                    <span>{formatCurrency(sumatoriaBolivares, 'VES')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Comparación:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sumatoria:</span>
                    <span className="font-medium">{formatCurrency(sumatoriaBolivares, 'VES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cuadre (V-P):</span>
                    <span className="font-medium">{formatCurrency(cuadreVentasPremios.bs, 'VES')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Diferencia:</span>
                    <span className={`${isCuadreBalanced ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(diferenciaCierre, 'VES')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-center mt-2">
                    {isCuadreBalanced ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        ¡Cuadre Perfecto!
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
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

      {/* Daily Closure Section - Only for single day */}
      {isSingleDay && (
        <Card className="border-2 border-accent/20">
          <CardHeader>
            <CardTitle className="text-accent">Cierre Diario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cash-available">Efectivo disponible del día (Bs)</Label>
                <Input
                  id="cash-available"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cuadre.cashAvailable}
                  onChange={(e) => setCuadre(prev => ({ 
                    ...prev, 
                    cashAvailable: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              
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