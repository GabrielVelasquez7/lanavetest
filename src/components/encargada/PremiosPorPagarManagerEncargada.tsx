import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, CheckCircle } from 'lucide-react';
import { PremiosPorPagar } from '../taquillera/PremiosPorPagar';

interface PremiosPorPagarManagerEncargadaProps {
  onSuccess?: () => void;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export const PremiosPorPagarManagerEncargada = ({ onSuccess, dateRange }: PremiosPorPagarManagerEncargadaProps) => {
  const [activeTab, setActiveTab] = useState('pending');

  return (
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
        <PremiosPorPagar 
          mode="pending" 
          onSuccess={onSuccess} 
          dateRange={dateRange}
        />
      </TabsContent>

      <TabsContent value="paid" className="space-y-6">
        <PremiosPorPagar 
          mode="paid" 
          onSuccess={onSuccess} 
          dateRange={dateRange}
        />
      </TabsContent>
    </Tabs>
  );
};
