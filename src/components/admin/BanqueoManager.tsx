import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

export function BanqueoManager() {
  const [transactions, setTransactions] = useState<BanqueoTransaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BanqueoTransaction | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    week_start_date: "",
    week_end_date: "",
    sales_bs: "",
    sales_usd: "",
    prizes_bs: "",
    prizes_usd: "",
  });

  useEffect(() => {
    fetchTransactions();
    fetchClients();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("banqueo_transactions")
        .select(`
          *,
          clients (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast.error("Error al cargar transacciones: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error("Error al cargar clientes: " + error.message);
    }
  };

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
          .from("banqueo_transactions")
          .update(transactionData)
          .eq("id", editingTransaction.id);

        if (error) throw error;
        toast.success("Transacción actualizada exitosamente");
      } else {
        const { error } = await supabase
          .from("banqueo_transactions")
          .insert([transactionData]);

        if (error) throw error;
        toast.success("Transacción creada exitosamente");
      }

      setDialogOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error: any) {
      toast.error("Error al guardar transacción: " + error.message);
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
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta transacción?")) return;

    try {
      const { error } = await supabase
        .from("banqueo_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Transacción eliminada exitosamente");
      fetchTransactions();
    } catch (error: any) {
      toast.error("Error al eliminar transacción: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      week_start_date: "",
      week_end_date: "",
      sales_bs: "",
      sales_usd: "",
      prizes_bs: "",
      prizes_usd: "",
    });
    setEditingTransaction(null);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Banqueo</h2>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? "Editar Transacción" : "Nueva Transacción"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="client">Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, client_id: value })
                  }
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
                <div>
                  <Label htmlFor="week_start_date">Fecha Inicio Semana</Label>
                  <Input
                    id="week_start_date"
                    type="date"
                    value={formData.week_start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, week_start_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="week_end_date">Fecha Fin Semana</Label>
                  <Input
                    id="week_end_date"
                    type="date"
                    value={formData.week_end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, week_end_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sales_bs">Ventas (Bs)</Label>
                  <Input
                    id="sales_bs"
                    type="number"
                    step="0.01"
                    value={formData.sales_bs}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_bs: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sales_usd">Ventas (USD)</Label>
                  <Input
                    id="sales_usd"
                    type="number"
                    step="0.01"
                    value={formData.sales_usd}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_usd: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prizes_bs">Premios (Bs)</Label>
                  <Input
                    id="prizes_bs"
                    type="number"
                    step="0.01"
                    value={formData.prizes_bs}
                    onChange={(e) =>
                      setFormData({ ...formData, prizes_bs: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prizes_usd">Premios (USD)</Label>
                  <Input
                    id="prizes_usd"
                    type="number"
                    step="0.01"
                    value={formData.prizes_usd}
                    onChange={(e) =>
                      setFormData({ ...formData, prizes_usd: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
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
                  {format(new Date(transaction.week_start_date), "dd/MM/yyyy", {
                    locale: es,
                  })}{" "}
                  -{" "}
                  {format(new Date(transaction.week_end_date), "dd/MM/yyyy", {
                    locale: es,
                  })}
                </TableCell>
                <TableCell>{formatCurrency(transaction.sales_bs, "VES")}</TableCell>
                <TableCell>{formatCurrency(transaction.sales_usd, "USD")}</TableCell>
                <TableCell>{formatCurrency(transaction.prizes_bs, "VES")}</TableCell>
                <TableCell>{formatCurrency(transaction.prizes_usd, "USD")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(transaction)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
