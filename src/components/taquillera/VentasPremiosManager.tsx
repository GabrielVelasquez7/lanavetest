import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { VentasPremiosBolivares } from './VentasPremiosBolivares';
import { VentasPremiosDolares } from './VentasPremiosDolares';
import { CuadreHistorial } from './CuadreHistorial';
import { Calendar, History, Edit } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

interface VentasPremiosManagerProps {
  onSuccess?: () => void;
}

export const VentasPremiosManager = ({ onSuccess }: VentasPremiosManagerProps) => {
  const [activeTab, setActiveTab] = useState('bolivares');
  const [lotteryOptions, setLotteryOptions] = useState<LotterySystem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<VentasPremiosForm>({
    resolver: zodResolver(ventasPremiosSchema),
    defaultValues: {
      systems: [],
    },
  });

  // Cargar sistemas de lotería y datos existentes
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar sistemas de lotería
        const { data: systems, error: systemsError } = await supabase
          .from('lottery_systems')
          .select('id, name, code')
          .eq('is_active', true)
          .order('name');

        if (systemsError) throw systemsError;

        setLotteryOptions(systems || []);
        
        // Inicializar formulario con todos los sistemas
        const systemsData: SystemEntry[] = (systems || []).map(system => ({
          lottery_system_id: system.id,
          lottery_system_name: system.name,
          sales_bs: 0,
          sales_usd: 0,
          prizes_bs: 0,
          prizes_usd: 0,
        }));

        // Cargar datos existentes del día actual
        await loadTodayData(systemsData);

      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'No se pudieron cargar los datos',
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, [user, toast]);

  const loadTodayData = async (defaultSystems: SystemEntry[]) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Buscar sesión del día actual
      const { data: session } = await supabase
        .from('daily_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .single();

      if (session) {
        setCurrentSessionId(session.id);
        
        // Cargar transacciones existentes
        const [salesResult, prizesResult] = await Promise.all([
          supabase
            .from('sales_transactions')
            .select('lottery_system_id, amount_bs, amount_usd')
            .eq('session_id', session.id),
          supabase
            .from('prize_transactions')
            .select('lottery_system_id, amount_bs, amount_usd')
            .eq('session_id', session.id)
        ]);

        // Combinar datos existentes con sistemas por defecto
        const systemsWithData = defaultSystems.map(system => {
          const salesData = salesResult.data?.find(s => s.lottery_system_id === system.lottery_system_id);
          const prizesData = prizesResult.data?.find(p => p.lottery_system_id === system.lottery_system_id);

          return {
            ...system,
            sales_bs: Number(salesData?.amount_bs || 0),
            sales_usd: Number(salesData?.amount_usd || 0),
            prizes_bs: Number(prizesData?.amount_bs || 0),
            prizes_usd: Number(prizesData?.amount_usd || 0),
          };
        });

        form.setValue('systems', systemsWithData);
        
        // Si hay datos, activar modo edición
        const hasData = systemsWithData.some(s => 
          s.sales_bs > 0 || s.sales_usd > 0 || s.prizes_bs > 0 || s.prizes_usd > 0
        );
        setEditMode(hasData);
      } else {
        form.setValue('systems', defaultSystems);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
      form.setValue('systems', defaultSystems);
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
    if (!user) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let sessionId = currentSessionId;

      // Crear sesión si no existe
      if (!sessionId) {
        const { data: newSession, error: createError } = await supabase
          .from('daily_sessions')
          .insert({
            user_id: user.id,
            session_date: today,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        sessionId = newSession.id;
        setCurrentSessionId(sessionId);
      }

      // Si estamos en modo edición, eliminar transacciones existentes
      if (editMode && sessionId) {
        await Promise.all([
          supabase.from('sales_transactions').delete().eq('session_id', sessionId),
          supabase.from('prize_transactions').delete().eq('session_id', sessionId)
        ]);
      }

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

      // Preparar datos de ventas y premios
      const salesData = systemsWithData
        .filter(system => system.sales_bs > 0 || system.sales_usd > 0)
        .map(system => ({
          session_id: sessionId,
          lottery_system_id: system.lottery_system_id,
          amount_bs: system.sales_bs,
          amount_usd: system.sales_usd,
        }));

      const prizesData = systemsWithData
        .filter(system => system.prizes_bs > 0 || system.prizes_usd > 0)
        .map(system => ({
          session_id: sessionId,
          lottery_system_id: system.lottery_system_id,
          amount_bs: system.prizes_bs,
          amount_usd: system.prizes_usd,
        }));

      // Insertar datos
      const promises = [];
      if (salesData.length > 0) {
        promises.push(supabase.from('sales_transactions').insert(salesData));
      }
      if (prizesData.length > 0) {
        promises.push(supabase.from('prize_transactions').insert(prizesData));
      }

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message);
      }

      toast({
        title: 'Éxito',
        description: editMode 
          ? 'Cuadre actualizado correctamente'
          : `Registradas ${salesData.length} ventas y ${prizesData.length} premios correctamente`,
      });

      setEditMode(true);
      onSuccess?.();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al procesar las transacciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Resumen de totales */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resumen del Cuadre {editMode && <Edit className="h-4 w-4 ml-2" />}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('historial')}
              >
                <History className="h-4 w-4 mr-2" />
                Historial
              </Button>
            </div>
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

      {/* Tabs para diferentes secciones */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bolivares">Ventas/Premios Bs</TabsTrigger>
          <TabsTrigger value="dolares">Ventas/Premios USD</TabsTrigger>
          <TabsTrigger value="historial">
            <History className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
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

        <TabsContent value="historial" className="space-y-4">
          <CuadreHistorial />
        </TabsContent>
      </Tabs>

      {/* Botón de guardar */}
      {activeTab !== 'historial' && (
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
      )}
    </div>
  );
};