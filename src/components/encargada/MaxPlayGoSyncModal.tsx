import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [credentials, setCredentials] = useState({
    usuario: '',
    clave: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.usuario || !credentials.clave) {
      toast({
        title: "Error",
        description: "Por favor ingresa las credenciales de MaxPlayGo",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('sync-maxplaygo-agency', {
        body: {
          agency_id: agencyId,
          credentials: credentials,
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
        // Clear credentials for security
        setCredentials({ usuario: '', clave: '' });
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
      setCredentials({ usuario: '', clave: '' });
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
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usuario">Usuario MaxPlayGo</Label>
            <Input
              id="usuario"
              type="text"
              value={credentials.usuario}
              onChange={(e) => setCredentials(prev => ({ ...prev, usuario: e.target.value }))}
              placeholder="BANCA LA"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="clave">Contraseña</Label>
            <Input
              id="clave"
              type="password"
              value={credentials.clave}
              onChange={(e) => setCredentials(prev => ({ ...prev, clave: e.target.value }))}
              placeholder="••••••"
              disabled={isLoading}
              required
            />
          </div>

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
            <Button type="submit" disabled={isLoading}>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}