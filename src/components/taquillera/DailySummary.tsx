import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Trophy, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DailySummaryData {
  totalSales: number;
  totalPrizes: number;
  totalExpenses: number;
  netAmount: number;
}

export const DailySummary = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DailySummaryData>({
    totalSales: 0,
    totalPrizes: 0,
    totalExpenses: 0,
    netAmount: 0,
  });

  useEffect(() => {
    if (user) {
      fetchDailySummary();
    }
  }, [user]);

  const fetchDailySummary = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    // Get today's sales
    const { data: salesData } = await supabase
      .from('sales_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    // Get today's prizes
    const { data: prizesData } = await supabase
      .from('prize_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    // Get today's expenses
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    const totalSales = salesData?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const totalPrizes = prizesData?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const totalExpenses = expensesData?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const netAmount = totalSales - totalPrizes - totalExpenses;

    setSummary({
      totalSales,
      totalPrizes,
      totalExpenses,
      netAmount,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalSales)}
          </div>
          <p className="text-xs text-muted-foreground">Total en ventas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Premios Pagados</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalPrizes)}
          </div>
          <p className="text-xs text-muted-foreground">Total en premios</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gastos</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <p className="text-xs text-muted-foreground">Total en gastos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.netAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.netAmount >= 0 ? 'Ganancia' : 'Pérdida'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};