import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MaxPlayGoSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyId: string;
  agencyName: string;
  targetDate: string; // Format: DD-MM-YYYY
  onSuccess: (agencyResults?: Array<{name: string, system: string, sales: number, prizes: number}>) => void;
}

// Mock data para testing (formato: [nombre_agencia, ventas, premios])
const MOCK_FIGURAS_DATA: Array<[string, string, string]> = [
  ["NAVE AV SUCRE PC", "36.950,00", "57.600,00"],
  ["NAVE BARALT PC", "22.715,00", "19.250,00"],
  ["NAVE CANDELARIA PC", "1.000,00", "0,00"],
  ["NAVE CEMENTERIO PC", "21.320,00", "19.650,00"],
  ["NAVE PANTEON 2 PC", "5.040,00", "7.800,00"],
  ["NAVE PARQUE CENTRAL PC", "8.050,00", "0,00"],
  ["NAVE VICTORIA 1 PC", "2.940,00", "0,00"],
  ["NAVE VICTORIA 2 PC", "1.680,00", "0,00"]
];

const MOCK_LOTERIAS_DATA: Array<[string, string, string]> = [
  ["NAVE AV SUCRE PC", "15.200,00", "8.400,00"],
  ["NAVE BARALT PC", "11.350,00", "5.100,00"],
  ["NAVE CANDELARIA PC", "2.500,00", "1.200,00"],
  ["NAVE CEMENTERIO PC", "9.800,00", "4.300,00"],
  ["NAVE PANTEON 2 PC", "3.200,00", "2.100,00"],
  ["NAVE PARQUE CENTRAL PC", "4.500,00", "1.800,00"],
  ["NAVE VICTORIA 1 PC", "1.800,00", "900,00"],
  ["NAVE VICTORIA 2 PC", "950,00", "450,00"]
];

export function MaxPlayGoSyncModal({ 
  isOpen, 
  onClose, 
  agencyId, 
  agencyName, 
  targetDate, 
  onSuccess 
}: MaxPlayGoSyncModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // NOTA: Este modal usa datos mock para testing
      // Para scraping real, usar el script Python: scripts/sync-maxplaygo.py
      const { data, error } = await supabase.functions.invoke('sync-maxplaygo-agency', {
        body: {
          target_date: targetDate,
          figuras_data: MOCK_FIGURAS_DATA,
          loterias_data: MOCK_LOTERIAS_DATA
        }
      });

      if (error) throw error;

      if (data?.success) {
        const agenciesCount = data?.data?.updatedAgenciesCount ?? 0;
        const agencyResults = data?.data?.agencyResults ?? [];
        const totalSales = agencyResults.reduce((sum, agency) => sum + agency.sales, 0);
        const totalPrizes = agencyResults.reduce((sum, agency) => sum + agency.prizes, 0);
        
        toast({
          title: 'Sincronización exitosa',
          description: `${agenciesCount} agencias actualizadas con datos específicos MAXPLAY: ${totalSales} Bs en ventas, ${totalPrizes} Bs en premios`,
        });

        setIsLoading(false);
        setIsUpdating(true);
        
        // Wait for UI update animation
        setTimeout(() => {
          onSuccess(agencyResults);
          onClose();
          setIsUpdating(false);
        }, 1000);
      } else {
        toast({
          title: 'Sin datos disponibles',
          description: data?.error || 'No se encontraron datos para esta fecha en MaxPlayGo',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error syncing MaxPlayGo:', error);
      toast({
        title: 'Error de sincronización',
        description: 'Ocurrió un error inesperado al sincronizar',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isUpdating) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sincronizar MaxPlayGo
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-2">
              <p>Sincronizaremos los datos de MaxPlayGo para MAXPLAY-figuras y MAXPLAY-loterias en todas las agencias activas.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                <p className="font-semibold text-amber-900">⚠️ Modo Testing</p>
                <p className="text-amber-800">Este modal usa datos mock. Para scraping real, usar:</p>
                <code className="block mt-1 bg-white px-2 py-1 rounded text-xs">python scripts/sync-maxplaygo.py --date {targetDate}</code>
              </div>
            </div>
          </DialogDescription>
          <div className="text-sm text-muted-foreground mt-4">
            <p><strong>Fecha:</strong> {targetDate}</p>
          </div>
        </DialogHeader>

        {isUpdating && (
          <div className="py-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Actualizando campos con los nuevos valores...</p>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading || isUpdating}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isUpdating}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
