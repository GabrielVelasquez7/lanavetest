import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, CheckCircle } from 'lucide-react';
import { PremiosPorPagarEncargada } from './PremiosPorPagarEncargada';
import { PremiosPorPagarHistorialEncargada } from './PremiosPorPagarHistorialEncargada';

interface PremiosPorPagarManagerEncargadaProps {
  onSuccess?: () => void;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export const PremiosPorPagarManagerEncargada = ({ onSuccess, dateRange }: PremiosPorPagarManagerEncargadaProps) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [refreshHistorial, setRefreshHistorial] = useState(0);

  const handleSuccess = () => {
    onSuccess?.();
    setRefreshHistorial(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Por Pagar
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Pagados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <PremiosPorPagarEncargada 
            mode="pending" 
            onSuccess={handleSuccess} 
            dateRange={dateRange}
          />
        </TabsContent>

        <TabsContent value="paid" className="space-y-6">
          <PremiosPorPagarEncargada 
            mode="paid" 
            onSuccess={handleSuccess} 
            dateRange={dateRange}
          />
        </TabsContent>
      </Tabs>

      {/* Historial de premios siempre visible */}
      <Card>
        <CardHeader>
          <CardTitle>Premios Registrados</CardTitle>
          <CardDescription>
            Revisa y edita los premios por agencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PremiosPorPagarHistorialEncargada 
            refreshKey={refreshHistorial} 
            dateRange={dateRange} 
          />
        </CardContent>
      </Card>
    </div>
  );
};
