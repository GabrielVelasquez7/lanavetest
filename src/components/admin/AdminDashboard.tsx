import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AgenciesCrud } from "./AgenciesCrud";
import { UsersCrud } from "./UsersCrud";
import { SystemsCrud } from "./SystemsCrud";
import { useState } from "react";
import { Card } from "@/components/ui/card";

type AdminView = 'agencies' | 'users' | 'systems' | 'dashboard';

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
      default:
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-foreground mb-6">Panel de Administración</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card 
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
                onClick={() => setCurrentView('agencies')}
              >
                <h3 className="text-xl font-semibold mb-2 text-primary">Agencias</h3>
                <p className="text-muted-foreground">Gestionar agencias del sistema</p>
              </Card>
              <Card 
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
                onClick={() => setCurrentView('users')}
              >
                <h3 className="text-xl font-semibold mb-2 text-primary">Usuarios</h3>
                <p className="text-muted-foreground">Administrar taquilleros y roles</p>
              </Card>
              <Card 
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
                onClick={() => setCurrentView('systems')}
              >
                <h3 className="text-xl font-semibold mb-2 text-primary">Sistemas</h3>
                <p className="text-muted-foreground">Configurar sistemas de lotería</p>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1 bg-gradient-subtle">
          {renderContent()}
        </main>
      </div>
    </SidebarProvider>
  );
};