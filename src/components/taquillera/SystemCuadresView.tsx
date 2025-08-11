import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';

interface SystemCuadre {
  system_id: string;
  system_name: string;
  sales_bs: number;
  sales_usd: number;
  prizes_bs: number;
  prizes_usd: number;
  cuadre_bs: number;
  cuadre_usd: number;
}

export const SystemCuadresView = () => {
  const [systemCuadres, setSystemCuadres] = useState<SystemCuadre[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSystemCuadres();
    }
  }, [user]);

  const fetchSystemCuadres = async () => {
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

      // Get all lottery systems
      const { data: systems } = await supabase
        .from('lottery_systems')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (!systems) {
        setLoading(false);
        return;
      }

      // Get sales by system
      const { data: salesData } = await supabase
        .from('sales_transactions')
        .select('lottery_system_id, amount_bs, amount_usd')
        .eq('session_id', session.id);

      // Get prizes by system
      const { data: prizesData } = await supabase
        .from('prize_transactions')
        .select('lottery_system_id, amount_bs, amount_usd')
        .eq('session_id', session.id);

      // Calculate cuadres by system
      const cuadres: SystemCuadre[] = systems.map(system => {
        const systemSales = salesData?.filter(s => s.lottery_system_id === system.id) || [];
        const systemPrizes = prizesData?.filter(p => p.lottery_system_id === system.id) || [];

        const sales_bs = systemSales.reduce((sum, s) => sum + Number(s.amount_bs || 0), 0);
        const sales_usd = systemSales.reduce((sum, s) => sum + Number(s.amount_usd || 0), 0);
        const prizes_bs = systemPrizes.reduce((sum, p) => sum + Number(p.amount_bs || 0), 0);
        const prizes_usd = systemPrizes.reduce((sum, p) => sum + Number(p.amount_usd || 0), 0);

        return {
          system_id: system.id,
          system_name: system.name,
          sales_bs,
          sales_usd,
          prizes_bs,
          prizes_usd,
          cuadre_bs: sales_bs - prizes_bs,
          cuadre_usd: sales_usd - prizes_usd,
        };
      });

      // Filter systems with any activity
      const activeSystems = cuadres.filter(
        c => c.sales_bs > 0 || c.sales_usd > 0 || c.prizes_bs > 0 || c.prizes_usd > 0
      );

      setSystemCuadres(activeSystems);
    } catch (error) {
      console.error('Error fetching system cuadres:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Cargando cuadres por sistema...</div>;
  }

  if (systemCuadres.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No hay transacciones registradas para hoy
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCuadre = systemCuadres.reduce(
    (acc, system) => ({
      bs: acc.bs + system.cuadre_bs,
      usd: acc.usd + system.cuadre_usd,
    }),
    { bs: 0, usd: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary flex items-center justify-between">
            Cuadre Total por Sistemas
            <Badge variant="secondary">{systemCuadres.length} sistemas activos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Cuadre Total Bs</p>
              <p className={`text-3xl font-bold ${totalCuadre.bs >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totalCuadre.bs, 'VES')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cuadre Total USD</p>
              <p className={`text-3xl font-bold ${totalCuadre.usd >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totalCuadre.usd, 'USD')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Systems Grid */}
      <div className="grid gap-4">
        {systemCuadres.map((system) => (
          <Card key={system.system_id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{system.system_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Ventas Bs</p>
                  <p className="text-lg font-semibold text-success">
                    {formatCurrency(system.sales_bs, 'VES')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ventas USD</p>
                  <p className="text-lg font-semibold text-success">
                    {formatCurrency(system.sales_usd, 'USD')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Premios Bs</p>
                  <p className="text-lg font-semibold text-destructive">
                    {formatCurrency(system.prizes_bs, 'VES')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Premios USD</p>
                  <p className="text-lg font-semibold text-destructive">
                    {formatCurrency(system.prizes_usd, 'USD')}
                  </p>
                </div>
                <div className="border-l-2 border-primary/20">
                  <p className="text-xs text-muted-foreground">Cuadre Bs</p>
                  <p className={`text-xl font-bold ${system.cuadre_bs >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(system.cuadre_bs, 'VES')}
                  </p>
                </div>
                <div className="border-l-2 border-primary/20">
                  <p className="text-xs text-muted-foreground">Cuadre USD</p>
                  <p className={`text-xl font-bold ${system.cuadre_usd >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(system.cuadre_usd, 'USD')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};