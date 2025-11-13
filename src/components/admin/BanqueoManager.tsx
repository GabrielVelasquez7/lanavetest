import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

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

export function BanqueoManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<BanqueoTransaction[]>([]);
  const [weekBounds, setWeekBounds] = useState<{ start: string; end: string } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<BanqueoTransaction | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    sales_bs: "",
    sales_usd: "",
    prizes_bs: "",
    prizes_usd: "",
  });

  useEffect(() => {
    fetchClients();
    fetchWeekBounds();
    fetchTransactions();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("Error al cargar clientes");
      return;
    }

    setClients(data || []);
  };

  const fetchWeekBounds = async () => {
    const { data, error } = await supabase
      .rpc("get_current_week_boundaries");

    if (error) {
      toast.error("Error al obtener fechas de la semana");
      return;
    }

    if (data && data.length > 0) {
      setWeekBounds({
        start: data[0].week_start,
        end: data[0].week_end,
      });
    }
  };

  const fetchTransactions = async () => {
    if (!weekBounds) return;

    const { data, error } = await supabase
      .from("banqueo_transactions")
      .select("*")
      .eq("week_start_date", weekBounds.start)
      .eq("week_end_date", weekBounds.end)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar transacciones");
      return;
    }

    setTransactions(data || []);
  };

  useEffect(() => {
    if (weekBounds) {
      fetchTransactions();
    }
  }, [weekBounds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id) {
      toast.error("Debe seleccionar un cliente");
      return;
    }

    if (!weekBounds) {
      toast.error("No se pudieron obtener las fechas de la semana");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuario no autenticado");
      return;
    }

    const transactionData = {
      client_id: formData.client_id,
      week_start_date: weekBounds.start,
      week_end_date: weekBounds.end,
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

      if (error) {
        toast.error("Error al actualizar transacción");
        return;
      }

      toast.success("Transacción actualizada correctamente");
    } else {
      const { error } = await supabase
        .from("banqueo_transactions")
        .insert([transactionData]);

      if (error) {
        toast.error("Error al crear transacción");
        return;
      }

      toast.success("Transacción creada correctamente");
    }

    resetForm();
    fetchTransactions();
  };

  const handleEdit = (transaction: BanqueoTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      client_id: transaction.client_id,
      sales_bs: transaction.sales_bs.toString(),
      sales_usd: transaction.sales_usd.toString(),
      prizes_bs: transaction.prizes_bs.toString(),
      prizes_usd: transaction.prizes_usd.toString(),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta transacción?")) {
      return;
    }

    const { error } = await supabase
      .from("banqueo_transactions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error al eliminar transacción");
      return;
    }

    toast.success("Transacción eliminada correctamente");
    fetchTransactions();
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      sales_bs: "",
      sales_usd: "",
      prizes_bs: "",
      prizes_usd: "",
    });
    setEditingTransaction(null);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Desconocido";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Gestión de Banqueo</h2>

      {weekBounds && (
        <Card>
          <CardHeader>
            <CardTitle>Semana Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">
              {format(new Date(weekBounds.start), "dd/MM/yyyy", { locale: es })} -{" "}
              {format(new Date(weekBounds.end), "dd/MM/yyyy", { locale: es })}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{editingTransaction ? "Editar Transacción" : "Nueva Transacción"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="client">Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sales_bs">Ventas Bs</Label>
                <Input
                  id="sales_bs"
                  type="number"
                  step="0.01"
                  value={formData.sales_bs}
                  onChange={(e) => setFormData({ ...formData, sales_bs: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="sales_usd">Ventas USD</Label>
                <Input
                  id="sales_usd"
                  type="number"
                  step="0.01"
                  value={formData.sales_usd}
                  onChange={(e) => setFormData({ ...formData, sales_usd: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="prizes_bs">Premios Bs</Label>
                <Input
                  id="prizes_bs"
                  type="number"
                  step="0.01"
                  value={formData.prizes_bs}
                  onChange={(e) => setFormData({ ...formData, prizes_bs: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="prizes_usd">Premios USD</Label>
                <Input
                  id="prizes_usd"
                  type="number"
                  step="0.01"
                  value={formData.prizes_usd}
                  onChange={(e) => setFormData({ ...formData, prizes_usd: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button type="submit">
                {editingTransaction ? "Actualizar" : "Guardar"}
              </Button>
              {editingTransaction && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones de la Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Ventas Bs</TableHead>
                <TableHead className="text-right">Ventas USD</TableHead>
                <TableHead className="text-right">Premios Bs</TableHead>
                <TableHead className="text-right">Premios USD</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{getClientName(transaction.client_id)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(transaction.sales_bs, 'VES')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(transaction.sales_usd, 'USD')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(transaction.prizes_bs, 'VES')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(transaction.prizes_usd, 'USD')}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay transacciones registradas para esta semana
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
