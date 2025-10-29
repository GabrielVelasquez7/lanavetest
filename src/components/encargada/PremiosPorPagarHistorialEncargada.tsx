import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
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
  session_id: string;
  user_full_name?: string;
}

interface PremiosPorPagarHistorialEncargadaProps {
  refreshKey?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export const PremiosPorPagarHistorialEncargada = ({ refreshKey = 0, dateRange }: PremiosPorPagarHistorialEncargadaProps) => {
  const [premios, setPremios] = useState<PendingPrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ amount_bs: '', description: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [premioToDelete, setPremioToDelete] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [agencies, setAgencies] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgencies();
  }, []);

  useEffect(() => {
    if (selectedAgency && dateRange) {
      fetchPremios();
    }
  }, [selectedAgency, dateRange, refreshKey]);

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgencies(data || []);
      
      if (data && data.length > 0 && !selectedAgency) {
        setSelectedAgency(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching agencies:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las agencias',
        variant: 'destructive',
      });
    }
  };

  const fetchPremios = async () => {
    if (!selectedAgency || !dateRange) return;

    try {
      setLoading(true);
      
      const fromDate = formatDateForDB(dateRange.from);
      const toDate = formatDateForDB(dateRange.to);

      // Get users from selected agency
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('agency_id', selectedAgency)
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      const userIds = profiles?.map(p => p.user_id) || [];

      if (userIds.length === 0) {
        setPremios([]);
        return;
      }

      // Get sessions for the date range and users
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select('id')
        .in('user_id', userIds)
        .gte('session_date', fromDate)
        .lte('session_date', toDate);

      if (sessionsError) throw sessionsError;

      const sessionIds = sessions?.map(s => s.id) || [];

      if (sessionIds.length === 0) {
        setPremios([]);
        return;
      }

      // Get pending prizes for these sessions
      const { data: pendingPrizesData, error } = await supabase
        .from('pending_prizes')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user info for each prize
      const prizesWithUserInfo = await Promise.all(
        (pendingPrizesData || []).map(async (prize) => {
          const { data: sessionData } = await supabase
            .from('daily_sessions')
            .select('user_id')
            .eq('id', prize.session_id)
            .single();

          if (sessionData) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', sessionData.user_id)
              .single();

            return {
              ...prize,
              user_full_name: profileData?.full_name || 'N/A'
            };
          }

          return {
            ...prize,
            user_full_name: 'N/A'
          };
        })
      );

      setPremios(prizesWithUserInfo);
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
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="flex items-center justify-between flex-1">
              Historial de Premios
              <div className="flex gap-4 ml-4">
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
            <div className="w-full md:w-64">
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona agencia" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {premios.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No hay premios registrados para este período
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Taquillera</TableHead>
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
                    <TableCell className="font-medium">
                      {premio.user_full_name || 'N/A'}
                    </TableCell>
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
          )}
        </CardContent>
      </Card>
    </>
  );
};
