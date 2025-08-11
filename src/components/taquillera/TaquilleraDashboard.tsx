import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, DollarSign, Gift, LogOut, Receipt } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SalesForm } from './SalesForm';
import { PrizesForm } from './PrizesForm';
import { ExpensesForm } from './ExpensesForm';
import { DailySummary } from './DailySummary';

export const TaquilleraDashboard = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('ventas');

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sistema de Cuadres</h1>
            <p className="text-muted-foreground">
              Bienvenida, {profile?.full_name} - {profile?.role}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ventas" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ventas
            </TabsTrigger>
            <TabsTrigger value="premios" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Premios
            </TabsTrigger>
            <TabsTrigger value="gastos" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Gastos
            </TabsTrigger>
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Resumen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ventas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Ventas</CardTitle>
                <CardDescription>
                  Registra las ventas de cada sistema de lotería
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SalesForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="premios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Premios</CardTitle>
                <CardDescription>
                  Registra los premios pagados por sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PrizesForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gastos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Gastos</CardTitle>
                <CardDescription>
                  Registra gastos operativos y deudas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExpensesForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resumen" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen Diario</CardTitle>
                <CardDescription>
                  Resumen de todas las transacciones del día
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailySummary />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};