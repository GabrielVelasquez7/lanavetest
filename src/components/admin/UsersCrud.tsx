import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'taquillera' | 'supervisor' | 'administrador';
  agency_id: string | null;
  agency_name?: string;
  is_active: boolean;
  created_at: string;
}

interface Agency {
  id: string;
  name: string;
}

export const UsersCrud = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'taquillera' as 'admin' | 'taquillera' | 'supervisor' | 'administrador',
    agency_id: '',
    is_active: true
  });
  const { toast } = useToast();

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          agencies!profiles_agency_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const profilesWithAgencyName = data?.map(profile => ({
        ...profile,
        agency_name: profile.agencies?.name || null
      })) || [];
      
      setProfiles(profilesWithAgencyName);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    }
  };

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error('Error fetching agencies:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchProfiles(), fetchAgencies()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProfile) {
        const updateData = {
          full_name: formData.full_name,
          role: formData.role,
          agency_id: formData.agency_id || null,
          is_active: formData.is_active
        };

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingProfile.id);
        
        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Usuario actualizado correctamente",
        });
      }
      
      fetchProfiles();
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      full_name: profile.full_name,
      role: profile.role,
      agency_id: profile.agency_id || '',
      is_active: profile.is_active
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      role: 'taquillera',
      agency_id: '',
      is_active: true
    });
    setEditingProfile(null);
    setIsDialogOpen(false);
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
        {editingProfile && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Edit className="mr-2 h-4 w-4" />
                Editar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nombre Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol *</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: 'admin' | 'taquillera' | 'supervisor' | 'administrador') => 
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taquillera">Taquillera</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="administrador">Administrador</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="agency_id">Agencia</Label>
                  <Select 
                    value={formData.agency_id} 
                    onValueChange={(value) => setFormData({ ...formData, agency_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar agencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin agencia</SelectItem>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
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
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">Actualizar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.full_name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      profile.role === 'admin' 
                        ? 'bg-blue-100 text-blue-800' 
                        : profile.role === 'administrador' || profile.role === 'supervisor'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {profile.role === 'admin' ? 'Admin' : 
                       profile.role === 'administrador' ? 'Administrador' :
                       profile.role === 'supervisor' ? 'Supervisor' : 'Taquillera'}
                    </span>
                  </TableCell>
                  <TableCell>{profile.agency_name || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      profile.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {profile.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(profile)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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