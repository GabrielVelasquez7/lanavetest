import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';
import { PremiosPorPagar } from '../taquillera/PremiosPorPagar';
import { PremiosPorPagarHistorial } from '../taquillera/PremiosPorPagarHistorial';

interface PremiosPorPagarManagerEncargadaProps {
  onSuccess?: () => void;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export const PremiosPorPagarManagerEncargada = ({ onSuccess, dateRange }: PremiosPorPagarManagerEncargadaProps) => {
  const [refreshHistorial, setRefreshHistorial] = useState(0);

  const handleSuccess = () => {
    onSuccess?.();
    setRefreshHistorial(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <PremiosPorPagar 
        mode="pending" 
        onSuccess={handleSuccess} 
        dateRange={dateRange}
      />
      
      {/* Historial de premios siempre visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Premios Registrados
          </CardTitle>
          <CardDescription>
            Revisa y edita los premios del día
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PremiosPorPagarHistorial 
            refreshKey={refreshHistorial} 
            dateRange={dateRange} 
          />
        </CardContent>
      </Card>
    </div>
  );
};
