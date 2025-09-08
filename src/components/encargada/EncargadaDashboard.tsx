import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Users, Calendar } from "lucide-react";
import { AllTaquillerasCuadresOptimized } from "./AllTaquillerasCuadresOptimized";
import { VentasPremiosEncargada } from "./VentasPremiosEncargada";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function EncargadaDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, agencies(name)')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Encargada</h1>
          <p className="text-muted-foreground">
            {profile?.full_name} - {profile?.agencies?.name || 'Sin agencia asignada'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuadre por Agencias</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ventas/Premios</div>
            <p className="text-xs text-muted-foreground">
              Cuadre por agencia y sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervisión</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Taquilleras</div>
            <p className="text-xs text-muted-foreground">
              Monitoreo de cuadres
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fecha</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date().toLocaleDateString('es-VE')}
            </div>
            <p className="text-xs text-muted-foreground">
              Día de trabajo actual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="cuadre-agencias" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cuadre-agencias">Cuadre por Agencias</TabsTrigger>
          <TabsTrigger value="supervision">Supervisión Taquilleras</TabsTrigger>
        </TabsList>

        <TabsContent value="cuadre-agencias" className="space-y-4">
          <VentasPremiosEncargada />
        </TabsContent>

        <TabsContent value="supervision" className="space-y-4">
          <AllTaquillerasCuadresOptimized />
        </TabsContent>
      </Tabs>
    </div>
  );
}