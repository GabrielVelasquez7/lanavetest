import { UseFormReturn } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { VentasPremiosForm, SystemEntry } from './VentasPremiosManager';

interface LotterySystem {
  id: string;
  name: string;
  code: string;
}

interface VentasPremiosBolivaresProps {
  form: UseFormReturn<VentasPremiosForm>;
  lotteryOptions: LotterySystem[];
}

export const VentasPremiosBolivares = ({ form, lotteryOptions }: VentasPremiosBolivaresProps) => {
  const systems = form.watch('systems');
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar valores solo una vez al cargar los datos
  useEffect(() => {
    if (systems.length > 0 && !isInitialized) {
      const newInputValues: Record<string, string> = {};
      systems.forEach((system, index) => {
        const salesKey = `${index}-sales_bs`;
        const prizesKey = `${index}-prizes_bs`;
        
        newInputValues[salesKey] = system.sales_bs > 0 ? system.sales_bs.toLocaleString('es-VE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) : '';
        
        newInputValues[prizesKey] = system.prizes_bs > 0 ? system.prizes_bs.toLocaleString('es-VE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) : '';
      });
      
      setInputValues(newInputValues);
      setIsInitialized(true);
    }
  }, [systems, isInitialized]);

  const parseInputValue = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const cleanValue = value.replace(/[^\d.,]/g, '');
    const normalizedValue = cleanValue.replace(',', '.');
    const num = parseFloat(normalizedValue);
    return isNaN(num) ? 0 : num;
  };

  const handleInputChange = (index: number, field: 'sales_bs' | 'prizes_bs', value: string) => {
    const key = `${index}-${field}`;
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  const handleInputBlur = (index: number, field: 'sales_bs' | 'prizes_bs') => {
    const key = `${index}-${field}`;
    const value = inputValues[key] || '';
    const numValue = parseInputValue(value);
    
    // Actualizar el formulario
    form.setValue(`systems.${index}.${field}`, numValue);
    
    // Formatear el valor en el input solo si es mayor que 0
    const formattedValue = numValue > 0 ? numValue.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) : '';
    
    setInputValues(prev => ({ ...prev, [key]: formattedValue }));
  };

  const calculateTotals = () => {
    return systems.reduce(
      (acc, system) => ({
        sales_bs: acc.sales_bs + (system.sales_bs || 0),
        prizes_bs: acc.prizes_bs + (system.prizes_bs || 0),
      }),
      { sales_bs: 0, prizes_bs: 0 }
    );
  };

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas y Premios en Bolívares</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
            <div>Sistema</div>
            <div className="text-center">Ventas Bs</div>
            <div className="text-center">Premios Bs</div>
            <div className="text-center">Cuadre Bs</div>
          </div>

          {systems.map((system, index) => {
            const systemCuadre = (system.sales_bs || 0) - (system.prizes_bs || 0);
            
            return (
              <div key={system.lottery_system_id} className="grid grid-cols-4 gap-2 items-center">
                <div className="font-medium text-sm">
                  {system.lottery_system_name}
                </div>
                
                <Input
                  type="text"
                  placeholder="0,00"
                  value={inputValues[`${index}-sales_bs`] || ''}
                  onChange={(e) => handleInputChange(index, 'sales_bs', e.target.value)}
                  onBlur={() => handleInputBlur(index, 'sales_bs')}
                  className="text-center"
                />
                
                <Input
                  type="text"
                  placeholder="0,00"
                  value={inputValues[`${index}-prizes_bs`] || ''}
                  onChange={(e) => handleInputChange(index, 'prizes_bs', e.target.value)}
                  onBlur={() => handleInputBlur(index, 'prizes_bs')}
                  className="text-center"
                />
                
                <div className={`text-center font-medium ${systemCuadre >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(systemCuadre, 'VES')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totales para Bolívares */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(totals.sales_bs, 'VES')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Premios</p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(totals.prizes_bs, 'VES')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cuadre Total</p>
                <p className={`text-xl font-bold ${(totals.sales_bs - totals.prizes_bs) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(totals.sales_bs - totals.prizes_bs, 'VES')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};