import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Calculator, CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
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
  
  // Mobile payments separated
  pagoMovilRecibidos: number;
  pagoMovilPagados: number;
  
  // Point of sale
  totalPointOfSale: number;
}

export const CuadreGeneralEncargada = ({ selectedAgency, selectedDate, refreshKey = 0 }: CuadreGeneralEncargadaProps) => {
  const [cuadre, setCuadre] = useState<CuadreData>({
    totalSales: { bs: 0, usd: 0 },
    totalPrizes: { bs: 0, usd: 0 },
    totalGastos: { bs: 0, usd: 0 },
    totalDeudas: { bs: 0, usd: 0 },
    pagoMovilRecibidos: 0,
    pagoMovilPagados: 0,
    totalPointOfSale: 0,
  });
  
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

      console.log('🔍 CUADRE ENCARGADA DEBUG - Buscando:', { selectedAgency, dateStr });

      // Fetch all data in parallel for the specific agency and date
      const [
        salesData, 
        prizesData, 
        expensesData, 
        mobilePaymentsData, 
        posData
      ] = await Promise.all([
        // Sales from cuadres summary for this agency/date
        supabase
          .from('daily_cuadres_summary')
          .select('total_sales_bs, total_sales_usd')
          .eq('agency_id', selectedAgency)
          .eq('session_date', dateStr),
        // Prizes from cuadres summary for this agency/date
        supabase
          .from('daily_cuadres_summary')
          .select('total_prizes_bs, total_prizes_usd')
          .eq('agency_id', selectedAgency)
          .eq('session_date', dateStr),
        // Expenses directly from expenses table
        supabase
          .from('expenses')
          .select('amount_bs, amount_usd, category')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        // Mobile payments directly from mobile_payments table
        supabase
          .from('mobile_payments')
          .select('amount_bs')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        // Point of sale - we need to check if there's a POS entry for encargadas
        supabase
          .from('point_of_sale')
          .select('amount_bs')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr)
      ]);

      console.log('🔍 CUADRE ENCARGADA DEBUG - Resultado:', {
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

      // Calculate totals from cuadres summary
      const totalSales = salesData.data?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.total_sales_bs || 0),
          usd: acc.usd + Number(item.total_sales_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      const totalPrizes = prizesData.data?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.total_prizes_bs || 0),
          usd: acc.usd + Number(item.total_prizes_usd || 0),
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
      };
      
      setCuadre(finalCuadre);
    } catch (error) {
      console.error('Error fetching cuadre data:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los datos del cuadre',
        variant: 'destructive',
      });
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

  // Calculate balance
  const balanceTotal = cuadreVentasPremios.bs - cuadre.totalGastos.bs - cuadre.totalDeudas.bs + totalBanco;

  return (
    <div className="space-y-6">
      {/* Title and Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Resumen General</h3>
        <Badge variant="outline" className="text-sm">
          {format(selectedDate, 'dd/MM/yyyy')}
        </Badge>
      </div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
              Ventas Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(cuadre.totalSales.bs, 'VES')}
              </p>
              <p className="text-sm text-muted-foreground">
                ${cuadre.totalSales.usd.toFixed(2)} USD
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prizes Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
              Premios Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(cuadre.totalPrizes.bs, 'VES')}
              </p>
              <p className="text-sm text-muted-foreground">
                ${cuadre.totalPrizes.usd.toFixed(2)} USD
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cuadre Net */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Cuadre Neto (Ventas - Premios)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className={`text-lg font-bold ${cuadreVentasPremios.bs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cuadreVentasPremios.bs, 'VES')}
              </p>
              <p className="text-sm text-muted-foreground">
                ${cuadreVentasPremios.usd.toFixed(2)} USD
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Balance Final */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              {balanceTotal >= 0 ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 mr-2 text-red-600" />
              )}
              Balance Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-lg font-bold ${balanceTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balanceTotal, 'VES')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos y Deudas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Gastos Operativos:</span>
              <span className="font-medium">{formatCurrency(cuadre.totalGastos.bs, 'VES')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Deudas:</span>
              <span className="font-medium">{formatCurrency(cuadre.totalDeudas.bs, 'VES')}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center font-semibold">
              <span>Total Gastos:</span>
              <span className="text-red-600">
                {formatCurrency(cuadre.totalGastos.bs + cuadre.totalDeudas.bs, 'VES')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Bank & POS */}
        <Card>
          <CardHeader>
            <CardTitle>Banco y Punto de Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Pago Móvil Recibido:</span>
              <span className="font-medium text-green-600">{formatCurrency(cuadre.pagoMovilRecibidos, 'VES')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Pago Móvil Pagado:</span>
              <span className="font-medium text-red-600">{formatCurrency(cuadre.pagoMovilPagados, 'VES')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Punto de Venta:</span>
              <span className="font-medium text-blue-600">{formatCurrency(cuadre.totalPointOfSale, 'VES')}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center font-semibold">
              <span>Total Banco:</span>
              <span className={totalBanco >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(totalBanco, 'VES')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};