import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SalesForm } from './SalesForm';
import { PrizesForm } from './PrizesForm';
import { ExpensesForm } from './ExpensesForm';
import { DailySummary } from './DailySummary';

export const TaquilleraDashboard = () => {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState('sales');

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sistema de Loterías</h1>
              <p className="text-muted-foreground">Panel Taquillera</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Bienvenido, {user?.email}
              </span>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          {/* Daily Summary */}
          <DailySummary />

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sales">Ventas</TabsTrigger>
              <TabsTrigger value="prizes">Premios</TabsTrigger>
              <TabsTrigger value="expenses">Gastos</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Registrar Ventas
                  </CardTitle>
                  <CardDescription>
                    Ingresa las ventas por sistema de lotería
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SalesForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prizes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Registrar Premios
                  </CardTitle>
                  <CardDescription>
                    Ingresa los premios pagados por sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PrizesForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Registrar Gastos
                  </CardTitle>
                  <CardDescription>
                    Ingresa gastos operativos y otros
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpensesForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};