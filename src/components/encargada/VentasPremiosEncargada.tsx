import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { VentasPremiosBolivares } from '../taquillera/VentasPremiosBolivares';
import { VentasPremiosDolares } from '../taquillera/VentasPremiosDolares';
import { GastosManagerEncargada } from './GastosManagerEncargada';
import { PagoMovilManagerEncargada } from './PagoMovilManagerEncargada';
import { PointOfSaleFormEncargada } from './PointOfSaleFormEncargada';
import { CuadreGeneralEncargada } from './CuadreGeneralEncargada';
import { Edit, Building2, CalendarIcon, DollarSign, Receipt, Smartphone, HandCoins, CreditCard, RefreshCw, Loader2 } from 'lucide-react';
import { SystemSyncManager, SystemSyncResult } from './SystemSyncManager';
import { formatCurrency, cn } from '@/lib/utils';
import { formatDateForDB } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const systemEntrySchema = z.object({
  lottery_system_id: z.string(),
  lottery_system_name: z.string(),
  sales_bs: z.number().min(0),
  sales_usd: z.number().min(0),
  prizes_bs: z.number().min(0),
  prizes_usd: z.number().min(0),
});

const ventasPremiosSchema = z.object({
  systems: z.array(systemEntrySchema),
});

export type VentasPremiosForm = z.infer<typeof ventasPremiosSchema>;
export type SystemEntry = z.infer<typeof systemEntrySchema>;

interface LotterySystem {
  id: string;
  name: string;
  code: string;
}

interface Agency {
  id: string;
  name: string;
}

interface VentasPremiosEncargadaProps {
  // No props needed, component handles its own date selection
}

