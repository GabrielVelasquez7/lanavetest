import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Client {
  id: string;
  name: string;
  group_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AgencyGroup {
  id: string;
  name: string;
}

export function ClientsCrud() {
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<AgencyGroup[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    group_id: "",
    is_active: true,
  });

  useEffect(() => {
    fetchClients();
    fetchGroups();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Error al cargar clientes");
      return;
    }

    setClients(data || []);
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("agency_groups")
      .select("id, name")
      .order("name");

    if (error) {
      toast.error("Error al cargar grupos");
      return;
    }

    setGroups(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }

    const clientData = {
      name: formData.name.trim(),
      group_id: formData.group_id || null,
      is_active: formData.is_active,
    };

    if (editingClient) {
      const { error } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", editingClient.id);

      if (error) {
        toast.error("Error al actualizar cliente");
        return;
      }

      toast.success("Cliente actualizado correctamente");
    } else {
      const { error } = await supabase
        .from("clients")
        .insert([clientData]);

      if (error) {
        toast.error("Error al crear cliente");
        return;
      }

      toast.success("Cliente creado correctamente");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchClients();
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      group_id: client.group_id || "",
      is_active: client.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      return;
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error al eliminar cliente");
      return;
    }

    toast.success("Cliente eliminado correctamente");
    fetchClients();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      group_id: "",
      is_active: true,
    });
    setEditingClient(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return "Sin grupo";
    const group = groups.find(g => g.id === groupId);
    return group?.name || "Sin grupo";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Gestión de Clientes</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del cliente"
                  required
                />
              </div>

              <div>
                <Label htmlFor="group">Grupo</Label>
                <Select
                  value={formData.group_id}
                  onValueChange={(value) => setFormData({ ...formData, group_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar grupo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin grupo</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Activo</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingClient ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{getGroupName(client.group_id)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      client.is_active 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}>
                      {client.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(client)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay clientes registrados
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
