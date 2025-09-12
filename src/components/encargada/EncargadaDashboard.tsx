import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calculator, Users, Calendar, LogOut } from "lucide-react";
import { AllTaquillerasCuadresOptimized } from "./AllTaquillerasCuadresOptimized";
import { VentasPremiosEncargada } from "./VentasPremiosEncargada";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function EncargadaDashboard() {
  const { user, signOut } = useAuth();
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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
   <div className="min-h-screen bg-muted/30">
  <header className="bg-primary border-b px-6 py-4">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary-foreground">
          Sistema de Cuadres - Encargada
        </h1>
        <p className="text-primary-foreground/80">
          Bienvenida, {profile?.full_name} -{" "}
          {profile?.agencies?.name || "Sin agencia asignada"}
        </p>
      </div>
      <Button variant="secondary" onClick={handleSignOut}>
        <LogOut className="h-4 w-4 mr-2" />
        Salir
      </Button>
    </div>
  </header>

  <main className="container mx-auto p-6">
    <div className="space-y-6">
      {/* Main Content */}
      <Tabs defaultValue="cuadre-agencias" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cuadre-agencias">
            Cuadre por Agencias
          </TabsTrigger>
          <TabsTrigger value="supervision">
            Supervisión Taquilleras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cuadre-agencias" className="space-y-4">
          <VentasPremiosEncargada />
        </TabsContent>

        <TabsContent value="supervision" className="space-y-4">
          <AllTaquillerasCuadresOptimized />
        </TabsContent>
      </Tabs>
    </div>
  </main>
</div>

  );
}