import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';

const mobilePaymentSchema = z.object({
  amount_bs: z.number().min(0.01, 'Monto debe ser mayor a 0'),
  reference_number: z.string().min(1, 'Número de referencia requerido'),
  description: z.string().optional(),
});

type MobilePaymentForm = z.infer<typeof mobilePaymentSchema>;

interface MobilePayment {
  id: string;
  amount_bs: number;
  reference_number: string;
  description?: string;
}

export const MobilePaymentsForm = () => {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<MobilePayment[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<MobilePaymentForm>({
    resolver: zodResolver(mobilePaymentSchema),
    defaultValues: {
      amount_bs: 0,
      reference_number: '',
      description: '',
    },
  });

  const onSubmit = async (data: MobilePaymentForm) => {
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

      // Now insert the mobile payment
      const { data: newPayment, error } = await supabase
        .from('mobile_payments')
        .insert({
          session_id: session.id,
          amount_bs: data.amount_bs,
          reference_number: data.reference_number,
          description: data.description,
        })
        .select('id, amount_bs, reference_number, description')
        .single();

      if (error) throw error;

      setPayments(prev => [...prev, newPayment]);

      toast({
        title: 'Éxito',
        description: 'Pago móvil registrado correctamente',
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar el pago móvil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount_bs, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registrar Pago Móvil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount_bs">Monto (Bs)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...form.register('amount_bs', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">Número de Referencia</Label>
                <Input
                  placeholder="Ej: 123456789"
                  {...form.register('reference_number')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                placeholder="Observaciones adicionales..."
                {...form.register('description')}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Registrando...' : 'Registrar Pago Móvil'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pagos Móviles del Día
              <span className="text-primary">
                Total: {formatCurrency(totalAmount, 'VES')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold">
                      {formatCurrency(payment.amount_bs, 'VES')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ref: {payment.reference_number}
                    </p>
                    {payment.description && (
                      <p className="text-sm text-muted-foreground">
                        {payment.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};