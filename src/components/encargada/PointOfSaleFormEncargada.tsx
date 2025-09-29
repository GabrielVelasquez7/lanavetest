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
import { formatDateForDB } from '@/lib/dateUtils';
import { format } from 'date-fns';

const posSchema = z.object({
  amount_bs: z.number().min(0, 'Monto debe ser positivo'),
});

type POSForm = z.infer<typeof posSchema>;

interface PointOfSaleFormEncargadaProps {
  selectedAgency: string;
  selectedDate: Date;
  onSuccess?: () => void;
}

export const PointOfSaleFormEncargada = ({ selectedAgency, selectedDate, onSuccess }: PointOfSaleFormEncargadaProps) => {
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
    // Limpiar datos anteriores
    setCurrentAmount(0);
    setHasEntry(false);
    form.reset({ amount_bs: 0 });
    
    if (selectedAgency && selectedDate) {
      fetchCurrentPOS();
    }
  }, [selectedAgency, selectedDate]);

  const fetchCurrentPOS = async () => {
    if (!selectedAgency || !selectedDate) return;

    try {
      const dateStr = formatDateForDB(selectedDate);
      
      // Using a more explicit query structure to avoid type issues
      const query = supabase
        .from('point_of_sale')
        .select('amount_bs')
        .eq('agency_id', selectedAgency)
        .eq('transaction_date', dateStr);
      
      const { data: posDataArray, error: posError } = await query;

      if (posError && posError.code !== 'PGRST116') {
        console.error('Error fetching POS data:', posError);
        return;
      }

      const posData = posDataArray?.[0];

      if (posData) {
        const amount = Number(posData.amount_bs) || 0;
        setCurrentAmount(amount);
        setHasEntry(true);
        form.setValue('amount_bs', amount);
      } else {
        setCurrentAmount(0);
        setHasEntry(false);
        form.setValue('amount_bs', 0);
      }
    } catch (error) {
      console.error('Error fetching POS data:', error);
    }
  };

  const onSubmit = async (data: POSForm) => {
    if (!user || !selectedAgency || !selectedDate) return;

    setLoading(true);
    try {
      const dateStr = formatDateForDB(selectedDate);

      if (hasEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('point_of_sale')
          .update({
            amount_bs: data.amount_bs,
          })
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('point_of_sale')
          .insert({
            agency_id: selectedAgency,
            transaction_date: dateStr,
            amount_bs: data.amount_bs,
            session_id: null, // Encargada doesn't use sessions
          });

        if (error) throw error;
        setHasEntry(true);
      }

      setCurrentAmount(data.amount_bs);

      toast({
        title: 'Éxito',
        description: 'Punto de venta actualizado correctamente',
      });

      onSuccess?.();
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
        <CardTitle>Punto de Venta - {format(selectedDate, 'dd/MM/yyyy')}</CardTitle>
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