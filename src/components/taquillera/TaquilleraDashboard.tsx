import { useState } from 'react';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, DollarSign, Gift, LogOut, Receipt, Smartphone, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SalesForm } from './SalesForm';
import { PrizesForm } from './PrizesForm';
import { ExpensesForm } from './ExpensesForm';
import { DailySummary } from './DailySummary';
import { MobilePaymentsForm } from './MobilePaymentsForm';
import { PointOfSaleForm } from './PointOfSaleForm';
import { BulkTransactionsForm } from './BulkTransactionsForm';
import { SystemCuadresView } from './SystemCuadresView';

export const TaquilleraDashboard = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('transacciones');
  const { refreshKey, triggerRefresh } = useDataRefresh();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">Sistema de Cuadres</h1>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="transacciones" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ventas/Premios
            </TabsTrigger>
            <TabsTrigger value="gastos" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Gastos
            </TabsTrigger>
            <TabsTrigger value="pago-movil" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Pago Móvil
            </TabsTrigger>
            <TabsTrigger value="punto-venta" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Punto Venta
            </TabsTrigger>
            <TabsTrigger value="cuadre-sistemas" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Por Sistema
            </TabsTrigger>
            <TabsTrigger value="cuadre-general" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Cuadre General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transacciones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Ventas y Premios</CardTitle>
                <CardDescription>
                  Registra ventas y premios de todos los sistemas de una vez
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkTransactionsForm onSuccess={triggerRefresh} />
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

          <TabsContent value="pago-movil" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pagos Móviles</CardTitle>
                <CardDescription>
                  Registra los pagos móviles recibidos en Bs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MobilePaymentsForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="punto-venta" className="space-y-6">
            <PointOfSaleForm />
          </TabsContent>

          <TabsContent value="cuadre-sistemas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cuadre por Sistema</CardTitle>
                <CardDescription>
                  Detalle del cuadre de cada sistema de lotería
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SystemCuadresView />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cuadre-general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cuadre General</CardTitle>
                <CardDescription>
                  Cuadre total y resumen financiero del día
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailySummary refreshKey={refreshKey} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};