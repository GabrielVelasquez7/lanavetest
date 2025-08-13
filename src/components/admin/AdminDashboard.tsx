import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AgenciesCrud } from "./AgenciesCrud";
import { UsersCrud } from "./UsersCrud";
import { SystemsCrud } from "./SystemsCrud";
import { AdminCuadresView } from "./AdminCuadresView";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminView = 'agencies' | 'users' | 'systems' | 'cuadres' | 'dashboard';

export const AdminDashboard = () => {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'agencies':
        return <AgenciesCrud />;
      case 'users':
        return <UsersCrud />;
      case 'systems':
        return <SystemsCrud />;
      case 'cuadres':
        return <AdminCuadresView />;
      default:
        return (
          <div className="p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Panel de Administración</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card 
                className="p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
                onClick={() => setCurrentView('agencies')}
              >
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-primary">Agencias</h3>
                <p className="text-sm sm:text-base text-muted-foreground">Gestionar agencias del sistema</p>
              </Card>
              <Card 
                className="p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
                onClick={() => setCurrentView('users')}
              >
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-primary">Usuarios</h3>
                <p className="text-sm sm:text-base text-muted-foreground">Administrar taquilleros y roles</p>
              </Card>
              <Card 
                className="p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
                onClick={() => setCurrentView('systems')}
              >
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-primary">Sistemas</h3>
                <p className="text-sm sm:text-base text-muted-foreground">Configurar sistemas de lotería</p>
              </Card>
              <Card 
                className="p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
                onClick={() => setCurrentView('cuadres')}
              >
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-primary">Cuadres</h3>
                <p className="text-sm sm:text-base text-muted-foreground">Ver cuadres del sistema</p>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Header móvil con trigger del sidebar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-12 bg-background border-b flex items-center px-4 lg:hidden">
          <SidebarTrigger className="mr-3">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <h1 className="text-lg font-semibold text-foreground">Panel Admin</h1>
        </div>

        <AdminSidebar currentView={currentView} onViewChange={setCurrentView} />
        
        <main className="flex-1 bg-gradient-subtle pt-12 lg:pt-0">
          {renderContent()}
        </main>
      </div>
    </SidebarProvider>
  );
};