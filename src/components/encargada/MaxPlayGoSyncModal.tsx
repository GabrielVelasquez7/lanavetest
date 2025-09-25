import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MaxPlayGoSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyId: string;
  agencyName: string;
  targetDate: string; // Format: DD-MM-YYYY
  onSuccess: () => void;
}

export function MaxPlayGoSyncModal({ 
  isOpen, 
  onClose, 
  agencyId, 
  agencyName, 
  targetDate, 
  onSuccess 
}: MaxPlayGoSyncModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('sync-maxplaygo-agency', {
        body: {
          agency_id: agencyId,
          target_date: targetDate
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
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Sin datos disponibles',
          description: data?.error || 'No se encontraron datos para esta fecha en MaxPlayGo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error syncing MaxPlayGo:', error);
      toast({
        title: 'Error de sincronización',
        description: 'Ocurrió un error inesperado al sincronizar',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
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
            Sincronizaremos los datos de MaxPlayGo solo para el sistema MAXPLAY en todas las agencias activas para la fecha seleccionada.
          </DialogDescription>
          <div className="text-sm text-muted-foreground">
            <p><strong>Fecha:</strong> {targetDate}</p>
          </div>
        </DialogHeader>

        <DialogFooter className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
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
