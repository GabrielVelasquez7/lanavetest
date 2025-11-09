import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSystemsTable, SystemWithCommission } from "./AdminSystemsTable";
import { useSystemCommissions } from "@/hooks/useSystemCommissions";
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";

interface WeekBoundaries {
  start: Date;
  end: Date;
}

interface Agency {
  id: string;
  name: string;
}

export function AdminWeeklyCuadreView() {
  const [currentWeek, setCurrentWeek] = useState<WeekBoundaries | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [systems, setSystems] = useState<SystemWithCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const { commissions, loading: commissionsLoading } = useSystemCommissions();

  useEffect(() => {
    initializeCurrentWeek();
    fetchAgencies();
  }, []);

  useEffect(() => {
    if (currentWeek && !commissionsLoading) {
      fetchWeeklySummary();
    }
  }, [currentWeek, selectedAgency, commissionsLoading]);

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
    }
  };

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error("Error fetching agencies:", error);
    }
  };

  const fetchWeeklySummary = async () => {
    if (!currentWeek) return;

    try {
      setLoading(true);

      const weekStart = format(currentWeek.start, "yyyy-MM-dd");
      const weekEnd = format(currentWeek.end, "yyyy-MM-dd");

      let query = supabase
        .from("encargada_cuadre_details")
        .select(
          `
          *,
          lottery_systems!inner(id, name, code),
          agencies!inner(id, name)
        `
        )
        .gte("session_date", weekStart)
        .lte("session_date", weekEnd);

      if (selectedAgency !== "all") {
        query = query.eq("agency_id", selectedAgency);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por sistema y calcular totales
      const systemsMap = new Map<string, SystemWithCommission>();

      data?.forEach((detail: any) => {
        const systemId = detail.lottery_system_id;
        const existing = systemsMap.get(systemId);

        if (existing) {
          existing.sales_bs += detail.sales_bs || 0;
          existing.sales_usd += detail.sales_usd || 0;
          existing.prizes_bs += detail.prizes_bs || 0;
          existing.prizes_usd += detail.prizes_usd || 0;
        } else {
          const commission = commissions.get(systemId);
          systemsMap.set(systemId, {
            system_id: systemId,
            system_name: detail.lottery_systems.name,
            sales_bs: detail.sales_bs || 0,
            sales_usd: detail.sales_usd || 0,
            prizes_bs: detail.prizes_bs || 0,
            prizes_usd: detail.prizes_usd || 0,
            commission_percentage: commission?.commission_percentage || 0,
            utility_percentage: commission?.utility_percentage || 0,
          });
        }
      });

      setSystems(Array.from(systemsMap.values()));
    } catch (error) {
      console.error("Error fetching weekly summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    if (!currentWeek) return;

    const newStart = direction === "prev" ? subWeeks(currentWeek.start, 1) : addWeeks(currentWeek.start, 1);
    const newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
    setCurrentWeek({ start: newStart, end: newEnd });
  };

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

  if (!currentWeek) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const summaryTotals = calculateSummaryTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cuadre Semanal Completo</h2>
          <p className="text-muted-foreground">Vista administrativa con comisiones detalladas</p>
        </div>
        <Button onClick={fetchWeeklySummary} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" />
        </Button>
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

      {/* Week Navigation & Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => navigateWeek("prev")} variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {format(currentWeek.start, "d 'de' MMMM", { locale: es })} - {format(currentWeek.end, "d 'de' MMMM, yyyy", { locale: es })}
          </div>
          <Button onClick={() => navigateWeek("next")} variant="outline" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={selectedAgency} onValueChange={setSelectedAgency}>
          <SelectTrigger className="w-64">
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
      </div>

      {/* Systems Table with Commissions */}
      <AdminSystemsTable systems={systems} loading={loading} />
    </div>
  );
}
