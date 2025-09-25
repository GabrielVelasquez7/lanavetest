import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

      if (data.success) {
        toast({
          title: "Sincronización exitosa",
          description: `Datos actualizados para ${agencyName}: ${data.data.totalSales} Bs en ventas, ${data.data.totalPrizes} Bs en premios`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error syncing MaxPlayGo:', error);
      toast({
        title: "Error de sincronización",
        description: error instanceof Error ? error.message : 'Error al sincronizar con MaxPlayGo',
        variant: "destructive",
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
          <div className="text-sm text-muted-foreground">
            <p><strong>Agencia:</strong> {agencyName}</p>
            <p><strong>Fecha:</strong> {targetDate}</p>
            <p className="mt-2">Se actualizarán automáticamente los datos de ventas y premios desde MaxPlayGo.</p>
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