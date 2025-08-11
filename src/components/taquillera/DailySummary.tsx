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
  totalMobilePayments: { bs: number; usd: number };
  transactionCount: number;
}

export const DailySummary = () => {
  const [summary, setSummary] = useState<SummaryData>({
    totalSales: { bs: 0, usd: 0 },
    totalPrizes: { bs: 0, usd: 0 },
    totalExpenses: { bs: 0, usd: 0 },
    totalMobilePayments: { bs: 0, usd: 0 },
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
        .select('amount_bs, amount_usd, mobile_payment_bs, mobile_payment_usd')
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

      // Calculate totals
      const totalSales = salesData?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      const totalMobilePayments = salesData?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.mobile_payment_bs || 0),
          usd: acc.usd + Number(item.mobile_payment_usd || 0),
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

      setSummary({
        totalSales,
        totalPrizes,
        totalExpenses,
        totalMobilePayments,
        transactionCount:
          (salesData?.length || 0) +
          (prizesData?.length || 0) +
          (expensesData?.length || 0),
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

  const netResult = {
    bs: summary.totalSales.bs - summary.totalPrizes.bs - summary.totalExpenses.bs,
    usd: summary.totalSales.usd - summary.totalPrizes.usd - summary.totalExpenses.usd,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalSales.bs, 'VES')}
              </p>
              <p className="text-lg text-muted-foreground">
                {formatCurrency(summary.totalSales.usd, 'USD')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Premios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(summary.totalPrizes.bs, 'VES')}
              </p>
              <p className="text-lg text-muted-foreground">
                {formatCurrency(summary.totalPrizes.usd, 'USD')}
              </p>
            </div>
          </CardContent>
        </Card>

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pago Móvil del Día
            <Badge variant="secondary">{summary.transactionCount} transacciones</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Pago Móvil Bs</p>
              <p className="text-xl font-semibold">
                {formatCurrency(summary.totalMobilePayments.bs, 'VES')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pago Móvil USD</p>
              <p className="text-xl font-semibold">
                {formatCurrency(summary.totalMobilePayments.usd, 'USD')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};