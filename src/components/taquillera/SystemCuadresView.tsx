import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, subDays, addDays, isToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

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

type DateRange = {
  from: Date;
  to: Date;
};

export const SystemCuadresView = () => {
  const [systemCuadres, setSystemCuadres] = useState<SystemCuadre[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSystemCuadres();
    }
  }, [user, dateRange]);

  const fetchSystemCuadres = async () => {
    if (!user) return;

    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Get sessions in date range
      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('id, session_date')
        .eq('user_id', user.id)
        .gte('session_date', fromDate)
        .lte('session_date', toDate);

      if (!sessions || sessions.length === 0) {
        setSystemCuadres([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);

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

      // Get sales by system for all sessions in range
      const { data: salesData } = await supabase
        .from('sales_transactions')
        .select('lottery_system_id, amount_bs, amount_usd')
        .in('session_id', sessionIds);

      // Get prizes by system for all sessions in range
      const { data: prizesData } = await supabase
        .from('prize_transactions')
        .select('lottery_system_id, amount_bs, amount_usd')
        .in('session_id', sessionIds);

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

  const setToday = () => {
    const today = new Date();
    setDateRange({ from: today, to: today });
  };

  const setThisWeek = () => {
    const now = new Date();
    setDateRange({
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const days = direction === 'prev' ? -1 : 1;
    setDateRange({
      from: addDays(dateRange.from, days),
      to: addDays(dateRange.to, days),
    });
  };

  const isSingleDay = isSameDay(dateRange.from, dateRange.to);
  const isCurrentWeek = isSameDay(dateRange.from, startOfWeek(new Date(), { weekStartsOn: 1 })) &&
                        isSameDay(dateRange.to, endOfWeek(new Date(), { weekStartsOn: 1 }));

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
      {/* Date Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filtro de Fechas</span>
            <div className="flex gap-2">
              <Button
                variant={isToday(dateRange.from) && isSingleDay ? "default" : "outline"}
                size="sm"
                onClick={setToday}
              >
                Hoy
              </Button>
              <Button
                variant={isCurrentWeek && !isSingleDay ? "default" : "outline"}
                size="sm"
                onClick={setThisWeek}
              >
                Esta Semana
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSingleDay && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDay('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDay('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal min-w-[280px]",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isSingleDay
                      ? format(dateRange.from, "dd 'de' MMMM, yyyy", { locale: es })
                      : `${format(dateRange.from, "dd MMM", { locale: es })} - ${format(dateRange.to, "dd MMM yyyy", { locale: es })}`
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from) {
                        setDateRange({
                          from: range.from,
                          to: range.to || range.from,
                        });
                        if (range.to || !range.from) {
                          setIsCalendarOpen(false);
                        }
                      }
                    }}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Badge variant="secondary">
              {isSingleDay ? '1 día' : `${Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} días`}
            </Badge>
          </div>
        </CardContent>
      </Card>

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