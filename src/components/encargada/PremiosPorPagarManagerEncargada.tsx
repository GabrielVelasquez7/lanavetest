import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, CheckCircle } from 'lucide-react';
import { PremiosPorPagar } from '../taquillera/PremiosPorPagar';
import { PremiosPorPagarHistorial } from '../taquillera/PremiosPorPagarHistorial';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PremiosPorPagarManagerEncargadaProps {
  onSuccess?: () => void;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export const PremiosPorPagarManagerEncargada = ({ onSuccess, dateRange }: PremiosPorPagarManagerEncargadaProps) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [refreshHistorial, setRefreshHistorial] = useState(0);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [agencies, setAgencies] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgencies();
  }, []);

  useEffect(() => {
    if (selectedAgency) {
      fetchUsers();
    }
  }, [selectedAgency]);

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

  const fetchUsers = async () => {
    if (!selectedAgency) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('agency_id', selectedAgency)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
      
      if (data && data.length > 0 && !selectedUser) {
        setSelectedUser(data[0].user_id);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    }
  };

  const handleSuccess = () => {
    onSuccess?.();
    setRefreshHistorial(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Selectores de agencia y usuario */}
      <Card>
        <CardHeader>
          <CardTitle>Selecciona Agencia y Taquillera</CardTitle>
          <CardDescription>
            Elige la agencia y taquillera para registrar premios por pagar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agencia</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Taquillera</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona taquillera" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Por Pagar
              </TabsTrigger>
              <TabsTrigger value="paid" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Pagados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-6">
              <PremiosPorPagar 
                mode="pending" 
                onSuccess={handleSuccess} 
                dateRange={dateRange}
                overrideUserId={selectedUser}
              />
            </TabsContent>

            <TabsContent value="paid" className="space-y-6">
              <PremiosPorPagar 
                mode="paid" 
                onSuccess={handleSuccess} 
                dateRange={dateRange}
                overrideUserId={selectedUser}
              />
            </TabsContent>
          </Tabs>

          {/* Historial de premios siempre visible */}
          <Card>
            <CardHeader>
              <CardTitle>Premios Registrados</CardTitle>
              <CardDescription>
                Revisa y edita los premios de la taquillera seleccionada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PremiosPorPagarHistorial 
                refreshKey={refreshHistorial} 
                dateRange={dateRange}
                overrideUserId={selectedUser}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
