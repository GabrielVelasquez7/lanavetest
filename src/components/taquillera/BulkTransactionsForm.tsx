import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';

const systemEntrySchema = z.object({
  lottery_system_id: z.string(),
  lottery_system_name: z.string(),
  sales_bs: z.number().min(0),
  sales_usd: z.number().min(0),
  prizes_bs: z.number().min(0),
  prizes_usd: z.number().min(0),
});

const bulkEntrySchema = z.object({
  systems: z.array(systemEntrySchema),
});

type BulkEntryForm = z.infer<typeof bulkEntrySchema>;

interface LotterySystem {
  id: string;
  name: string;
  code: string;
}

interface BulkTransactionsFormProps {
  onSuccess?: () => void;
}

export const BulkTransactionsForm = ({ onSuccess }: BulkTransactionsFormProps) => {
  const [lotteryOptions, setLotteryOptions] = useState<LotterySystem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<BulkEntryForm>({
    resolver: zodResolver(bulkEntrySchema),
    defaultValues: {
      systems: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'systems',
  });

  useEffect(() => {
    const fetchLotteryOptions = async () => {
      const { data, error } = await supabase
        .from('lottery_systems')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los sistemas',
          variant: 'destructive',
        });
      } else {
        setLotteryOptions(data || []);
        // Initialize form with all systems
        const systemsData = (data || []).map(system => ({
          lottery_system_id: system.id,
          lottery_system_name: system.name,
          sales_bs: 0,
          sales_usd: 0,
          prizes_bs: 0,
          prizes_usd: 0,
        }));
        replace(systemsData);
      }
    };

    fetchLotteryOptions();
  }, [toast, replace]);

  const formatNumberForDisplay = (value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseInputValue = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Remove any non-digit characters except comma and dot
    const cleanValue = value.replace(/[^\d.,]/g, '');
    // Replace comma with dot for parsing
    const normalizedValue = cleanValue.replace(',', '.');
    const num = parseFloat(normalizedValue);
    return isNaN(num) ? 0 : num;
  };

  const handleNumberInput = (index: number, field: string, value: string) => {
    const numValue = parseInputValue(value);
    form.setValue(`systems.${index}.${field}` as any, numValue);
  };

  const onSubmit = async (data: BulkEntryForm) => {
    if (!user) return;

    setLoading(true);
    try {
      // First, ensure we have a daily session for today
      const today = new Date().toISOString().split('T')[0];
      
      let { data: session, error: sessionError } = await supabase
        .from('daily_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .single();

      if (sessionError && sessionError.code === 'PGRST116') {
        // Session doesn't exist, create it
        const { data: newSession, error: createError } = await supabase
          .from('daily_sessions')
          .insert({
            user_id: user.id,
            session_date: today,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        session = newSession;
      } else if (sessionError) {
        throw sessionError;
      }

      // Filter systems with any values > 0
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

      // Prepare sales and prizes data
      const salesData = systemsWithData
        .filter(system => system.sales_bs > 0 || system.sales_usd > 0)
        .map(system => ({
          session_id: session.id,
          lottery_system_id: system.lottery_system_id,
          amount_bs: system.sales_bs,
          amount_usd: system.sales_usd,
        }));

      const prizesData = systemsWithData
        .filter(system => system.prizes_bs > 0 || system.prizes_usd > 0)
        .map(system => ({
          session_id: session.id,
          lottery_system_id: system.lottery_system_id,
          amount_bs: system.prizes_bs,
          amount_usd: system.prizes_usd,
        }));

      // Insert sales if any
      if (salesData.length > 0) {
        const { error: salesError } = await supabase
          .from('sales_transactions')
          .insert(salesData);
        
        if (salesError) throw salesError;
      }

      // Insert prizes if any
      if (prizesData.length > 0) {
        const { error: prizesError } = await supabase
          .from('prize_transactions')
          .insert(prizesData);
        
        if (prizesError) throw prizesError;
      }

      toast({
        title: 'Éxito',
        description: `Registradas ${salesData.length} ventas y ${prizesData.length} premios correctamente`,
      });

      // Reset form
      const resetData = lotteryOptions.map(system => ({
        lottery_system_id: system.id,
        lottery_system_name: system.name,
        sales_bs: 0,
        sales_usd: 0,
        prizes_bs: 0,
        prizes_usd: 0,
      }));
      replace(resetData);

      // Trigger refresh in parent component
      onSuccess?.();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar las transacciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
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
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4">
        <div className="grid grid-cols-6 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
          <div>Sistema</div>
          <div className="text-center">Ventas Bs</div>
          <div className="text-center">Ventas USD</div>
          <div className="text-center">Premios Bs</div>
          <div className="text-center">Premios USD</div>
          <div className="text-center">Cuadre Bs</div>
        </div>

        {fields.map((field, index) => {
          const watchedValues = form.watch(`systems.${index}`);
          const systemCuadre = (watchedValues.sales_bs || 0) - (watchedValues.prizes_bs || 0);
          
          return (
            <div key={field.id} className="grid grid-cols-6 gap-2 items-center">
              <div className="font-medium text-sm">
                {field.lottery_system_name}
              </div>
              
              <Input
                type="text"
                placeholder="0,00"
                key={`sales_bs_${field.id}`}
                onBlur={(e) => {
                  const value = parseInputValue(e.target.value);
                  form.setValue(`systems.${index}.sales_bs`, value);
                  e.target.value = formatNumberForDisplay(value);
                }}
                onChange={(e) => {
                  handleNumberInput(index, 'sales_bs', e.target.value);
                }}
                className="text-center"
              />
              
              <Input
                type="text"
                placeholder="0.00"
                key={`sales_usd_${field.id}`}
                onBlur={(e) => {
                  const value = parseInputValue(e.target.value);
                  form.setValue(`systems.${index}.sales_usd`, value);
                  e.target.value = formatNumberForDisplay(value);
                }}
                onChange={(e) => {
                  handleNumberInput(index, 'sales_usd', e.target.value);
                }}
                className="text-center"
              />
              
              <Input
                type="text"
                placeholder="0,00"
                key={`prizes_bs_${field.id}`}
                onBlur={(e) => {
                  const value = parseInputValue(e.target.value);
                  form.setValue(`systems.${index}.prizes_bs`, value);
                  e.target.value = formatNumberForDisplay(value);
                }}
                onChange={(e) => {
                  handleNumberInput(index, 'prizes_bs', e.target.value);
                }}
                className="text-center"
              />
              
              <Input
                type="text"
                placeholder="0.00"
                key={`prizes_usd_${field.id}`}
                onBlur={(e) => {
                  const value = parseInputValue(e.target.value);
                  form.setValue(`systems.${index}.prizes_usd`, value);
                  e.target.value = formatNumberForDisplay(value);
                }}
                onChange={(e) => {
                  handleNumberInput(index, 'prizes_usd', e.target.value);
                }}
                className="text-center"
              />
              
              <div className={`text-center font-medium ${systemCuadre >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(systemCuadre, 'VES')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Ventas Bs</p>
              <p className="text-xl font-bold text-success">
                {formatCurrency(totals.sales_bs, 'VES')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Ventas USD</p>
              <p className="text-xl font-bold text-success">
                {formatCurrency(totals.sales_usd, 'USD')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Premios Bs</p>
              <p className="text-xl font-bold text-destructive">
                {formatCurrency(totals.prizes_bs, 'VES')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Premios USD</p>
              <p className="text-xl font-bold text-destructive">
                {formatCurrency(totals.prizes_usd, 'USD')}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Cuadre Total Bs</p>
                <p className={`text-2xl font-bold ${(totals.sales_bs - totals.prizes_bs) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(totals.sales_bs - totals.prizes_bs, 'VES')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cuadre Total USD</p>
                <p className={`text-2xl font-bold ${(totals.sales_usd - totals.prizes_usd) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(totals.sales_usd - totals.prizes_usd, 'USD')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? 'Registrando...' : 'Registrar Todas las Transacciones'}
      </Button>
    </form>
  );
};