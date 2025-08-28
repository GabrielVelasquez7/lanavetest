import { getTodayVenezuela } from '@/lib/dateUtils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUpRight, Plus, Minus, Save } from 'lucide-react';

interface PagoPagado {
  id: string;
  amount_bs: string;
  reference_number: string;
  description: string;
}

interface PagoMovilPagadosProps {
  onSuccess?: () => void;
}

export const PagoMovilPagados = ({ onSuccess }: PagoMovilPagadosProps) => {
  const [loading, setLoading] = useState(false);
  const [pagos, setPagos] = useState<PagoPagado[]>([
    { id: '1', amount_bs: '', reference_number: '', description: '' }
  ]);
  const { user } = useAuth();
  const { toast } = useToast();

  const addPago = () => {
    setPagos(prev => [...prev, { 
      id: Date.now().toString(), 
      amount_bs: '', 
      reference_number: '', 
      description: '' 
    }]);
  };

  const removePago = (id: string) => {
    if (pagos.length > 1) {
      setPagos(prev => prev.filter(p => p.id !== id));
    }
  };

  const updatePago = (id: string, field: keyof PagoPagado, value: string) => {
    setPagos(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const onSubmit = async () => {
    if (!user) return;

    // Validate all fields
    const validPagos = pagos.filter(p => 
      p.amount_bs && p.reference_number && parseFloat(p.amount_bs.replace(',', '.')) > 0
    );

    if (validPagos.length === 0) {
      toast({
        title: 'Error',
        description: 'Debes agregar al menos un pago válido',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // First, ensure we have a daily session for today
      const today = getTodayVenezuela();
      
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

      // Prepare payments for insertion (negative amounts for paid out)
      const paymentsToInsert = validPagos.map(pago => ({
        session_id: session.id,
        amount_bs: -Math.abs(parseFloat(pago.amount_bs.replace(',', '.'))),
        reference_number: pago.reference_number,
        description: pago.description ? `[PAGADO] ${pago.description}` : '[PAGADO]',
      }));

      // Insert all payments
      const { error } = await supabase
        .from('mobile_payments')
        .insert(paymentsToInsert);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: `${validPagos.length} pago${validPagos.length > 1 ? 's' : ''} móvil${validPagos.length > 1 ? 'es' : ''} pagado${validPagos.length > 1 ? 's' : ''} registrado${validPagos.length > 1 ? 's' : ''} correctamente`,
      });

      // Reset form
      setPagos([{ id: '1', amount_bs: '', reference_number: '', description: '' }]);
      
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar los pagos móviles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add button */}
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Pagos Móviles Pagados</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPago}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar Pago
        </Button>
      </div>

      {/* Payment forms */}
      <div className="space-y-4">
        {pagos.map((pago, index) => (
          <Card key={pago.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Pago {index + 1}</CardTitle>
                {pagos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePago(pago.id)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Monto (Bs)</Label>
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={pago.amount_bs}
                    onChange={(e) => updatePago(pago.id, 'amount_bs', e.target.value)}
                    onBlur={(e) => {
                      const cleanValue = e.target.value.replace(/[^\d,]/g, '');
                      const numValue = parseFloat(cleanValue.replace(',', '.')) || 0;
                      const formatted = numValue > 0 ? numValue.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) : '';
                      updatePago(pago.id, 'amount_bs', formatted);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input
                    placeholder="987654321"
                    value={pago.reference_number}
                    onChange={(e) => updatePago(pago.id, 'reference_number', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    placeholder="Premio, cliente..."
                    value={pago.description}
                    onChange={(e) => updatePago(pago.id, 'description', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit button */}
      <Button onClick={onSubmit} disabled={loading} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {loading ? 'Registrando...' : `Registrar ${pagos.length} Pago${pagos.length > 1 ? 's' : ''} Pagado${pagos.length > 1 ? 's' : ''}`}
      </Button>
    </div>
  );
};