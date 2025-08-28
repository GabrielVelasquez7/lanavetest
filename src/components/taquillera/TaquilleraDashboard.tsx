import { useState } from 'react';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, Gift, LogOut, Receipt, Smartphone, CreditCard, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { GastosManager } from './GastosManager';
import { DailySummary } from './DailySummary';
import { PagoMovilManager } from './PagoMovilManager';
import { PointOfSaleForm } from './PointOfSaleForm';
import { SystemCuadresView } from './SystemCuadresView';
import { VentasPremiosManager } from './VentasPremiosManager';
import { CuadreGeneral } from './CuadreGeneral';
import { format, startOfWeek, endOfWeek, addDays, isToday, isSameDay, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type DateRange = {
  from: Date;
  to: Date;
};

export const TaquilleraDashboard = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('transacciones');
  const { refreshKey, triggerRefresh } = useDataRefresh();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
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
    const newFromDate = addDays(dateRange.from, days);
    const newToDate = addDays(dateRange.to, days);
    
    // Evitar navegar a fechas futuras
    if (direction === 'next' && newToDate > new Date()) {
      toast({
        title: 'Fecha no válida',
        description: 'No puedes seleccionar fechas futuras',
        variant: 'destructive',
      });
      return;
    }
    
    setDateRange({
      from: newFromDate,
      to: newToDate,
    });
  };

  const validateDateRange = (range: DateRange | undefined): boolean => {
    if (!range?.from || !range?.to) return false;
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fin del día actual
    
    // Verificar que no se seleccionen fechas futuras
    if (range.from > today || range.to > today) {
      toast({
        title: 'Fecha no válida',
        description: 'No puedes seleccionar fechas futuras',
        variant: 'destructive',
      });
      return false;
    }
    
    const daysDiff = differenceInDays(range.to, range.from);
    const maxDays = 9; // 1 semana + 2 días extra
    
    if (daysDiff > maxDays) {
      toast({
        title: 'Rango muy amplio',
        description: `El rango máximo permitido es de ${maxDays + 1} días (1 semana + 2 días extra)`,
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };

  const isSingleDay = isSameDay(dateRange.from, dateRange.to);
  const isCurrentWeek = isSameDay(dateRange.from, startOfWeek(new Date(), { weekStartsOn: 1 })) &&
                        isSameDay(dateRange.to, endOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">Sistema de Cuadres</h1>
            <p className="text-primary-foreground/80">
              Bienvenida, {profile?.full_name} - {profile?.role}
            </p>
          </div>
          <Button variant="secondary" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {/* Global Date Filter */}
        <Card className="mb-6">
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
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        return date > today;
                      }}
                      onSelect={(range) => {
                        if (range?.from) {
                          const newRange = {
                            from: range.from,
                            to: range.to || range.from,
                          };
                          
                          if (validateDateRange(newRange)) {
                            setDateRange(newRange);
                            if (range.to || !range.from) {
                              setIsCalendarOpen(false);
                            }
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="transacciones" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ventas/Premios
            </TabsTrigger>
            <TabsTrigger value="gastos" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Gastos
            </TabsTrigger>
            <TabsTrigger value="pago-movil" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Pago Móvil
            </TabsTrigger>
            <TabsTrigger value="punto-venta" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Punto Venta
            </TabsTrigger>
            <TabsTrigger value="cuadre-sistemas" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Por Sistema
            </TabsTrigger>
            <TabsTrigger value="cuadre-general" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Cuadre General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transacciones" className="space-y-6">
            <VentasPremiosManager onSuccess={triggerRefresh} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="gastos" className="space-y-6">
            <GastosManager onSuccess={triggerRefresh} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="pago-movil" className="space-y-6">
            <PagoMovilManager onSuccess={triggerRefresh} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="punto-venta" className="space-y-6">
            <PointOfSaleForm dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="cuadre-sistemas" className="space-y-6">
            <SystemCuadresView dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="cuadre-general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cuadre General</CardTitle>
                <CardDescription>
                  Cuadre total y resumen financiero del período seleccionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CuadreGeneral refreshKey={refreshKey} dateRange={dateRange} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};