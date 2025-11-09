import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSystemsTable, SystemWithCommission } from "./AdminSystemsTable";
import { useSystemCommissions } from "@/hooks/useSystemCommissions";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { useWeeklyCuadre, WeekBoundaries } from "@/hooks/useWeeklyCuadre";
import { useToast } from "@/components/ui/use-toast";

export function AdminWeeklyCuadreView() {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState<WeekBoundaries | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const { commissions } = useSystemCommissions();
  const { loading, summaries, agencies, refresh, error } = useWeeklyCuadre(currentWeek);

  useEffect(() => {
    initializeCurrentWeek();
  }, []);

  useEffect(() => {
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    }
  }, [error, toast]);

  const initializeCurrentWeek = async () => {
    try {
      const { data, error } = await supabase.rpc("get_current_week_boundaries");

      if (error) throw error;

      if (data && data.length > 0) {
        const w = data[0];
        setCurrentWeek({
          start: new Date(w.week_start + "T00:00:00"),
          end: new Date(w.week_end + "T23:59:59"),
        });
      } else {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        setCurrentWeek({ start: weekStart, end: weekEnd });
      }
    } catch (error) {
      console.error("Error getting current week:", error);
      toast({
        title: "Error",
        description: "No se pudieron obtener las fechas de la semana",
        variant: "destructive",
      });
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    if (!currentWeek) return;
    const newStart = direction === "prev" ? subWeeks(currentWeek.start, 1) : addWeeks(currentWeek.start, 1);
    const newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
    setCurrentWeek({ start: newStart, end: newEnd });
  };

  // Filtrar summaries por agencia seleccionada
  const filteredSummaries = selectedAgency === "all" 
    ? summaries 
    : summaries.filter((s) => s.agency_id === selectedAgency);

  // Consolidar por sistema
  const systemsMap = new Map<string, SystemWithCommission>();
  
  filteredSummaries.forEach((summary) => {
    summary.per_system.forEach((sys) => {
      const existing = systemsMap.get(sys.system_id);
      if (existing) {
        existing.sales_bs += sys.sales_bs;
        existing.sales_usd += sys.sales_usd;
        existing.prizes_bs += sys.prizes_bs;
        existing.prizes_usd += sys.prizes_usd;
      } else {
        const commission = commissions.get(sys.system_id);
        systemsMap.set(sys.system_id, {
          system_id: sys.system_id,
          system_name: sys.system_name,
          sales_bs: sys.sales_bs,
          sales_usd: sys.sales_usd,
          prizes_bs: sys.prizes_bs,
          prizes_usd: sys.prizes_usd,
          commission_percentage: commission?.commission_percentage || 0,
          utility_percentage: commission?.utility_percentage || 0,
        });
      }
    });
  });

  const systems = Array.from(systemsMap.values());

  const calculateSummaryTotals = () => {
    return systems.reduce(
      (acc, sys) => {
        const totalBs = sys.sales_bs - sys.prizes_bs;
        const commissionBs = totalBs * (sys.commission_percentage / 100);

        acc.totalSales += sys.sales_bs;
        acc.totalPrizes += sys.prizes_bs;
        acc.totalNet += totalBs;
        acc.totalCommission += commissionBs;

        return acc;
      },
      { totalSales: 0, totalPrizes: 0, totalNet: 0, totalCommission: 0 }
    );
  };

  if (loading || !currentWeek) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando datos semanales...</p>
        </div>
      </div>
    );
  }

  const summaryTotals = calculateSummaryTotals();

  return (
    <div className="space-y-6">
      {/* Encabezado y navegación */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Cuadre Semanal Administrativo</h2>
            <p className="text-sm text-muted-foreground">
              {format(currentWeek.start, "d 'de' MMMM", { locale: es })} — {format(currentWeek.end, "d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={refresh} title="Refrescar datos">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryTotals.totalSales, "VES")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Premios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summaryTotals.totalPrizes, "VES")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Neto (Ventas - Premios)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summaryTotals.totalNet, "VES")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 dark:bg-yellow-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Comisiones (% Bs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {formatCurrency(summaryTotals.totalCommission, "VES")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de agencia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrar por Agencia</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Seleccionar agencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las agencias</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Systems Table with Commissions */}
      <AdminSystemsTable systems={systems} loading={loading} />
    </div>
  );
}
