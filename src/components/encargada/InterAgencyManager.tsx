import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterAgencyLoansForm } from "./InterAgencyLoansForm";
import { InterAgencyLoansHistory } from "./InterAgencyLoansHistory";
import { InterAgencyDebtsView } from "./InterAgencyDebtsView";

interface InterAgencyManagerProps {
  onSuccess?: () => void;
}

export function InterAgencyManager({ onSuccess }: InterAgencyManagerProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    onSuccess?.();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="register" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register">Registrar Préstamo</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="debts">Deudas</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <InterAgencyLoansForm onSuccess={handleSuccess} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <InterAgencyLoansHistory refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="debts" className="space-y-4">
          <InterAgencyDebtsView refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
}