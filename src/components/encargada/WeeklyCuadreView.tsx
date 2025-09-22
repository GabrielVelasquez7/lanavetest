import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeeklyData {
  id: string;
  week_start_date: string;
  week_end_date: string;
  week_number: number;
  year: number;
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  total_balance_bs: number;
  total_balance_usd: number;
  total_sessions: number;
  is_closed: boolean;
  closure_notes: string;
}

interface DailyDetail {
  day_date: string;
  day_name: string;
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  balance_bs: number;
  balance_usd: number;
  sessions_count: number;
  is_completed: boolean;
}

export function WeeklyCuadreView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [dailyDetails, setDailyDetails] = useState<DailyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [closureNotes, setClosureNotes] = useState('');
  const [currentWeek, setCurrentWeek] = useState<{
    start: Date;
    end: Date;
    number: number;
    year: number;
  } | null>(null);

  useEffect(() => {
    if (user) {
      getCurrentWeekBoundaries();
    }
  }, [user]);

  useEffect(() => {
    if (currentWeek) {
      fetchWeeklyData();
    }
  }, [currentWeek]);

  const getCurrentWeekBoundaries = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_week_boundaries');
      if (error) throw error;
      
      if (data && data.length > 0) {
        const weekData = data[0];
        setCurrentWeek({
          start: new Date(weekData.week_start),
          end: new Date(weekData.week_end),
          number: weekData.week_number,
          year: weekData.year
        });
      }
    } catch (error: any) {
      console.error('Error getting week boundaries:', error);
      toast({
        title: "Error",
        description: "No se pudieron obtener los límites de la semana",
        variant: "destructive",
      });
    }
  };

  const fetchWeeklyData = async () => {
    if (!currentWeek) return;
    
    setLoading(true);
    try {
      // Get or create weekly summary
      let { data: weeklySum, error: weeklyError } = await supabase
        .from('weekly_cuadres_summary')
        .select('*')
        .eq('encargada_id', user?.id)
        .eq('week_start_date', format(currentWeek.start, 'yyyy-MM-dd'))
        .eq('week_end_date', format(currentWeek.end, 'yyyy-MM-dd'))
        .maybeSingle();

      if (weeklyError && weeklyError.code !== 'PGRST116') {
        throw weeklyError;
      }

      // If no weekly summary exists, create it
      if (!weeklySum) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('agency_id')
          .eq('user_id', user?.id)
          .single();

        const { data: newWeekly, error: createError } = await supabase
          .from('weekly_cuadres_summary')
          .insert({
            encargada_id: user?.id,
            agency_id: profile?.agency_id,
            week_start_date: format(currentWeek.start, 'yyyy-MM-dd'),
            week_end_date: format(currentWeek.end, 'yyyy-MM-dd'),
            week_number: currentWeek.number,
            year: currentWeek.year,
          })
          .select()
          .single();

        if (createError) throw createError;
        weeklySum = newWeekly;
      }

      setWeeklyData(weeklySum);
      setClosureNotes(weeklySum.closure_notes || '');

      // Get daily details
      const { data: details, error: detailsError } = await supabase
        .from('weekly_cuadres_details')
        .select('*')
        .eq('weekly_summary_id', weeklySum.id)
        .order('day_date');

      if (detailsError) throw detailsError;

      // If no details exist, create them for the week
      if (!details || details.length === 0) {
        await createWeeklyDetails(weeklySum.id);
      } else {
        setDailyDetails(details);
      }

      // Update weekly totals based on actual daily sessions
      await updateWeeklyTotals(weeklySum.id);

    } catch (error: any) {
      console.error('Error fetching weekly data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos semanales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWeeklyDetails = async (weeklySummaryId: string) => {
    if (!currentWeek) return;

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const details: any[] = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentWeek.start);
      dayDate.setDate(dayDate.getDate() + i);
      
      details.push({
        weekly_summary_id: weeklySummaryId,
        day_date: format(dayDate, 'yyyy-MM-dd'),
        day_name: dayNames[i],
      });
    }

    const { data, error } = await supabase
      .from('weekly_cuadres_details')
      .insert(details)
      .select();

    if (error) throw error;
    setDailyDetails(data);
  };

  const updateWeeklyTotals = async (weeklySummaryId: string) => {
    if (!currentWeek) return;

    // Get all daily cuadres for this week (from all taquilleras)
    const { data: dailyCuadres, error: cuadresError } = await supabase
      .from('daily_cuadres_summary')
      .select('*')
      .gte('session_date', format(currentWeek.start, 'yyyy-MM-dd'))
      .lte('session_date', format(currentWeek.end, 'yyyy-MM-dd'));

    if (cuadresError) throw cuadresError;

    // Calculate totals from daily cuadres
    let totalSalesBs = 0;
    let totalSalesUsd = 0;
    let totalPrizesBs = 0;
    let totalPrizesUsd = 0;

    const dailyTotals: { [key: string]: any } = {};

    dailyCuadres?.forEach(cuadre => {
      const dateKey = cuadre.session_date;
      
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = {
          sales_bs: 0,
          sales_usd: 0,
          prizes_bs: 0,
          prizes_usd: 0,
          sessions_count: 0
        };
      }

      dailyTotals[dateKey].sales_bs += Number(cuadre.total_sales_bs || 0);
      dailyTotals[dateKey].sales_usd += Number(cuadre.total_sales_usd || 0);
      dailyTotals[dateKey].prizes_bs += Number(cuadre.total_prizes_bs || 0);
      dailyTotals[dateKey].prizes_usd += Number(cuadre.total_prizes_usd || 0);
      dailyTotals[dateKey].sessions_count += 1;

      totalSalesBs += Number(cuadre.total_sales_bs || 0);
      totalSalesUsd += Number(cuadre.total_sales_usd || 0);
      totalPrizesBs += Number(cuadre.total_prizes_bs || 0);
      totalPrizesUsd += Number(cuadre.total_prizes_usd || 0);
    });

    // Update weekly summary
    await supabase
      .from('weekly_cuadres_summary')
      .update({
        total_sales_bs: totalSalesBs,
        total_sales_usd: totalSalesUsd,
        total_prizes_bs: totalPrizesBs,
        total_prizes_usd: totalPrizesUsd,
        total_balance_bs: totalSalesBs - totalPrizesBs,
        total_balance_usd: totalSalesUsd - totalPrizesUsd,
        total_sessions: dailyCuadres?.length || 0,
      })
      .eq('id', weeklySummaryId);

    // Update daily details
    for (const [dateKey, totals] of Object.entries(dailyTotals)) {
      await supabase
        .from('weekly_cuadres_details')
        .update({
          total_sales_bs: totals.sales_bs,
          total_sales_usd: totals.sales_usd,
          total_prizes_bs: totals.prizes_bs,
          total_prizes_usd: totals.prizes_usd,
          balance_bs: totals.sales_bs - totals.prizes_bs,
          balance_usd: totals.sales_usd - totals.prizes_usd,
          sessions_count: totals.sessions_count,
          is_completed: totals.sessions_count > 0,
        })
        .eq('weekly_summary_id', weeklySummaryId)
        .eq('day_date', dateKey);
    }

    // Refresh data
    await fetchWeeklyData();
  };

  const closeWeek = async () => {
    if (!weeklyData) return;

    try {
      const { error } = await supabase
        .from('weekly_cuadres_summary')
        .update({
          is_closed: true,
          closure_notes: closureNotes,
        })
        .eq('id', weeklyData.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Semana cerrada correctamente",
      });

      await fetchWeeklyData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la semana",
        variant: "destructive",
      });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (!currentWeek) return;

    const newStart = new Date(currentWeek.start);
    const newEnd = new Date(currentWeek.end);

    if (direction === 'prev') {
      newStart.setDate(newStart.getDate() - 7);
      newEnd.setDate(newEnd.getDate() - 7);
    } else {
      newStart.setDate(newStart.getDate() + 7);
      newEnd.setDate(newEnd.getDate() + 7);
    }

    // Calculate week number and year
    const tempDate = new Date(newStart);
    const week = Math.ceil(((tempDate.getTime() - new Date(tempDate.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(tempDate.getFullYear(), 0, 1).getDay() + 1) / 7);

    setCurrentWeek({
      start: newStart,
      end: newEnd,
      number: week,
      year: newStart.getFullYear()
    });
  };

  if (loading) {
    return <div className="p-6">Cargando cuadre semanal...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cuadre Semanal
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {currentWeek && format(currentWeek.start, 'dd MMM', { locale: es })} - {currentWeek && format(currentWeek.end, 'dd MMM yyyy', { locale: es })}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Weekly Summary */}
      {weeklyData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resumen Semanal</CardTitle>
              <Badge variant={weeklyData.is_closed ? "default" : "secondary"}>
                {weeklyData.is_closed ? "Cerrada" : "Activa"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Ventas Bs</p>
                <p className="text-2xl font-bold text-green-600">
                  {Number(weeklyData.total_sales_bs).toLocaleString('es-VE')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Ventas USD</p>
                <p className="text-2xl font-bold text-green-600">
                  ${Number(weeklyData.total_sales_usd).toLocaleString('es-VE')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Premios Bs</p>
                <p className="text-2xl font-bold text-red-600">
                  {Number(weeklyData.total_prizes_bs).toLocaleString('es-VE')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Premios USD</p>
                <p className="text-2xl font-bold text-red-600">
                  ${Number(weeklyData.total_prizes_usd).toLocaleString('es-VE')}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Balance Bs</p>
                <p className={`text-3xl font-bold ${Number(weeklyData.total_balance_bs) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(weeklyData.total_balance_bs).toLocaleString('es-VE')}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Balance USD</p>
                <p className={`text-3xl font-bold ${Number(weeklyData.total_balance_usd) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Number(weeklyData.total_balance_usd).toLocaleString('es-VE')}
                </p>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Total de Sesiones</p>
              <p className="text-xl font-semibold">{weeklyData.total_sessions}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose Diario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dailyDetails.map((day) => (
              <div key={day.day_date} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {day.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">{day.day_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(day.day_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    Ventas: {Number(day.total_sales_bs).toLocaleString('es-VE')} Bs | 
                    ${Number(day.total_sales_usd).toLocaleString('es-VE')}
                  </p>
                  <p className="text-sm">
                    Premios: {Number(day.total_prizes_bs).toLocaleString('es-VE')} Bs | 
                    ${Number(day.total_prizes_usd).toLocaleString('es-VE')}
                  </p>
                  <p className={`text-sm font-medium ${Number(day.balance_bs) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Balance: {Number(day.balance_bs).toLocaleString('es-VE')} Bs | 
                    ${Number(day.balance_usd).toLocaleString('es-VE')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {day.sessions_count} sesión(es)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Close Week Section */}
      {weeklyData && !weeklyData.is_closed && (
        <Card>
          <CardHeader>
            <CardTitle>Cerrar Semana</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Notas de cierre (opcional)"
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
            />
            <Button className="w-full" onClick={closeWeek}>
              Cerrar Semana
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}