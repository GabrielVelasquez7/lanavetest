import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';

interface SummaryData {
  totalSales: { bs: number; usd: number };
  totalPrizes: { bs: number; usd: number };
  totalExpenses: { bs: number; usd: number };
  totalMobilePayments: number;
  totalPointOfSale: number;
  transactionCount: number;
}

export const DailySummary = () => {
  const [summary, setSummary] = useState<SummaryData>({
    totalSales: { bs: 0, usd: 0 },
    totalPrizes: { bs: 0, usd: 0 },
    totalExpenses: { bs: 0, usd: 0 },
    totalMobilePayments: 0,
    totalPointOfSale: 0,
    transactionCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDailySummary();
    }
  }, [user]);

  const fetchDailySummary = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get today's session
      const { data: session } = await supabase
        .from('daily_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .single();

      if (!session) {
        setLoading(false);
        return;
      }

      // Get sales summary
      const { data: salesData } = await supabase
        .from('sales_transactions')
        .select('amount_bs, amount_usd')
        .eq('session_id', session.id);

      // Get prizes summary
      const { data: prizesData } = await supabase
        .from('prize_transactions')
        .select('amount_bs, amount_usd')
        .eq('session_id', session.id);

      // Get expenses summary
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount_bs, amount_usd')
        .eq('session_id', session.id);

      // Get mobile payments summary
      const { data: mobilePaymentsData } = await supabase
        .from('mobile_payments')
        .select('amount_bs')
        .eq('session_id', session.id);

      // Get point of sale data
      const { data: posData } = await supabase
        .from('point_of_sale')
        .select('amount_bs')
        .eq('session_id', session.id)
        .single();

      // Calculate totals
      const totalSales = salesData?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      const totalPrizes = prizesData?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      const totalExpenses = expensesData?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      const totalMobilePayments = mobilePaymentsData?.reduce(
        (sum, item) => sum + Number(item.amount_bs || 0),
        0
      ) || 0;

      const totalPointOfSale = Number(posData?.amount_bs || 0);

      setSummary({
        totalSales,
        totalPrizes,
        totalExpenses,
        totalMobilePayments,
        totalPointOfSale,
        transactionCount:
          (salesData?.length || 0) +
          (prizesData?.length || 0) +
          (expensesData?.length || 0) +
          (mobilePaymentsData?.length || 0) +
          (posData ? 1 : 0),
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Cargando resumen...</div>;
  }

  const cuadreResult = {
    bs: summary.totalSales.bs - summary.totalPrizes.bs,
    usd: summary.totalSales.usd - summary.totalPrizes.usd,
  };

  const netResult = {
    bs: cuadreResult.bs - summary.totalExpenses.bs,
    usd: cuadreResult.usd - summary.totalExpenses.usd,
  };

  return (
    <div className="space-y-6">
      {/* Cuadre Principal: Ventas vs Premios */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Cuadre Principal (Ventas - Premios)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Ventas</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(summary.totalSales.bs, 'VES')}
              </p>
              <p className="text-lg text-muted-foreground">
                {formatCurrency(summary.totalSales.usd, 'USD')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Premios</p>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(summary.totalPrizes.bs, 'VES')}
              </p>
              <p className="text-lg text-muted-foreground">
                {formatCurrency(summary.totalPrizes.usd, 'USD')}
              </p>
            </div>
            <div className="text-center border-l-2 border-primary">
              <p className="text-sm text-muted-foreground">Cuadre</p>
              <p className={`text-3xl font-bold ${cuadreResult.bs >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(cuadreResult.bs, 'VES')}
              </p>
              <p className={`text-xl ${cuadreResult.usd >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(cuadreResult.usd, 'USD')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Completo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(summary.totalExpenses.bs, 'VES')}
              </p>
              <p className="text-lg text-muted-foreground">
                {formatCurrency(summary.totalExpenses.usd, 'USD')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Resultado Neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${netResult.bs >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(netResult.bs, 'VES')}
              </p>
              <p className={`text-lg ${netResult.usd >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(netResult.usd, 'USD')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Pago Móvil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(summary.totalMobilePayments, 'VES')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Punto de Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(summary.totalPointOfSale, 'VES')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Resumen del Día
            <Badge variant="secondary">{summary.transactionCount} transacciones</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Total de efectivo recibido (Ventas + Pago Móvil + POS)
            </p>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(
                summary.totalSales.bs + summary.totalMobilePayments + summary.totalPointOfSale,
                'VES'
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};