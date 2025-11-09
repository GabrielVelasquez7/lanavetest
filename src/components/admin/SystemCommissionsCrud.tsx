import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, X, Loader2, DollarSign, Percent, TrendingUp } from "lucide-react";

interface LotterySystem {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface CommissionRate {
  id?: string;
  lottery_system_id: string;
  commission_percentage: number;
  utility_percentage: number;
  commission_percentage_usd: number;
  utility_percentage_usd: number;
  is_active: boolean;
}

export function SystemCommissionsCrud() {
  const [systems, setSystems] = useState<LotterySystem[]>([]);
  const [commissions, setCommissions] = useState<Map<string, CommissionRate>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ 
    commission: string; 
    utility: string;
    commissionUsd: string;
    utilityUsd: string;
  }>({
    commission: "",
    utility: "",
    commissionUsd: "",
    utilityUsd: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch lottery systems (exclude parent systems with subcategories)
      const { data: systemsData, error: systemsError } = await supabase
        .from("lottery_systems")
        .select("id, name, code, is_active, has_subcategories")
        .order("name");

      if (systemsError) throw systemsError;

      // Fetch commission rates
      const { data: ratesData, error: ratesError } = await supabase
        .from("system_commission_rates")
        .select("*");

      if (ratesError) throw ratesError;

      // Filter out parent systems that have subcategories
      const filteredSystems = (systemsData || []).filter(system => !system.has_subcategories);
      setSystems(filteredSystems);

      const commissionsMap = new Map<string, CommissionRate>();
      ratesData?.forEach((rate) => {
        commissionsMap.set(rate.lottery_system_id, rate);
      });
      setCommissions(commissionsMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (systemId: string) => {
    const existing = commissions.get(systemId);
    setEditingId(systemId);
    setEditValues({
      commission: existing?.commission_percentage.toString() || "0",
      utility: existing?.utility_percentage.toString() || "0",
      commissionUsd: existing?.commission_percentage_usd.toString() || "0",
      utilityUsd: existing?.utility_percentage_usd.toString() || "0",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ commission: "", utility: "", commissionUsd: "", utilityUsd: "" });
  };

  const handleSave = async (systemId: string) => {
    const commission = parseFloat(editValues.commission);
    const utility = parseFloat(editValues.utility);
    const commissionUsd = parseFloat(editValues.commissionUsd);
    const utilityUsd = parseFloat(editValues.utilityUsd);

    if (isNaN(commission) || commission < 0 || commission > 100) {
      toast({
        title: "Error de validación",
        description: "El porcentaje de comisión Bs debe estar entre 0 y 100",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(utility) || utility < 0 || utility > 100) {
      toast({
        title: "Error de validación",
        description: "El porcentaje de utilidad Bs debe estar entre 0 y 100",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(commissionUsd) || commissionUsd < 0 || commissionUsd > 100) {
      toast({
        title: "Error de validación",
        description: "El porcentaje de comisión USD debe estar entre 0 y 100",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(utilityUsd) || utilityUsd < 0 || utilityUsd > 100) {
      toast({
        title: "Error de validación",
        description: "El porcentaje de utilidad USD debe estar entre 0 y 100",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const existing = commissions.get(systemId);

      if (existing?.id) {
        // Update existing
        const { error } = await supabase
          .from("system_commission_rates")
          .update({
            commission_percentage: commission,
            utility_percentage: utility,
            commission_percentage_usd: commissionUsd,
            utility_percentage_usd: utilityUsd,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("system_commission_rates")
          .insert({
            lottery_system_id: systemId,
            commission_percentage: commission,
            utility_percentage: utility,
            commission_percentage_usd: commissionUsd,
            utility_percentage_usd: utilityUsd,
            is_active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Éxito",
        description: "Comisión guardada correctamente",
      });

      await fetchData();
      handleCancel();
    } catch (error) {
      console.error("Error saving commission:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la comisión",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Percent className="h-8 w-8 text-primary" />
          Comisiones de Sistemas
        </h2>
        <p className="text-muted-foreground mt-2">
          Configure los porcentajes de comisión y utilidad para cada sistema de lotería
        </p>
      </div>

      <div className="grid gap-4">
        {systems.map((system) => {
          const commission = commissions.get(system.id);
          const isEditing = editingId === system.id;

          return (
            <Card key={system.id} className="overflow-hidden border-2 hover:shadow-md transition-shadow">
              <CardHeader className="bg-gradient-to-br from-background via-muted/30 to-background pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">{system.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Sistema de lotería
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {commission ? (
                      <Badge variant="default" className="bg-emerald-600">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Configurado
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Sin configurar</Badge>
                    )}
                    {!isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(system.id)}
                        className="gap-1"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {isEditing ? (
                  <div className="space-y-6">
                    <Tabs defaultValue="bolivares" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="bolivares">Bolívares (Bs)</TabsTrigger>
                        <TabsTrigger value="dolares">Dólares (USD)</TabsTrigger>
                      </TabsList>

                      <TabsContent value="bolivares" className="space-y-4 mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`commission-bs-${system.id}`} className="flex items-center gap-2 text-base">
                              <Percent className="h-4 w-4 text-yellow-600" />
                              Comisión Bs
                            </Label>
                            <div className="relative">
                              <Input
                                id={`commission-bs-${system.id}`}
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={editValues.commission}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, commission: e.target.value })
                                }
                                className="text-right pr-8 text-lg font-mono"
                                placeholder="0.00"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Porcentaje sobre las ventas brutas
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`utility-bs-${system.id}`} className="flex items-center gap-2 text-base">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Utilidad Bs
                            </Label>
                            <div className="relative">
                              <Input
                                id={`utility-bs-${system.id}`}
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={editValues.utility}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, utility: e.target.value })
                                }
                                className="text-right pr-8 text-lg font-mono"
                                placeholder="0.00"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Porcentaje de ganancia esperada
                            </p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="dolares" className="space-y-4 mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`commission-usd-${system.id}`} className="flex items-center gap-2 text-base">
                              <DollarSign className="h-4 w-4 text-yellow-600" />
                              Comisión USD
                            </Label>
                            <div className="relative">
                              <Input
                                id={`commission-usd-${system.id}`}
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={editValues.commissionUsd}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, commissionUsd: e.target.value })
                                }
                                className="text-right pr-8 text-lg font-mono"
                                placeholder="0.00"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Porcentaje sobre las ventas brutas
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`utility-usd-${system.id}`} className="flex items-center gap-2 text-base">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Utilidad USD
                            </Label>
                            <div className="relative">
                              <Input
                                id={`utility-usd-${system.id}`}
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={editValues.utilityUsd}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, utilityUsd: e.target.value })
                                }
                                className="text-right pr-8 text-lg font-mono"
                                placeholder="0.00"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Porcentaje de ganancia esperada
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={saving}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => handleSave(system.id)}
                        disabled={saving}
                        className="gap-2"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Bolívares (Bs)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Comisión
                          </p>
                          <p className="text-2xl font-bold font-mono text-yellow-600">
                            {commission?.commission_percentage.toFixed(2) || "0.00"}%
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Utilidad
                          </p>
                          <p className="text-2xl font-bold font-mono text-green-600">
                            {commission?.utility_percentage.toFixed(2) || "0.00"}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Dólares (USD)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Comisión
                          </p>
                          <p className="text-2xl font-bold font-mono text-yellow-600">
                            {commission?.commission_percentage_usd.toFixed(2) || "0.00"}%
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Utilidad
                          </p>
                          <p className="text-2xl font-bold font-mono text-green-600">
                            {commission?.utility_percentage_usd.toFixed(2) || "0.00"}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
