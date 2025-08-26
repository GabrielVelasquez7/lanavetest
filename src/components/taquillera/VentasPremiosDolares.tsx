import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { VentasPremiosForm, SystemEntry } from './VentasPremiosManager';

interface LotterySystem {
  id: string;
  name: string;
  code: string;
}

interface VentasPremiosDolaresProps {
  form: UseFormReturn<VentasPremiosForm>;
  lotteryOptions: LotterySystem[];
}

export const VentasPremiosDolares = ({ form, lotteryOptions }: VentasPremiosDolaresProps) => {
  const formatNumberForDisplay = (value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseInputValue = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const cleanValue = value.replace(/[^\d.,]/g, '');
    const normalizedValue = cleanValue.replace(',', '.');
    const num = parseFloat(normalizedValue);
    return isNaN(num) ? 0 : num;
  };

  const handleNumberInput = (index: number, field: 'sales_usd' | 'prizes_usd', value: string) => {
    const numValue = parseInputValue(value);
    form.setValue(`systems.${index}.${field}`, numValue);
  };

  const systems = form.watch('systems');

  const calculateTotals = () => {
    return systems.reduce(
      (acc, system) => ({
        sales_usd: acc.sales_usd + (system.sales_usd || 0),
        prizes_usd: acc.prizes_usd + (system.prizes_usd || 0),
      }),
      { sales_usd: 0, prizes_usd: 0 }
    );
  };

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas y Premios en Dólares</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
            <div>Sistema</div>
            <div className="text-center">Ventas USD</div>
            <div className="text-center">Premios USD</div>
            <div className="text-center">Cuadre USD</div>
          </div>

          {systems.map((system, index) => {
            const systemCuadre = (system.sales_usd || 0) - (system.prizes_usd || 0);
            
            return (
              <div key={system.lottery_system_id} className="grid grid-cols-4 gap-2 items-center">
                <div className="font-medium text-sm">
                  {system.lottery_system_name}
                </div>
                
                <Input
                  type="text"
                  placeholder="0.00"
                  defaultValue={formatNumberForDisplay(system.sales_usd)}
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
                  placeholder="0.00"
                  defaultValue={formatNumberForDisplay(system.prizes_usd)}
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
                  {formatCurrency(systemCuadre, 'USD')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totales para Dólares */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(totals.sales_usd, 'USD')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Premios</p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(totals.prizes_usd, 'USD')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cuadre Total</p>
                <p className={`text-xl font-bold ${(totals.sales_usd - totals.prizes_usd) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(totals.sales_usd - totals.prizes_usd, 'USD')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};