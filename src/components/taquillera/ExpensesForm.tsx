import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '@/components/ui/textarea';

const expenseSchema = z.object({
  category: z.enum(['deuda', 'gasto_operativo', 'otros']),
  description: z.string().min(1, 'Descripción es requerida'),
  amount_bs: z.number().min(0, 'Monto debe ser positivo'),
  amount_usd: z.number().min(0, 'Monto debe ser positivo'),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

export const ExpensesForm = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount_bs: 0,
      amount_usd: 0,
      description: '',
    },
  });

  const onSubmit = async (data: ExpenseForm) => {
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

      // Now insert the expense
      const { error } = await supabase
        .from('expenses')
        .insert({
          session_id: session.id,
          category: data.category,
          description: data.description,
          amount_bs: data.amount_bs,
          amount_usd: data.amount_usd,
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Gasto registrado correctamente',
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar el gasto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels = {
    deuda: 'Deuda',
    gasto_operativo: 'Gasto Operativo',
    otros: 'Otros',
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <Select
            value={form.watch('category')}
            onValueChange={(value) => form.setValue('category', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Input
            placeholder="Describe el gasto..."
            {...form.register('description')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monto Bs</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register('amount_bs', { valueAsNumber: true })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monto USD</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register('amount_usd', { valueAsNumber: true })}
            />
          </CardContent>
        </Card>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Registrando...' : 'Registrar Gasto'}
      </Button>
    </form>
  );
};