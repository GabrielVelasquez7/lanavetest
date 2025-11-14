import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BanqueoSalesBolivares } from './BanqueoSalesBolivares';
import { BanqueoSalesDolares } from './BanqueoSalesDolares';
import { BanqueoPrizesBolivares } from './BanqueoPrizesBolivares';
import { BanqueoPrizesDolares } from './BanqueoPrizesDolares';
import { Building2, CalendarIcon, DollarSign, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatDateForDB } from '@/lib/dateUtils';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

const systemEntrySchema = z.object({
  lottery_system_id: z.string(),
  lottery_system_name: z.string(),
  sales_bs: z.number().min(0),
  sales_usd: z.number().min(0),
  prizes_bs: z.number().min(0),
  prizes_usd: z.number().min(0),
});

const banqueoSchema = z.object({
  systems: z.array(systemEntrySchema),
});

export type BanqueoForm = z.infer<typeof banqueoSchema>;
export type SystemEntry = z.infer<typeof systemEntrySchema>;

interface LotterySystem {
  id: string;
  name: string;
  code: string;
}

interface Client {
  id: string;
  name: string;
}

export const BanqueoManager = () => {
  const [mainTab, setMainTab] = useState('sales');
  const [salesTab, setSalesTab] = useState('bolivares');
  const [prizesTab, setPrizesTab] = useState('bolivares');
  const [lotteryOptions, setLotteryOptions] = useState<LotterySystem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Persistir cliente y semana seleccionada en localStorage
  const [selectedClient, setSelectedClient] = useState<string>(() => {
    const saved = localStorage.getItem('banqueo:selectedClient');
    return saved || '';
  });
  
  const [currentWeek, setCurrentWeek] = useState<{ start: Date; end: Date }>(() => {
    const saved = localStorage.getItem('banqueo:currentWeek');
    if (saved) {
      const { start, end } = JSON.parse(saved);
      return { start: new Date(start), end: new Date(end) };
    }
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return { start: weekStart, end: weekEnd };
  });
  
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Guardar cliente seleccionado en localStorage cuando cambie
  useEffect(() => {
    if (selectedClient) {
      localStorage.setItem('banqueo:selectedClient', selectedClient);
    }
  }, [selectedClient]);

  // Guardar semana seleccionada en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('banqueo:currentWeek', JSON.stringify({
      start: currentWeek.start.toISOString(),
      end: currentWeek.end.toISOString(),
    }));
  }, [currentWeek]);

  const form = useForm<BanqueoForm>({
    resolver: zodResolver(banqueoSchema),
    defaultValues: {
      systems: [],
    },
  });

  // Cargar clientes y sistemas de lotería
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Cargar clientes
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (clientsError) throw clientsError;
        setClients(clientsData || []);

        // Cargar sistemas de lotería
        const { data: systemsData, error: systemsError } = await supabase
          .from('lottery_systems')
          .select('id, name, code')
          .eq('is_active', true)
          .order('name');

        if (systemsError) throw systemsError;
        setLotteryOptions(systemsData || []);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'No se pudieron cargar los datos iniciales',
          variant: 'destructive',
        });
      }
    };

    fetchInitialData();
  }, [toast]);

  // Cargar datos cuando cambie el cliente o la semana
  useEffect(() => {
    if (selectedClient && currentWeek && lotteryOptions.length > 0) {
      loadClientData();
    }
  }, [selectedClient, currentWeek, lotteryOptions]);

  const loadClientData = async () => {
    if (!user || !selectedClient || !currentWeek) return;

    setLoading(true);
    const weekStartStr = formatDateForDB(currentWeek.start);
    const weekEndStr = formatDateForDB(currentWeek.end);
    
    try {
      // Inicializar formulario con todos los sistemas
      const systemsData: SystemEntry[] = lotteryOptions.map(system => ({
        lottery_system_id: system.id,
        lottery_system_name: system.name,
        sales_bs: 0,
        sales_usd: 0,
        prizes_bs: 0,
        prizes_usd: 0,
      }));

      // Buscar datos existentes de banqueo_transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('banqueo_transactions')
        .select('*')
        .eq('client_id', selectedClient)
        .eq('week_start_date', weekStartStr)
        .eq('week_end_date', weekEndStr);

      if (transactionsError) {
        console.error('Error buscando transacciones:', transactionsError);
        throw transactionsError;
      }

      if (transactions && transactions.length > 0) {
        // Hay datos existentes, cargarlos en el formulario
        const systemsWithData = systemsData.map(system => {
          const transaction = transactions.find(t => t.lottery_system_id === system.lottery_system_id);
          if (transaction) {
            return {
              ...system,
              sales_bs: Number(transaction.sales_bs || 0),
              sales_usd: Number(transaction.sales_usd || 0),
              prizes_bs: Number(transaction.prizes_bs || 0),
              prizes_usd: Number(transaction.prizes_usd || 0),
            };
          }
          return system;
        });

        form.setValue('systems', systemsWithData);
        setEditMode(true);
      } else {
        // No hay datos, inicializar vacío
        form.setValue('systems', systemsData);
        setEditMode(false);
      }
    } catch (error: any) {
      console.error('Error loading client data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al cargar los datos del cliente',
        variant: 'destructive',
      });
      const systemsData: SystemEntry[] = lotteryOptions.map(system => ({
        lottery_system_id: system.id,
        lottery_system_name: system.name,
        sales_bs: 0,
        sales_usd: 0,
        prizes_bs: 0,
        prizes_usd: 0,
      }));
      form.reset({ systems: systemsData });
      setEditMode(false);
    } finally {
      setLoading(false);
    }
  };

  const systems = form.watch('systems');
  const totals = useMemo(() => {
    return systems.reduce(
      (acc, system) => ({
        sales_bs: acc.sales_bs + (system.sales_bs || 0),
        sales_usd: acc.sales_usd + (system.sales_usd || 0),
        prizes_bs: acc.prizes_bs + (system.prizes_bs || 0),
        prizes_usd: acc.prizes_usd + (system.prizes_usd || 0),
      }),
      { sales_bs: 0, sales_usd: 0, prizes_bs: 0, prizes_usd: 0 }
    );
  }, [systems]);

  const onSubmit = async (data: BanqueoForm) => {
    if (!user || !selectedClient || !currentWeek) return;

    const weekStartStr = formatDateForDB(currentWeek.start);
    const weekEndStr = formatDateForDB(currentWeek.end);

    setLoading(true);
    try {
      // Filtrar sistemas con datos
      const systemsWithData = data.systems.filter(
        system => system.sales_bs > 0 || system.sales_usd > 0 || system.prizes_bs > 0 || system.prizes_usd > 0
      );

      if (systemsWithData.length === 0) {
        toast({
          title: 'Error',
          description: 'Debe ingresar al menos un monto',
          variant: 'destructive',
        });
        return;
      }

      // Eliminar transacciones existentes para esta semana y cliente
      await supabase
        .from('banqueo_transactions')
        .delete()
        .eq('client_id', selectedClient)
        .eq('week_start_date', weekStartStr)
        .eq('week_end_date', weekEndStr);

      // Insertar nuevas transacciones por sistema
      const transactionsData = systemsWithData.map(system => ({
        client_id: selectedClient,
        week_start_date: weekStartStr,
        week_end_date: weekEndStr,
        lottery_system_id: system.lottery_system_id,
        sales_bs: system.sales_bs,
        sales_usd: system.sales_usd,
        prizes_bs: system.prizes_bs,
        prizes_usd: system.prizes_usd,
        created_by: user.id,
      }));

      const { error: insertError } = await supabase
        .from('banqueo_transactions')
        .insert(transactionsData);

      if (insertError) throw insertError;

      toast({
        title: 'Éxito',
        description: editMode 
          ? 'Datos de banqueo actualizados correctamente'
          : 'Datos de banqueo registrados correctamente',
      });

      setEditMode(true);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al procesar los datos de banqueo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = addWeeks(currentWeek.start, direction === 'next' ? 1 : -1);
    const newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
    setCurrentWeek({ start: newStart, end: newEnd });
  };

  const selectedClientName = clients.find(c => c.id === selectedClient)?.name || '';

  return (
    <div className="space-y-6">
      {/* Selectores de Cliente y Semana */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Seleccionar Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center flex-1">
                <p className="text-sm font-medium">
                  {format(currentWeek.start, "dd/MM/yyyy", { locale: es })} - {format(currentWeek.end, "dd/MM/yyyy", { locale: es })}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Ventas Bs</p>
              <p className="text-lg font-bold text-success">
                {formatCurrency(totals.sales_bs, 'VES')}
              </p>
              <p className="text-xs text-muted-foreground">Ventas USD</p>
              <p className="text-lg font-bold text-success">
                {formatCurrency(totals.sales_usd, 'USD')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedClient && (
        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ventas
            </TabsTrigger>
            <TabsTrigger value="prizes" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Premios
            </TabsTrigger>
          </TabsList>

          {/* Resumen de totales */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span>Resumen del Banqueo - {selectedClientName}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Ventas Bs</p>
                  <p className="text-xl font-bold text-success">
                    {formatCurrency(totals.sales_bs, 'VES')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Premios Bs</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatCurrency(totals.prizes_bs, 'VES')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ventas USD</p>
                  <p className="text-xl font-bold text-success">
                    {formatCurrency(totals.sales_usd, 'USD')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Premios USD</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatCurrency(totals.prizes_usd, 'USD')}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Cuadre Bs</p>
                    <p className={`text-2xl font-bold ${(totals.sales_bs - totals.prizes_bs) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(totals.sales_bs - totals.prizes_bs, 'VES')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cuadre USD</p>
                    <p className={`text-2xl font-bold ${(totals.sales_usd - totals.prizes_usd) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(totals.sales_usd - totals.prizes_usd, 'USD')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="sales" className="space-y-6">
            {/* Sub-tabs para ventas */}
            <Tabs value={salesTab} onValueChange={setSalesTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bolivares">Ventas Bs</TabsTrigger>
                <TabsTrigger value="dolares">Ventas USD</TabsTrigger>
              </TabsList>

              <TabsContent value="bolivares" className="space-y-4">
                <BanqueoSalesBolivares 
                  form={form} 
                  lotteryOptions={lotteryOptions}
                />
              </TabsContent>

              <TabsContent value="dolares" className="space-y-4">
                <BanqueoSalesDolares 
                  form={form} 
                  lotteryOptions={lotteryOptions}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="prizes" className="space-y-6">
            {/* Sub-tabs para premios */}
            <Tabs value={prizesTab} onValueChange={setPrizesTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bolivares">Premios Bs</TabsTrigger>
                <TabsTrigger value="dolares">Premios USD</TabsTrigger>
              </TabsList>

              <TabsContent value="bolivares" className="space-y-4">
                <BanqueoPrizesBolivares 
                  form={form} 
                  lotteryOptions={lotteryOptions}
                />
              </TabsContent>

              <TabsContent value="dolares" className="space-y-4">
                <BanqueoPrizesDolares 
                  form={form} 
                  lotteryOptions={lotteryOptions}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      )}

      {/* Botón de guardar */}
      {selectedClient && (
        <div className="flex justify-center">
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={loading} 
            size="lg"
            className="min-w-[200px]"
          >
            {loading ? 'Procesando...' : editMode ? 'Actualizar Banqueo' : 'Registrar Banqueo'}
          </Button>
        </div>
      )}
    </div>
  );
};
