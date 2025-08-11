import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

const posSchema = z.object({
  amount_bs: z.number().min(0, 'Monto debe ser positivo'),
});

type POSForm = z.infer<typeof posSchema>;

export const PointOfSaleForm = () => {
  const [loading, setLoading] = useState(false);
  const [currentAmount, setCurrentAmount] = useState<number>(0);
  const [hasEntry, setHasEntry] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<POSForm>({
    resolver: zodResolver(posSchema),
    defaultValues: {
      amount_bs: 0,
    },
  });

  useEffect(() => {
    fetchCurrentPOS();
  }, [user]);

  const fetchCurrentPOS = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's session
      const { data: session } = await supabase
        .from('daily_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .single();

      if (session) {
        const { data: posData } = await supabase
          .from('point_of_sale')
          .select('amount_bs')
          .eq('session_id', session.id)
          .single();

        if (posData) {
          setCurrentAmount(Number(posData.amount_bs));
          setHasEntry(true);
          form.setValue('amount_bs', Number(posData.amount_bs));
        }
      }
    } catch (error) {
      console.error('Error fetching POS data:', error);
    }
  };

  const onSubmit = async (data: POSForm) => {
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

      if (hasEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('point_of_sale')
          .update({
            amount_bs: data.amount_bs,
          })
          .eq('session_id', session.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('point_of_sale')
          .insert({
            session_id: session.id,
            amount_bs: data.amount_bs,
          });

        if (error) throw error;
        setHasEntry(true);
      }

      setCurrentAmount(data.amount_bs);

      toast({
        title: 'Éxito',
        description: 'Punto de venta actualizado correctamente',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar punto de venta',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Punto de Venta del Día</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount_bs">Monto Total (Bs)</Label>
            <Input
              type="text"
              placeholder="0,00"
              defaultValue={currentAmount > 0 ? formatCurrency(currentAmount, 'VES').replace('Bs ', '') : ''}
              onBlur={(e) => {
                const cleanValue = e.target.value.replace(/[^\d,]/g, '');
                const numValue = parseFloat(cleanValue.replace(',', '.')) || 0;
                form.setValue('amount_bs', numValue);
                e.target.value = numValue > 0 ? numValue.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) : '';
              }}
              onChange={(e) => {
                const cleanValue = e.target.value.replace(/[^\d,]/g, '');
                const numValue = parseFloat(cleanValue.replace(',', '.')) || 0;
                form.setValue('amount_bs', numValue);
              }}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Guardando...' : hasEntry ? 'Actualizar Monto' : 'Registrar Monto'}
          </Button>

          {currentAmount > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Monto actual:</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(currentAmount, 'VES')}
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};