import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface CuadreByDay {
  session_date: string;
  user_name: string;
  agency_name: string | null;
  agency_id: string | null;
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

interface Agency {
  id: string;
  name: string;
}

export const AdminCuadresView = () => {
  const [dailyCuadres, setDailyCuadres] = useState<CuadreByDay[]>([]);
  const [allCuadres, setAllCuadres] = useState<CuadreByDay[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');

  useEffect(() => {
    fetchAdminCuadres();
  }, [selectedDate]);

  useEffect(() => {
    filterCuadresByAgency();
  }, [selectedAgency, allCuadres]);

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
        setAllCuadres([]);
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
          agencies!inner(id, name)
        `)
        .in('user_id', userIds);

      // Get all agencies for the dropdown
      const { data: agenciesData } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (agenciesData) {
        setAgencies(agenciesData);
      }

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
          agency_id: userProfile?.agency_id || null,
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

      setAllCuadres(cuadres);
    } catch (error) {
      console.error('Error fetching admin cuadres:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCuadresByAgency = () => {
    if (selectedAgency === 'all') {
      setDailyCuadres(allCuadres);
    } else {
      setDailyCuadres(allCuadres.filter(cuadre => cuadre.agency_id === selectedAgency));
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
      {/* Date and Agency Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Agencia</label>
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar agencia" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Todas las agencias</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
                        <h4 className="font-semibold text-lg"> {cuadre.agency_name || 'Sin agencia'}</h4>
                        <p className="text-sm text-muted-foreground">
                       {cuadre.user_name}  
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