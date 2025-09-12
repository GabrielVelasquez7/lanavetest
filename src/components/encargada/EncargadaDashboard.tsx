import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AllTaquillerasCuadresOptimized } from './AllTaquillerasCuadresOptimized';

export const EncargadaDashboard = () => {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">Sistema de Supervisión</h1>
            <p className="text-primary-foreground/80">
              Bienvenida, {profile?.full_name} - {profile?.role}
            </p>
          </div>
          <Button variant="secondary" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <AllTaquillerasCuadresOptimized />
      </main>
    </div>
  );
};