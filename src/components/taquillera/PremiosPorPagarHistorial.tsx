import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { formatDateForDB } from '@/lib/dateUtils';
import { Edit2, Save, X, Trash2, Gift, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PendingPrize {
  id: string;
  amount_bs: number;
  description: string | null;
  is_paid: boolean;
  created_at: string;
}

interface PremiosPorPagarHistorialProps {
  refreshKey?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export const PremiosPorPagarHistorial = ({ refreshKey = 0, dateRange }: PremiosPorPagarHistorialProps) => {
  const [premios, setPremios] = useState<PendingPrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ amount_bs: '', description: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [premioToDelete, setPremioToDelete] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && dateRange) {
      fetchPremios();
    }
  }, [user, dateRange, refreshKey]);

  const fetchPremios = async () => {
    if (!user || !dateRange) return;

    try {
      setLoading(true);
      
      const fromDate = formatDateForDB(dateRange.from);
      const toDate = formatDateForDB(dateRange.to);

      // Get sessions for the date range
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select('id')
        .eq('user_id', user.id)
        .gte('session_date', fromDate)
        .lte('session_date', toDate);

      if (sessionsError) throw sessionsError;

      const sessionIds = sessions?.map(s => s.id) || [];

      if (sessionIds.length === 0) {
        setPremios([]);
        return;
      }

      // Get pending prizes for these sessions
      const { data, error } = await supabase
        .from('pending_prizes')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPremios(data || []);
    } catch (error: any) {
      console.error('Error fetching premios:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los premios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (premio: PendingPrize) => {
    setEditingId(premio.id);
    setEditForm({
      amount_bs: premio.amount_bs.toString(),
      description: premio.description || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ amount_bs: '', description: '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('pending_prizes')
        .update({
          amount_bs: parseFloat(editForm.amount_bs),
          description: editForm.description,
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Premio actualizado correctamente',
      });

      setEditingId(null);
      fetchPremios();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el premio',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = (id: string) => {
    setPremioToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deletePremio = async () => {
    if (!premioToDelete) return;

    try {
      const { error } = await supabase
        .from('pending_prizes')
        .delete()
        .eq('id', premioToDelete);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Premio eliminado correctamente',
      });

      fetchPremios();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al eliminar el premio',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setPremioToDelete(null);
    }
  };

  const togglePaidStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pending_prizes')
        .update({ is_paid: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: `Premio marcado como ${!currentStatus ? 'pagado' : 'pendiente'}`,
      });

      fetchPremios();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Cargando premios...</p>
        </CardContent>
      </Card>
    );
  }

  if (premios.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No hay premios registrados para este período</p>
        </CardContent>
      </Card>
    );
  }

  const totalPending = premios
    .filter(p => !p.is_paid)
    .reduce((sum, p) => sum + Number(p.amount_bs), 0);
  
  const totalPaid = premios
    .filter(p => p.is_paid)
    .reduce((sum, p) => sum + Number(p.amount_bs), 0);

  return (
    <>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar premio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El premio será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deletePremio}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Historial de Premios
          <div className="flex gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Gift className="h-3 w-3" />
              Pendientes: {formatCurrency(totalPending)}
            </Badge>
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Pagados: {formatCurrency(totalPaid)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {premios.map((premio) => (
              <TableRow key={premio.id}>
                <TableCell>
                  <Badge 
                    variant={premio.is_paid ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => togglePaidStatus(premio.id, premio.is_paid)}
                  >
                    {premio.is_paid ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Pagado
                      </>
                    ) : (
                      <>
                        <Gift className="h-3 w-3 mr-1" />
                        Pendiente
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  {editingId === premio.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.amount_bs}
                      onChange={(e) => setEditForm(prev => ({ ...prev, amount_bs: e.target.value }))}
                      className="w-32"
                    />
                  ) : (
                    formatCurrency(Number(premio.amount_bs))
                  )}
                </TableCell>
                <TableCell>
                  {editingId === premio.id ? (
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="min-w-48"
                    />
                  ) : (
                    premio.description || '-'
                  )}
                </TableCell>
                <TableCell>
                  {new Date(premio.created_at).toLocaleDateString('es-VE')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {editingId === premio.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={saveEdit}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(premio)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmDelete(premio.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </>
  );
};