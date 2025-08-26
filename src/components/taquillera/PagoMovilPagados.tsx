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
import { ArrowUpRight } from 'lucide-react';

const pagoPagadoSchema = z.object({
  amount_bs: z.number().min(0.01, 'Monto debe ser mayor a 0'),
  reference_number: z.string().min(1, 'Número de referencia requerido'),
  description: z.string().optional(),
});

type PagoPagadoForm = z.infer<typeof pagoPagadoSchema>;

interface PagoMovilPagadosProps {
  onSuccess?: () => void;
}

export const PagoMovilPagados = ({ onSuccess }: PagoMovilPagadosProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<PagoPagadoForm>({
    resolver: zodResolver(pagoPagadoSchema),
    defaultValues: {
      amount_bs: 0,
      reference_number: '',
      description: '',
    },
  });

  const onSubmit = async (data: PagoPagadoForm) => {
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
        .maybeSingle();

      if (!session) {
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
      }

      // Now insert the mobile payment (paid out)
      const { error } = await supabase
        .from('mobile_payments')
        .insert({
          session_id: session.id,
          amount_bs: -Math.abs(data.amount_bs), // Negative amount for paid out
          reference_number: data.reference_number,
          description: data.description ? `[PAGADO] ${data.description}` : '[PAGADO]',
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Pago móvil pagado registrado correctamente',
      });

      // Reset form
      form.reset({
        amount_bs: 0,
        reference_number: '',
        description: '',
      });
      
      onSuccess?.();
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monto Pagado (Bs)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="0,00"
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
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="reference_number">Número de Referencia</Label>
          <Input
            placeholder="Ej: 987654321"
            {...form.register('reference_number')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          placeholder="Premio pagado, cliente, número ganador..."
          {...form.register('description')}
          rows={2}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        <ArrowUpRight className="h-4 w-4 mr-2" />
        {loading ? 'Registrando...' : 'Agregar Pago Pagado'}
      </Button>
    </form>
  );
};