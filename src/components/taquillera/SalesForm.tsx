import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const salesSchema = z.object({
  lottery_system_id: z.string().min(1, 'Selecciona un sistema'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  notes: z.string().optional(),
});

type SalesFormData = z.infer<typeof salesSchema>;

interface LotterySystem {
  id: string;
  name: string;
}

export const SalesForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [systems, setSystems] = useState<LotterySystem[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<SalesFormData>({
    resolver: zodResolver(salesSchema),
    defaultValues: {
      lottery_system_id: '',
      amount: 0,
      notes: '',
    },
  });

  useEffect(() => {
    fetchLotterySystems();
  }, []);

  const fetchLotterySystems = async () => {
    const { data, error } = await supabase
      .from('lottery_systems')
      .select('id, name')
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los sistemas de lotería',
        variant: 'destructive',
      });
    } else {
      setSystems(data || []);
    }
  };

  const onSubmit = async (data: SalesFormData) => {
    if (!user) return;

    setLoading(true);
    
    const { error } = await supabase
      .from('sales_transactions')
      .insert({
        user_id: user.id,
        lottery_system_id: data.lottery_system_id,
        amount: data.amount,
        notes: data.notes || null,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo registrar la venta',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Éxito',
        description: 'Venta registrada correctamente',
      });
      form.reset();
    }
    
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="lottery_system_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sistema de Lotería</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un sistema" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {systems.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto de Venta ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Detalles adicionales..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Registrando...' : 'Registrar Venta'}
        </Button>
      </form>
    </Form>
  );
};