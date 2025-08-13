import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LotterySystem {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export const SystemsCrud = () => {
  const [systems, setSystems] = useState<LotterySystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<LotterySystem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    is_active: true
  });
  const { toast } = useToast();

  const fetchSystems = async () => {
    try {
      const { data, error } = await supabase
        .from('lottery_systems')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSystems(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los sistemas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSystem) {
        const { error } = await supabase
          .from('lottery_systems')
          .update(formData)
          .eq('id', editingSystem.id);
        
        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Sistema actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('lottery_systems')
          .insert(formData);
        
        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Sistema creado correctamente",
        });
      }
      
      fetchSystems();
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el sistema",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (system: LotterySystem) => {
    setEditingSystem(system);
    setFormData({
      name: system.name,
      code: system.code,
      is_active: system.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este sistema?')) return;
    
    try {
      const { error } = await supabase
        .from('lottery_systems')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Sistema eliminado correctamente",
      });
      
      fetchSystems();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el sistema",
        variant: "destructive",
      });
    }
  };

  const toggleSystemStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('lottery_systems')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: `Sistema ${!currentStatus ? 'activado' : 'desactivado'} correctamente`,
      });
      
      fetchSystems();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del sistema",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      is_active: true
    });
    setEditingSystem(null);
    setIsDialogOpen(false);
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Gestión de Sistemas</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Sistema
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingSystem ? 'Editar Sistema' : 'Nuevo Sistema'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="ej. Triple Caracas"
                />
              </div>
              <div>
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="ej. TRC"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Activo</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSystem ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Sistemas de Lotería</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systems.map((system) => (
                <TableRow key={system.id}>
                  <TableCell className="font-medium">{system.name}</TableCell>
                  <TableCell className="font-mono">{system.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        system.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {system.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <Switch
                        checked={system.is_active}
                        onCheckedChange={() => toggleSystemStatus(system.id, system.is_active)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(system)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(system.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};