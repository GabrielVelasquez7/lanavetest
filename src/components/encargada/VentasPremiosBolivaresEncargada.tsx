import { UseFormReturn } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { VentasPremiosForm, SystemEntry } from './VentasPremiosEncargada';

interface LotterySystem {
  id: string;
  name: string;
  code: string;
}

interface VentasPremiosBolivaresEncargadaProps {
  form: UseFormReturn<VentasPremiosForm>;
  lotteryOptions: LotterySystem[];
}

export const VentasPremiosBolivaresEncargada = ({ form, lotteryOptions }: VentasPremiosBolivaresEncargadaProps) => {
  const systems = form.watch('systems');
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Códigos de sistemas de Parley y Caballos
  const parleySystemCodes = [
    'INMEJORABLE-MULTIS-1', 'INMEJORABLE-MULTIS-2', 'INMEJORABLE-MULTIS-3', 'INMEJORABLE-MULTIS-4',
    'INMEJORABLE-5Y6', 'POLLA', 'MULTISPORT-CABALLOS-NAC', 'MULTISPORT-CABALLOS-INT', 'MULTISPORT-5Y6'
  ];

  // Filtrar sistemas normales y de parley
  const normalSystems = systems.filter(system => {
    const lotterySystem = lotteryOptions.find(l => l.id === system.lottery_system_id);
    return !lotterySystem || !parleySystemCodes.includes(lotterySystem.code);
  });

  const parleySystems = systems.filter(system => {
    const lotterySystem = lotteryOptions.find(l => l.id === system.lottery_system_id);
    return lotterySystem && parleySystemCodes.includes(lotterySystem.code);
  });

  // Sincroniza los inputs cuando cambian los valores del formulario (agencia/fecha/sync)
  useEffect(() => {
    const newInputValues: Record<string, string> = {};
    systems.forEach((system) => {
      const id = system.lottery_system_id;
      const salesKey = `${id}-sales_bs`;
      const prizesKey = `${id}-prizes_bs`;

      newInputValues[salesKey] = (system.sales_bs || 0) > 0
        ? (system.sales_bs as number).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';

      newInputValues[prizesKey] = (system.prizes_bs || 0) > 0
        ? (system.prizes_bs as number).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';
    });
    setInputValues(newInputValues);
  }, [systems]);

  const parseInputValue = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const cleanValue = value.replace(/[^\d.,]/g, '');
    const normalizedValue = cleanValue.replace(',', '.');
    const num = parseFloat(normalizedValue);
    return isNaN(num) ? 0 : num;
  };

  const handleInputChange = (systemId: string, index: number, field: 'sales_bs' | 'prizes_bs', value: string) => {
    const key = `${systemId}-${field}`;
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  const handleInputBlur = (systemId: string, index: number, field: 'sales_bs' | 'prizes_bs') => {
    const key = `${systemId}-${field}`;
    const value = inputValues[key] || '';
    const numValue = parseInputValue(value);
    
    // Actualizar el formulario
    form.setValue(`systems.${index}.${field}`, numValue, { shouldDirty: true, shouldValidate: false });
    
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

  const calculateNormalTotals = () => {
    return normalSystems.reduce(
      (acc, system) => ({
        sales_bs: acc.sales_bs + (system.sales_bs || 0),
        prizes_bs: acc.prizes_bs + (system.prizes_bs || 0),
      }),
      { sales_bs: 0, prizes_bs: 0 }
    );
  };

  const calculateParleyTotals = () => {
    return parleySystems.reduce(
      (acc, system) => ({
        sales_bs: acc.sales_bs + (system.sales_bs || 0),
        prizes_bs: acc.prizes_bs + (system.prizes_bs || 0),
      }),
      { sales_bs: 0, prizes_bs: 0 }
    );
  };

  const totals = calculateTotals();
  const normalTotals = calculateNormalTotals();
  const parleyTotals = calculateParleyTotals();

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

          {normalSystems.map((system) => {
            const systemCuadre = (system.sales_bs || 0) - (system.prizes_bs || 0);
            const index = systems.findIndex(s => s.lottery_system_id === system.lottery_system_id);
            
            return (
              <div key={system.lottery_system_id} className="grid grid-cols-4 gap-2 items-center">
                <div className="font-medium text-sm">
                  {system.lottery_system_name}
                </div>
                
                <Input
                  type="text"
                  placeholder="0,00"
                  value={inputValues[`${system.lottery_system_id}-sales_bs`] || ''}
                  onChange={(e) => handleInputChange(system.lottery_system_id, index, 'sales_bs', e.target.value)}
                  onBlur={() => handleInputBlur(system.lottery_system_id, index, 'sales_bs')}
                  className="text-center"
                />
                
                <Input
                  type="text"
                  placeholder="0,00"
                  value={inputValues[`${system.lottery_system_id}-prizes_bs`] || ''}
                  onChange={(e) => handleInputChange(system.lottery_system_id, index, 'prizes_bs', e.target.value)}
                  onBlur={() => handleInputBlur(system.lottery_system_id, index, 'prizes_bs')}
                  className="text-center"
                />
                
                <div className={`text-center font-medium ${systemCuadre >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(systemCuadre, 'VES')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sección de Parley y Caballos */}
        {parleySystems.length > 0 && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-3">
              <h3 className="text-lg font-semibold text-center">PARLEY Y CABALLOS</h3>
            </div>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Sistema</div>
                <div className="text-center">Ventas Bs</div>
                <div className="text-center">Premios Bs</div>
                <div className="text-center">Cuadre Bs</div>
              </div>

              {parleySystems.map((system) => {
                const systemCuadre = (system.sales_bs || 0) - (system.prizes_bs || 0);
                const index = systems.findIndex(s => s.lottery_system_id === system.lottery_system_id);
                
                return (
                  <div key={system.lottery_system_id} className="grid grid-cols-4 gap-2 items-center">
                    <div className="font-medium text-sm">
                      {system.lottery_system_name}
                    </div>
                    
                    <Input
                      type="text"
                      placeholder="0,00"
                      value={inputValues[`${system.lottery_system_id}-sales_bs`] || ''}
                      onChange={(e) => handleInputChange(system.lottery_system_id, index, 'sales_bs', e.target.value)}
                      onBlur={() => handleInputBlur(system.lottery_system_id, index, 'sales_bs')}
                      className="text-center"
                    />
                    
                    <Input
                      type="text"
                      placeholder="0,00"
                      value={inputValues[`${system.lottery_system_id}-prizes_bs`] || ''}
                      onChange={(e) => handleInputChange(system.lottery_system_id, index, 'prizes_bs', e.target.value)}
                      onBlur={() => handleInputBlur(system.lottery_system_id, index, 'prizes_bs')}
                      className="text-center"
                    />
                    
                    <div className={`text-center font-medium ${systemCuadre >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(systemCuadre, 'VES')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Totales Generales para Bolívares */}
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