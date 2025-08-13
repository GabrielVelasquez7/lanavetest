import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface CuadreByDay {
  session_date: string;
  user_name: string;
  agency_name: string | null;
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  cuadre_bs: number;
  cuadre_usd: number;
  expenses_bs: number;
  expenses_usd: number;
  mobile_payments_bs: number;
  pos_bs: number;
}

interface SystemTotals {
  system_name: string;
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  cuadre_bs: number;
  cuadre_usd: number;
}

export const AdminCuadresView = () => {
  const [dailyCuadres, setDailyCuadres] = useState<CuadreByDay[]>([]);
  const [systemTotals, setSystemTotals] = useState<SystemTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAdminCuadres();
  }, [selectedDate]);

  const fetchAdminCuadres = async () => {
    try {
      setLoading(true);

      // Get sessions for the selected date (both open and closed sessions)
      const { data: sessionsData } = await supabase
        .from('daily_sessions')
        .select('id, session_date, user_id, is_closed')
        .eq('session_date', selectedDate);

      if (!sessionsData || sessionsData.length === 0) {
        setDailyCuadres([]);
        setSystemTotals([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessionsData.map(s => s.id);
      const userIds = [...new Set(sessionsData.map(s => s.user_id))];

      // Get user profiles with agency information
      const { data: profilesData } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          agency_id,
          agencies!inner(name)
        `)
        .in('user_id', userIds);

      // Get all transactions for these sessions
      const [salesResult, prizesResult, expensesResult, mobileResult, posResult] = await Promise.all([
        supabase
          .from('sales_transactions')
          .select('session_id, amount_bs, amount_usd, lottery_system_id')
          .in('session_id', sessionIds),
        
        supabase
          .from('prize_transactions')
          .select('session_id, amount_bs, amount_usd, lottery_system_id')
          .in('session_id', sessionIds),
          
        supabase
          .from('expenses')
          .select('session_id, amount_bs, amount_usd')
          .in('session_id', sessionIds),
          
        supabase
          .from('mobile_payments')
          .select('session_id, amount_bs')
          .in('session_id', sessionIds),
          
        supabase
          .from('point_of_sale')
          .select('session_id, amount_bs')
          .in('session_id', sessionIds)
      ]);

      // Get lottery systems for system totals
      const { data: systemsData } = await supabase
        .from('lottery_systems')
        .select('id, name')
        .eq('is_active', true);

      // Calculate cuadres by session
      const cuadres: CuadreByDay[] = sessionsData.map(session => {
        const userProfile = profilesData?.find(p => p.user_id === session.user_id);
        const sessionSales = salesResult.data?.filter(s => s.session_id === session.id) || [];
        const sessionPrizes = prizesResult.data?.filter(p => p.session_id === session.id) || [];
        const sessionExpenses = expensesResult.data?.filter(e => e.session_id === session.id) || [];
        const sessionMobile = mobileResult.data?.filter(m => m.session_id === session.id) || [];
        const sessionPos = posResult.data?.filter(p => p.session_id === session.id) || [];

        const total_sales_bs = sessionSales.reduce((sum, s) => sum + Number(s.amount_bs || 0), 0);
        const total_sales_usd = sessionSales.reduce((sum, s) => sum + Number(s.amount_usd || 0), 0);
        const total_prizes_bs = sessionPrizes.reduce((sum, p) => sum + Number(p.amount_bs || 0), 0);
        const total_prizes_usd = sessionPrizes.reduce((sum, p) => sum + Number(p.amount_usd || 0), 0);
        const expenses_bs = sessionExpenses.reduce((sum, e) => sum + Number(e.amount_bs || 0), 0);
        const expenses_usd = sessionExpenses.reduce((sum, e) => sum + Number(e.amount_usd || 0), 0);
        const mobile_payments_bs = sessionMobile.reduce((sum, m) => sum + Number(m.amount_bs || 0), 0);
        const pos_bs = sessionPos.reduce((sum, p) => sum + Number(p.amount_bs || 0), 0);

        return {
          session_date: session.session_date,
          user_name: userProfile?.full_name || 'Usuario desconocido',
          agency_name: userProfile?.agencies?.name || null,
          total_sales_bs,
          total_sales_usd,
          total_prizes_bs,
          total_prizes_usd,
          cuadre_bs: total_sales_bs - total_prizes_bs,
          cuadre_usd: total_sales_usd - total_prizes_usd,
          expenses_bs,
          expenses_usd,
          mobile_payments_bs,
          pos_bs,
        };
      });

      // Calculate system totals
      const totals: SystemTotals[] = systemsData?.map(system => {
        const systemSales = salesResult.data?.filter(s => s.lottery_system_id === system.id) || [];
        const systemPrizes = prizesResult.data?.filter(p => p.lottery_system_id === system.id) || [];

        const total_sales_bs = systemSales.reduce((sum, s) => sum + Number(s.amount_bs || 0), 0);
        const total_sales_usd = systemSales.reduce((sum, s) => sum + Number(s.amount_usd || 0), 0);
        const total_prizes_bs = systemPrizes.reduce((sum, p) => sum + Number(p.amount_bs || 0), 0);
        const total_prizes_usd = systemPrizes.reduce((sum, p) => sum + Number(p.amount_usd || 0), 0);

        return {
          system_name: system.name,
          total_sales_bs,
          total_sales_usd,
          total_prizes_bs,
          total_prizes_usd,
          cuadre_bs: total_sales_bs - total_prizes_bs,
          cuadre_usd: total_sales_usd - total_prizes_usd,
        };
      }).filter(system => system.total_sales_bs > 0 || system.total_sales_usd > 0) || [];

      setDailyCuadres(cuadres);
      setSystemTotals(totals);
    } catch (error) {
      console.error('Error fetching admin cuadres:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Cargando cuadres...</div>;
  }

  const grandTotal = dailyCuadres.reduce(
    (acc, cuadre) => ({
      sales_bs: acc.sales_bs + cuadre.total_sales_bs,
      sales_usd: acc.sales_usd + cuadre.total_sales_usd,
      prizes_bs: acc.prizes_bs + cuadre.total_prizes_bs,
      prizes_usd: acc.prizes_usd + cuadre.total_prizes_usd,
      cuadre_bs: acc.cuadre_bs + cuadre.cuadre_bs,
      cuadre_usd: acc.cuadre_usd + cuadre.cuadre_usd,
    }),
    { sales_bs: 0, sales_usd: 0, prizes_bs: 0, prizes_usd: 0, cuadre_bs: 0, cuadre_usd: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Seleccionar Fecha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary flex items-center justify-between">
            Cuadre Total del Día
            <Badge variant="secondary">{dailyCuadres.length} sesiones</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Ventas Bs</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(grandTotal.sales_bs, 'VES')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ventas USD</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(grandTotal.sales_usd, 'USD')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cuadre Bs</p>
              <p className={`text-2xl font-bold ${grandTotal.cuadre_bs >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(grandTotal.cuadre_bs, 'VES')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cuadre USD</p>
              <p className={`text-2xl font-bold ${grandTotal.cuadre_usd >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(grandTotal.cuadre_usd, 'USD')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Totals */}
      {systemTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cuadres por Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {systemTotals.map((system, index) => (
                <div key={index} className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center p-4 bg-muted/50 rounded-lg">
                  <div className="md:col-span-6 font-semibold text-left mb-2 md:mb-0">
                    {system.system_name}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ventas Bs</p>
                    <p className="font-semibold text-success">
                      {formatCurrency(system.total_sales_bs, 'VES')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ventas USD</p>
                    <p className="font-semibold text-success">
                      {formatCurrency(system.total_sales_usd, 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Premios Bs</p>
                    <p className="font-semibold text-destructive">
                      {formatCurrency(system.total_prizes_bs, 'VES')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Premios USD</p>
                    <p className="font-semibold text-destructive">
                      {formatCurrency(system.total_prizes_usd, 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cuadre Bs</p>
                    <p className={`font-bold ${system.cuadre_bs >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(system.cuadre_bs, 'VES')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cuadre USD</p>
                    <p className={`font-bold ${system.cuadre_usd >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(system.cuadre_usd, 'USD')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cuadres por Agencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyCuadres.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay sesiones registradas para la fecha seleccionada
            </p>
          ) : (
            <div className="space-y-4">
              {dailyCuadres.map((cuadre, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="font-semibold">{cuadre.user_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {cuadre.agency_name || 'Sin agencia'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Ventas Bs</p>
                        <p className="font-semibold text-success">
                          {formatCurrency(cuadre.total_sales_bs, 'VES')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ventas USD</p>
                        <p className="font-semibold text-success">
                          {formatCurrency(cuadre.total_sales_usd, 'USD')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cuadre Bs</p>
                        <p className={`font-bold ${cuadre.cuadre_bs >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(cuadre.cuadre_bs, 'VES')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cuadre USD</p>
                        <p className={`font-bold ${cuadre.cuadre_usd >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(cuadre.cuadre_usd, 'USD')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};