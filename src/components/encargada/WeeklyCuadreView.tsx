import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Building2, DollarSign, RefreshCcw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgencyWeeklySummary {
  agency_id: string;
  agency_name: string;
  
  // Ventas y Premios
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  
  // Deudas y Gastos
  total_deudas_bs: number;
  total_deudas_usd: number;
  total_gastos_bs: number;
  total_gastos_usd: number;
  
  // Premios por pagar
  premios_por_pagar: number;
  
  // Total en banco
  total_banco_bs: number;
  
  // Tasa de cambio (domingo)
  exchange_rate: number;
  
  // Balance final
  diferencia_final: number;
  excess_usd: number;
}

interface WeekBoundaries {
  start: Date;
  end: Date;
  number: number;
  year: number;
}

export function WeeklyCuadreView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agenciesSummary, setAgenciesSummary] = useState<AgencyWeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<WeekBoundaries | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');

  useEffect(() => {
    if (user) {
      getCurrentWeekBoundaries();
    }
  }, [user]);

  useEffect(() => {
    if (currentWeek && user) {
      fetchWeeklySummary();
    }
  }, [currentWeek, user]);

  // Re-fetch on window focus to avoid stale data
  useEffect(() => {
    const onFocus = () => {
      if (currentWeek && user) fetchWeeklySummary();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [currentWeek, user]);

  const getCurrentWeekBoundaries = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_week_boundaries');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const weekData = data[0];
        setCurrentWeek({
          start: new Date(weekData.week_start + 'T00:00:00'),
          end: new Date(weekData.week_end + 'T23:59:59'),
          number: weekData.week_number,
          year: weekData.year,
        });
      } else {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        
        setCurrentWeek({
          start: weekStart,
          end: weekEnd,
          number: parseInt(format(weekStart, 'w')),
          year: parseInt(format(weekStart, 'yyyy')),
        });
      }
    } catch (error: any) {
      console.error('Error getting week boundaries:', error);
      toast({
        title: "Error",
        description: "No se pudieron obtener las fechas de la semana",
        variant: "destructive",
      });
    }
  };

  const fetchWeeklySummary = async () => {
    if (!currentWeek) return;
    
    setLoading(true);
    try {
      const startStr = format(currentWeek.start, 'yyyy-MM-dd');
      const endStr = format(currentWeek.end, 'yyyy-MM-dd');

      // Get all agencies
      const { data: agencies, error: agenciesError } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (agenciesError) throw agenciesError;

      // Get sales and prizes from encargada_cuadre_details
      const { data: cuadreDetails, error: cuadreError } = await supabase
        .from('encargada_cuadre_details')
        .select('agency_id, sales_bs, sales_usd, prizes_bs, prizes_usd')
        .gte('session_date', startStr)
        .lte('session_date', endStr);

      if (cuadreError) throw cuadreError;

      // Get encargada summary data (cash, banco, pending prizes, etc.)
      const { data: summaryData, error: summaryError } = await supabase
        .from('daily_cuadres_summary')
        .select(`
          agency_id, 
          session_date,
          total_banco_bs,
          pending_prizes,
          exchange_rate,
          diferencia_final,
          excess_usd,
          created_at,
          updated_at
        `)
        .is('session_id', null)
        .gte('session_date', startStr)
        .lte('session_date', endStr);

      if (summaryError) throw summaryError;

      // Get expenses (deudas and gastos) from both encargada and taquilleras
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          amount_bs,
          amount_usd,
          category,
          session_id,
          agency_id,
          transaction_date
        `)
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr);

      if (expensesError) throw expensesError;

      // Get taquillera sessions to map session_id -> agency_id
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select('id, user_id')
        .gte('session_date', startStr)
        .lte('session_date', endStr);

      if (sessionsError) throw sessionsError;

      // Get profiles to map user_id -> agency_id
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, agency_id');

      if (profilesError) throw profilesError;

      // Build session -> agency mapping
      const sessionToAgency = new Map<string, string>();
      sessions?.forEach(session => {
        const profile = profiles?.find(p => p.user_id === session.user_id);
        if (profile?.agency_id) {
          sessionToAgency.set(session.id, profile.agency_id);
        }
      });

      // Build agency summaries
      const agencySummaries: AgencyWeeklySummary[] = (agencies || []).map(agency => {
        // Sales and prizes
        const agencyCuadres = cuadreDetails?.filter(c => c.agency_id === agency.id) || [];
        const total_sales_bs = agencyCuadres.reduce((sum, c) => sum + Number(c.sales_bs || 0), 0);
        const total_sales_usd = agencyCuadres.reduce((sum, c) => sum + Number(c.sales_usd || 0), 0);
        const total_prizes_bs = agencyCuadres.reduce((sum, c) => sum + Number(c.prizes_bs || 0), 0);
        const total_prizes_usd = agencyCuadres.reduce((sum, c) => sum + Number(c.prizes_usd || 0), 0);

        // Expenses for this agency (both from encargada and taquilleras)
        const agencyExpenses = expenses?.filter(e => {
          if (e.agency_id === agency.id) return true;
          if (e.session_id && sessionToAgency.get(e.session_id) === agency.id) return true;
          return false;
        }) || [];

        const deudas = agencyExpenses.filter(e => e.category === 'deuda');
        const gastos = agencyExpenses.filter(e => e.category === 'gasto_operativo');

        const total_deudas_bs = deudas.reduce((sum, d) => sum + Number(d.amount_bs || 0), 0);
        const total_deudas_usd = deudas.reduce((sum, d) => sum + Number(d.amount_usd || 0), 0);
        const total_gastos_bs = gastos.reduce((sum, g) => sum + Number(g.amount_bs || 0), 0);
        const total_gastos_usd = gastos.reduce((sum, g) => sum + Number(g.amount_usd || 0), 0);

        // Get latest summary data for this agency (deduplicated by date)
        const agencySummaries = summaryData?.filter(s => s.agency_id === agency.id) || [];
        
        // Deduplicate by date, keeping the most recent record
        const latestByDate = new Map<string, any>();
        agencySummaries.forEach(s => {
          const existing = latestByDate.get(s.session_date);
          const existingTime = existing?.updated_at || existing?.created_at;
          const newTime = s.updated_at || s.created_at;
          
          if (!existing || (newTime && existingTime && new Date(newTime) > new Date(existingTime))) {
            latestByDate.set(s.session_date, s);
          }
        });

        const uniqueSummaries = Array.from(latestByDate.values());

        const total_banco_bs = uniqueSummaries.reduce((sum, s) => sum + Number(s.total_banco_bs || 0), 0);
        const premios_por_pagar = uniqueSummaries.reduce((sum, s) => sum + Number(s.pending_prizes || 0), 0);
        const diferencia_final = uniqueSummaries.reduce((sum, s) => sum + Number(s.diferencia_final || 0), 0);
        const excess_usd = uniqueSummaries.reduce((sum, s) => sum + Number(s.excess_usd || 0), 0);

        // Get Sunday's exchange rate (last day of week)
        const sundaySummary = uniqueSummaries.find(s => s.session_date === endStr);
        const exchange_rate = sundaySummary?.exchange_rate || 36;

        return {
          agency_id: agency.id,
          agency_name: agency.name,
          total_sales_bs,
          total_sales_usd,
          total_prizes_bs,
          total_prizes_usd,
          total_deudas_bs,
          total_deudas_usd,
          total_gastos_bs,
          total_gastos_usd,
          premios_por_pagar,
          total_banco_bs,
          exchange_rate,
          diferencia_final,
          excess_usd,
        };
      });

      setAgenciesSummary(agencySummaries);
    } catch (error: any) {
      console.error('Error fetching weekly summary:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el resumen semanal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (!currentWeek) return;
    
    const newStart = direction === 'prev' 
      ? subWeeks(currentWeek.start, 1)
      : addWeeks(currentWeek.start, 1);
    
    const newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
    
    setCurrentWeek({
      start: newStart,
      end: newEnd,
      number: parseInt(format(newStart, 'w')),
      year: parseInt(format(newStart, 'yyyy')),
    });
  };

  const filteredAgencies = selectedAgency === 'all' 
    ? agenciesSummary 
    : agenciesSummary.filter(a => a.agency_id === selectedAgency);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando datos semanales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with week navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Cuadre Semanal</h2>
            {currentWeek && (
              <p className="text-sm text-muted-foreground">
                Semana {currentWeek.number} - {format(currentWeek.start, "d 'de' MMMM", { locale: es })} al {format(currentWeek.end, "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchWeeklySummary}
            title="Refrescar datos"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Agency filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Filtrar por Agencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Seleccionar agencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las agencias</SelectItem>
              {agenciesSummary.map(agency => (
                <SelectItem key={agency.agency_id} value={agency.agency_id}>
                  {agency.agency_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Agency summaries */}
      <div className="space-y-4">
        {filteredAgencies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay datos para esta semana</p>
            </CardContent>
          </Card>
        ) : (
          filteredAgencies.map(agency => {
            const hasData = agency.total_sales_bs > 0 || agency.total_sales_usd > 0 || 
                           agency.total_prizes_bs > 0 || agency.total_prizes_usd > 0;
            
            return (
              <Card key={agency.agency_id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {agency.agency_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tasa de cambio (Domingo): {formatCurrency(agency.exchange_rate, 'VES')}
                      </p>
                    </div>
                    {!hasData && (
                      <Badge variant="secondary">Sin datos</Badge>
                    )}
                  </div>
                </CardHeader>
                
                {hasData && (
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Ventas */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Ventas Totales</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Bolívares:</span>
                            <span className="font-mono font-semibold">{formatCurrency(agency.total_sales_bs, 'VES')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Dólares:</span>
                            <span className="font-mono font-semibold">{formatCurrency(agency.total_sales_usd, 'USD')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Premios */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Premios Totales</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Bolívares:</span>
                            <span className="font-mono font-semibold">{formatCurrency(agency.total_prizes_bs, 'VES')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Dólares:</span>
                            <span className="font-mono font-semibold">{formatCurrency(agency.total_prizes_usd, 'USD')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deudas - DESTACADO */}
                      <div className="space-y-2 p-4 bg-destructive/5 rounded-lg border-2 border-destructive/20">
                        <h4 className="font-semibold text-sm text-destructive uppercase tracking-wider flex items-center gap-1">
                          <TrendingDown className="h-4 w-4" />
                          Deudas Totales
                        </h4>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Bolívares:</span>
                            <span className="font-mono font-bold text-destructive">{formatCurrency(agency.total_deudas_bs, 'VES')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Dólares:</span>
                            <span className="font-mono font-bold text-destructive">{formatCurrency(agency.total_deudas_usd, 'USD')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Gastos - DESTACADO */}
                      <div className="space-y-2 p-4 bg-orange-500/5 rounded-lg border-2 border-orange-500/20">
                        <h4 className="font-semibold text-sm text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
                          <TrendingDown className="h-4 w-4" />
                          Gastos Totales
                        </h4>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Bolívares:</span>
                            <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{formatCurrency(agency.total_gastos_bs, 'VES')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Dólares:</span>
                            <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{formatCurrency(agency.total_gastos_usd, 'USD')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Total en Banco - DESTACADO */}
                      <div className="space-y-2 p-4 bg-blue-500/5 rounded-lg border-2 border-blue-500/20">
                        <h4 className="font-semibold text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Total en Banco
                        </h4>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Bolívares:</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-lg">{formatCurrency(agency.total_banco_bs, 'VES')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Premios por Pagar */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Premios por Pagar</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Bolívares:</span>
                            <span className="font-mono font-semibold">{formatCurrency(agency.premios_por_pagar, 'VES')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Balance Final */}
                      <div className="space-y-2 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20 md:col-span-2 lg:col-span-3">
                        <h4 className="font-semibold text-sm text-primary uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          Balance Final de la Semana
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Diferencia Bolívares:</span>
                            <span className={`font-mono font-bold text-lg ${agency.diferencia_final >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(agency.diferencia_final, 'VES')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Excedente Dólares:</span>
                            <span className={`font-mono font-bold text-lg ${agency.excess_usd >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(agency.excess_usd, 'USD')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