export const VentasPremiosEncargada = ({}: VentasPremiosEncargadaProps) => {
  const [mainTab, setMainTab] = useState('ventas-premios');
  const [activeTab, setActiveTab] = useState('bolivares');
  const [lotteryOptions, setLotteryOptions] = useState<LotterySystem[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCuadreId, setCurrentCuadreId] = useState<string | null>(null);
  
  // System sync states
  const [isSystemSyncModalOpen, setIsSystemSyncModalOpen] = useState(false);
  const [isUpdatingFields, setIsUpdatingFields] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<VentasPremiosForm>({
    resolver: zodResolver(ventasPremiosSchema),
    defaultValues: {
      systems: [],
    },
  });

  // Cargar agencias y sistemas de lotería
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [agenciesResult, systemsResult] = await Promise.all([
          supabase
            .from('agencies')
            .select('id, name')
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('lottery_systems')
            .select('id, name, code')
            .eq('is_active', true)
            .order('name')
        ]);

        if (agenciesResult.error) throw agenciesResult.error;
        if (systemsResult.error) throw systemsResult.error;

        setAgencies(agenciesResult.data || []);
        setLotteryOptions(systemsResult.data || []);

        // Seleccionar primera agencia por defecto
        if (agenciesResult.data && agenciesResult.data.length > 0) {
          setSelectedAgency(agenciesResult.data[0].id);
        }

      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'No se pudieron cargar los datos iniciales',
          variant: 'destructive',
        });
      }
    };

    fetchInitialData();
  }, [user, toast]);

  // Cargar datos cuando cambie la agencia o la fecha
  useEffect(() => {
    if (selectedAgency && lotteryOptions.length > 0 && selectedDate) {
      // Resetear estado antes de cargar nuevos datos
      setLoading(true);
      setEditMode(false);
      setCurrentCuadreId(null);
      form.reset({ systems: [] });
      
      loadAgencyData();
    }
    
    // Cleanup function
    return () => {
      setLoading(false);
    };
  }, [selectedAgency, selectedDate, lotteryOptions]);

  const loadAgencyData = async () => {
    if (!user || !selectedDate || !selectedAgency) return;

    const dateStr = formatDateForDB(selectedDate);
    
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

      // Buscar cuadres existentes para la agencia en la fecha seleccionada (datos de encargada)
      const { data: cuadres } = await supabase
        .from('daily_cuadres_summary')
        .select('*')
        .eq('agency_id', selectedAgency)
        .eq('session_date', dateStr)
        .is('session_id', null); // Solo registros de encargada (sin session_id)

      if (cuadres && cuadres.length > 0) {
        // Agrupar por sistema de lotería y sumar los montos
        const systemsWithData = systemsData.map(system => {
          const systemCuadres = cuadres.filter(c => c.lottery_system_id === system.lottery_system_id);
          
          return {
            ...system,
            sales_bs: systemCuadres.reduce((sum, c) => sum + Number(c.total_sales_bs || 0), 0),
            sales_usd: systemCuadres.reduce((sum, c) => sum + Number(c.total_sales_usd || 0), 0),
            prizes_bs: systemCuadres.reduce((sum, c) => sum + Number(c.total_prizes_bs || 0), 0),
            prizes_usd: systemCuadres.reduce((sum, c) => sum + Number(c.total_prizes_usd || 0), 0),
          };
        });

        // Reemplazar completamente los valores del formulario con los datos cargados
        form.reset({ systems: systemsWithData });
        
        // Determinar si estamos en modo edición
        const hasData = systemsWithData.some(s => s.sales_bs > 0 || s.sales_usd > 0 || s.prizes_bs > 0 || s.prizes_usd > 0);
        setEditMode(hasData);
        
        // Establecer ID del cuadre
        if (cuadres.length > 0) {
          setCurrentCuadreId(cuadres[0].id);
        } else {
          setCurrentCuadreId(null);
        }
      } else {
        form.reset({ systems: systemsData });
        setEditMode(false);
        setCurrentCuadreId(null);
      }
    } catch (error) {
      console.error('Error loading agency data:', error);
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
      setCurrentCuadreId(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = useCallback(() => {
    const systems = form.watch('systems');
    return systems.reduce(
      (acc, system) => ({
        sales_bs: acc.sales_bs + (system.sales_bs || 0),
        sales_usd: acc.sales_usd + (system.sales_usd || 0),
        prizes_bs: acc.prizes_bs + (system.prizes_bs || 0),
        prizes_usd: acc.prizes_usd + (system.prizes_usd || 0),
      }),
      { sales_bs: 0, sales_usd: 0, prizes_bs: 0, prizes_usd: 0 }
    );
  }, [form]);

  const onSubmit = async (data: VentasPremiosForm) => {
    if (!user || !selectedDate || !selectedAgency) return;

    const dateStr = formatDateForDB(selectedDate);

    setLoading(true);
    try {
      // Si estamos en modo edición, eliminar cuadres existentes para esta fecha y agencia
      if (editMode) {
        await supabase
          .from('daily_cuadres_summary')
          .delete()
          .eq('agency_id', selectedAgency)
          .eq('session_date', dateStr)
          .is('session_id', null); // Solo registros de encargada
      }

      // Filtrar sistemas con datos (cuadre neto = ventas - premios)
      const systemsWithData = data.systems.filter(
        system => {
          const cuadreNeto = (system.sales_bs - system.prizes_bs) !== 0 || 
                           (system.sales_usd - system.prizes_usd) !== 0;
          return cuadreNeto;
        }
      );

      if (systemsWithData.length === 0) {
        toast({
          title: 'Error',
          description: 'Debe ingresar al menos un cuadre con datos',
          variant: 'destructive',
        });
        return;
      }

      // Preparar datos para insertar (datos completos de la encargada)
      const cuadresData = systemsWithData.map(system => ({
        user_id: user.id,
        agency_id: selectedAgency,
        session_date: dateStr,
        lottery_system_id: system.lottery_system_id,
        session_id: null, // Encargada no tiene session_id
        total_sales_bs: system.sales_bs,
        total_sales_usd: system.sales_usd,
        total_prizes_bs: system.prizes_bs,
        total_prizes_usd: system.prizes_usd,
        balance_bs: system.sales_bs - system.prizes_bs,
        cash_available_bs: 0,
        cash_available_usd: 0,
        exchange_rate: 36,
      }));

      // Insertar nuevos cuadres
      const { error: insertError } = await supabase
        .from('daily_cuadres_summary')
        .insert(cuadresData);

      if (insertError) throw insertError;

      toast({
        title: 'Éxito',
        description: editMode 
          ? 'Cuadre actualizado correctamente'
          : `Registrados ${cuadresData.length} cuadres correctamente`,
      });

      setEditMode(true);
      await loadAgencyData();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al procesar los cuadres',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadAgencyData();
  };

  const handleSyncSystems = () => {
    if (!selectedAgency || !selectedDate) {
      toast({
        title: "Error",
        description: "Selecciona una agencia y fecha primero",
        variant: "destructive",
      });
      return;
    }
    setIsSystemSyncModalOpen(true);
  };

  const handleSyncSuccess = async (results: SystemSyncResult[]) => {
    setIsUpdatingFields(true);
    
    console.log('Sync results received:', results);

    // Map system codes to update form values
    const systemCodeToLotterySystem: Record<string, LotterySystem | undefined> = {
      'MAXPLAY': lotteryOptions.find(s => s.code === 'MAXPLAY'),
      // Handle both SOURCE and SOURCES codes
      'SOURCES': lotteryOptions.find(s => s.code === 'SOURCES') || lotteryOptions.find(s => s.code === 'SOURCE'),
      'SOURCE': lotteryOptions.find(s => s.code === 'SOURCE'),
      'PREMIER': lotteryOptions.find(s => s.code === 'PREMIER'),
    };

    // Get current form values
    const currentSystems = form.getValues('systems');
    const updatedSystems = Array.isArray(currentSystems) ? [...currentSystems] : [];

    // Process each successful sync result
    results.forEach(result => {
      if (!result.success || !result.agencyResults) return;

      const codeKey = (result.systemCode || '').toUpperCase();
      const lotterySystem = systemCodeToLotterySystem[codeKey];
      if (!lotterySystem) return;

      // Find data for the current agency (by name match)
      const currentAgencyResult = result.agencyResults.find(agencyResult => {
        const agency = agencies.find(a => a.name === agencyResult.name);
        return agency?.id === selectedAgency;
      });

      if (currentAgencyResult) {
        // Update the corresponding system in the form
        const systemIndex = updatedSystems.findIndex(
          s => s.lottery_system_id === lotterySystem.id
        );

        const salesBs = Number(currentAgencyResult.sales) || 0;
        const prizesBs = Number(currentAgencyResult.prizes) || 0;

        if (systemIndex !== -1) {
          updatedSystems[systemIndex] = {
            ...updatedSystems[systemIndex],
            sales_bs: salesBs,
            prizes_bs: prizesBs,
          };
        } else {
          // Ensure an entry exists if it wasn't initialized yet
          updatedSystems.push({
            lottery_system_id: lotterySystem.id,
            lottery_system_name: lotterySystem.name,
            sales_bs: salesBs,
            sales_usd: 0,
            prizes_bs: prizesBs,
            prizes_usd: 0,
          });
        }
      }
    });

    // Update form with all synchronized data and mark as dirty to re-render
    form.setValue('systems', updatedSystems as any, { shouldDirty: true, shouldValidate: false });

    // Show summary toast
    const successfulSyncs = results.filter(r => r.success);
    if (successfulSyncs.length > 0) {
      toast({
        title: 'Campos actualizados',
        description: `${successfulSyncs.map(r => r.systemName).join(', ')} sincronizados correctamente. Revisa los valores y guarda cuando estés listo.`,
      });
    }
    
    setIsUpdatingFields(false);
  };

  const totals = calculateTotals();
  const selectedAgencyName = agencies.find(a => a.id === selectedAgency)?.name || '';

  return (
    <div className="space-y-6">
      {/* Selectores de Agencia y Fecha */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Seleccionar Agencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una agencia" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
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
              Seleccionar Fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Sincronización de Sistemas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-full">
            <Button 
              onClick={handleSyncSystems}
              disabled={!selectedAgency || !selectedDate}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar Sistemas
            </Button>
          </CardContent>
        </Card>
      </div>

      {selectedAgency && (
        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ventas-premios" className="flex items-center gap-2">
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
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Resumen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ventas-premios" className="space-y-6">
            {/* Resumen de totales */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span>Resumen del Cuadre - {selectedAgencyName} {editMode && <Edit className="h-4 w-4 ml-2" />}</span>
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

            {/* Sub-tabs para ventas/premios */}
            <div className="relative">
              {isUpdatingFields && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <div className="text-center p-6">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                    <p className="text-sm font-medium text-foreground">Actualizando campos con datos de MaxPlayGo</p>
                    <p className="text-xs text-muted-foreground mt-1">Por favor espere...</p>
                  </div>
                </div>
              )}
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bolivares">Ventas/Premios Bs</TabsTrigger>
                  <TabsTrigger value="dolares">Ventas/Premios USD</TabsTrigger>
                </TabsList>

                <TabsContent value="bolivares" className="space-y-4">
                  <VentasPremiosBolivares 
                    form={form} 
                    lotteryOptions={lotteryOptions}
                  />
                </TabsContent>

                <TabsContent value="dolares" className="space-y-4">
                  <VentasPremiosDolares 
                    form={form} 
                    lotteryOptions={lotteryOptions}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Botón de guardar */}
            <div className="flex justify-center">
              <Button 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={loading} 
                size="lg"
                className="min-w-[200px]"
              >
                {loading ? 'Procesando...' : editMode ? 'Actualizar Cuadre' : 'Registrar Cuadre'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="gastos" className="space-y-6">
            <GastosManagerEncargada 
              onSuccess={refreshData} 
              selectedAgency={selectedAgency}
              selectedDate={selectedDate}
            />
          </TabsContent>

          <TabsContent value="pago-movil" className="space-y-6">
            <PagoMovilManagerEncargada 
              onSuccess={refreshData} 
              selectedAgency={selectedAgency}
              selectedDate={selectedDate}
            />
          </TabsContent>


          <TabsContent value="punto-venta" className="space-y-6">
            <PointOfSaleFormEncargada 
              selectedAgency={selectedAgency}
              selectedDate={selectedDate}
              onSuccess={refreshData}
            />
          </TabsContent>

          <TabsContent value="resumen" className="space-y-6">
            <CuadreGeneralEncargada 
              selectedAgency={selectedAgency}
              selectedDate={selectedDate}
              refreshKey={Math.random()}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* System Sync Manager Modal */}
      {selectedAgency && selectedDate && (
        <SystemSyncManager
          isOpen={isSystemSyncModalOpen}
          onClose={() => setIsSystemSyncModalOpen(false)}
          targetDate={format(selectedDate, 'dd-MM-yyyy')}
          onSuccess={handleSyncSuccess}
        />
      )}
    </div>
  );
};