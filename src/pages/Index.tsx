import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { TaquilleraDashboard } from '@/components/taquillera/TaquilleraDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <TaquilleraDashboard />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Sistema de Loterías</CardTitle>
          <CardDescription>Gestión de cuadres y ventas</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            Accede al sistema para gestionar ventas, premios y gastos de loterías
          </p>
          <Button asChild className="w-full">
            <a href="/auth">
              <LogIn className="w-4 h-4 mr-2" />
              Iniciar Sesión
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
