import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BanqueoTransaction {
  id: string;
  client_id: string;
  week_start_date: string;
  week_end_date: string;
  sales_bs: number;
  sales_usd: number;
  prizes_bs: number;
  prizes_usd: number;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
}

export const BanqueoManager = () => {
  const [transactions, setTransactions] = useState<BanqueoTransaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BanqueoTransaction | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    week_start_date: '',
    week_end_date: '',
    sales_bs: '',
    sales_usd: '',
    prizes_bs: '',
    prizes_usd: '',
  });
  const { toast } = useToast();

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('banqueo_transactions')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las transacciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const transactionData = {
        client_id: formData.client_id,
        week_start_date: formData.week_start_date,
        week_end_date: formData.week_end_date,
        sales_bs: parseFloat(formData.sales_bs) || 0,
        sales_usd: parseFloat(formData.sales_usd) || 0,
        prizes_bs: parseFloat(formData.prizes_bs) || 0,
        prizes_usd: parseFloat(formData.prizes_usd) || 0,
        created_by: user.id,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('banqueo_transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);
        
        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Transacción actualizada correctamente",
        });
      } else {
        const { error } = await supabase
          .from('banqueo_transactions')
          .insert(transactionData);
        
        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Transacción creada correctamente",
        });
      }
      
      fetchTransactions();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la transacción",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transaction: BanqueoTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      client_id: transaction.client_id,
      week_start_date: transaction.week_start_date,
      week_end_date: transaction.week_end_date,
      sales_bs: transaction.sales_bs.toString(),
      sales_usd: transaction.sales_usd.toString(),
      prizes_bs: transaction.prizes_bs.toString(),
      prizes_usd: transaction.prizes_usd.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta transacción?')) return;
    
    try {
      const { error } = await supabase
        .from('banqueo_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Transacción eliminada correctamente",
      });
      
      fetchTransactions();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      week_start_date: '',
      week_end_date: '',
      sales_bs: '',
      sales_usd: '',
      prizes_bs: '',
      prizes_usd: '',
    });
    setEditingTransaction(null);
    setIsDialogOpen(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Gestión de Banqueo</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="week_start_date">Fecha Inicio Semana</Label>
                  <Input
                    id="week_start_date"
                    type="date"
                    value={formData.week_start_date}
                    onChange={(e) => setFormData({ ...formData, week_start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="week_end_date">Fecha Fin Semana</Label>
                  <Input
                    id="week_end_date"
                    type="date"
                    value={formData.week_end_date}
                    onChange={(e) => setFormData({ ...formData, week_end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sales_bs">Ventas (Bs)</Label>
                  <Input
                    id="sales_bs"
                    type="number"
                    step="0.01"
                    value={formData.sales_bs}
                    onChange={(e) => setFormData({ ...formData, sales_bs: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sales_usd">Ventas (USD)</Label>
                  <Input
                    id="sales_usd"
                    type="number"
                    step="0.01"
                    value={formData.sales_usd}
                    onChange={(e) => setFormData({ ...formData, sales_usd: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prizes_bs">Premios (Bs)</Label>
                  <Input
                    id="prizes_bs"
                    type="number"
                    step="0.01"
                    value={formData.prizes_bs}
                    onChange={(e) => setFormData({ ...formData, prizes_bs: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prizes_usd">Premios (USD)</Label>
                  <Input
                    id="prizes_usd"
                    type="number"
                    step="0.01"
                    value={formData.prizes_usd}
                    onChange={(e) => setFormData({ ...formData, prizes_usd: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTransaction ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Semana</TableHead>
              <TableHead>Ventas (Bs)</TableHead>
              <TableHead>Ventas (USD)</TableHead>
              <TableHead>Premios (Bs)</TableHead>
              <TableHead>Premios (USD)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction: any) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {transaction.clients?.name}
                </TableCell>
                <TableCell>
                  {format(new Date(transaction.week_start_date), 'dd/MM/yyyy', { locale: es })}
                  {' - '}
                  {format(new Date(transaction.week_end_date), 'dd/MM/yyyy', { locale: es })}
                </TableCell>
                <TableCell>{formatCurrency(transaction.sales_bs, 'VES')}</TableCell>
                <TableCell>{formatCurrency(transaction.sales_usd, 'USD')}</TableCell>
                <TableCell>{formatCurrency(transaction.prizes_bs, 'VES')}</TableCell>
                <TableCell>{formatCurrency(transaction.prizes_usd, 'USD')}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(transaction)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(transaction.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
