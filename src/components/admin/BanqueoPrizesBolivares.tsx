import { UseFormReturn } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { BanqueoForm, SystemEntry } from './BanqueoManager';

interface LotterySystem {
  id: string;
  name: string;
  code: string;
}

interface BanqueoPrizesBolivaresProps {
  form: UseFormReturn<BanqueoForm>;
  lotteryOptions: LotterySystem[];
}

export const BanqueoPrizesBolivares = ({ form, lotteryOptions }: BanqueoPrizesBolivaresProps) => {
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

  // Sincroniza los inputs cuando cambian los valores del formulario
  useEffect(() => {
    const newInputValues: Record<string, string> = {};
    systems.forEach((system) => {
      const id = system.lottery_system_id;
      const prizesKey = `${id}-prizes_bs`;

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

  const handleInputChange = (systemId: string, index: number, value: string) => {
    const key = `${systemId}-prizes_bs`;
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  const handleInputBlur = (systemId: string, index: number) => {
    const key = `${systemId}-prizes_bs`;
    const value = inputValues[key] || '';
    const numValue = parseInputValue(value);
    
    // Actualizar el formulario
    form.setValue(`systems.${index}.prizes_bs`, numValue, { shouldDirty: true, shouldValidate: false });
    
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
        prizes_bs: acc.prizes_bs + (system.prizes_bs || 0),
      }),
      { prizes_bs: 0 }
    );
  };

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Premios en Bolívares</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
            <div>Sistema</div>
            <div className="text-center">Premios Bs</div>
          </div>

          {normalSystems.map((system) => {
            const index = systems.findIndex(s => s.lottery_system_id === system.lottery_system_id);
            
            return (
              <div key={system.lottery_system_id} className="grid grid-cols-2 gap-2 items-center">
                <div className="font-medium text-sm">
                  {system.lottery_system_name}
                </div>
                
                <Input
                  type="text"
                  placeholder="0,00"
                  value={inputValues[`${system.lottery_system_id}-prizes_bs`] || ''}
                  onChange={(e) => handleInputChange(system.lottery_system_id, index, e.target.value)}
                  onBlur={() => handleInputBlur(system.lottery_system_id, index)}
                  className="text-center"
                />
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
              <div className="grid grid-cols-2 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Sistema</div>
                <div className="text-center">Premios Bs</div>
              </div>

              {parleySystems.map((system) => {
                const index = systems.findIndex(s => s.lottery_system_id === system.lottery_system_id);
                
                return (
                  <div key={system.lottery_system_id} className="grid grid-cols-2 gap-2 items-center">
                    <div className="font-medium text-sm">
                      {system.lottery_system_name}
                    </div>
                    
                    <Input
                      type="text"
                      placeholder="0,00"
                      value={inputValues[`${system.lottery_system_id}-prizes_bs`] || ''}
                      onChange={(e) => handleInputChange(system.lottery_system_id, index, e.target.value)}
                      onBlur={() => handleInputBlur(system.lottery_system_id, index)}
                      className="text-center"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Total de Premios */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Premios Bs</p>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(totals.prizes_bs, 'VES')}
              </p>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

