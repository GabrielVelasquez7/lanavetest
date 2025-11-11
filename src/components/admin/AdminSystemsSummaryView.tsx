import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWeeklyCuadre, type WeekBoundaries } from "@/hooks/useWeeklyCuadre";
import { useSystemCommissions } from "@/hooks/useSystemCommissions";
import { formatCurrency } from "@/lib/utils";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SystemSummary {
  system_id: string;
  system_name: string;
  sales_bs: number;
  sales_usd: number;
  prizes_bs: number;
  prizes_usd: number;
  commission_percentage_bs: number;
  commission_percentage_usd: number;
  total_bs: number;
  total_usd: number;
}

export function AdminSystemsSummaryView() {
  const [currentWeek, setCurrentWeek] = useState<WeekBoundaries | null>(null);
  const [currency, setCurrency] = useState<"bs" | "usd">("bs");
  const { summaries, loading: summariesLoading } = useWeeklyCuadre(currentWeek);
  const { commissions, loading: commissionsLoading } = useSystemCommissions();

  useEffect(() => {
    // Calculate current week starting on Monday
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    setCurrentWeek({
      start: weekStart,
      end: weekEnd,
    });
  }, []);

  const navigateWeek = (direction: "prev" | "next") => {
    if (!currentWeek) return;

    const daysToAdd = direction === "next" ? 7 : -7;
    const newStart = addDays(currentWeek.start, daysToAdd);
    const newEnd = addDays(currentWeek.end, daysToAdd);

    setCurrentWeek({ start: newStart, end: newEnd });
  };

  // Aggregate data by system across all agencies
  const systemsData = useMemo(() => {
    const systemsMap = new Map<string, SystemSummary>();

    summaries.forEach((summary) => {
      summary.per_system.forEach((sys) => {
        const commission = commissions.get(sys.system_id);
        
        if (!systemsMap.has(sys.system_id)) {
          systemsMap.set(sys.system_id, {
            system_id: sys.system_id,
            system_name: sys.system_name,
            sales_bs: 0,
            sales_usd: 0,
            prizes_bs: 0,
            prizes_usd: 0,
            commission_percentage_bs: commission?.commission_percentage || 0,
            commission_percentage_usd: commission?.commission_percentage_usd || 0,
            total_bs: 0,
            total_usd: 0,
          });
        }

        const systemData = systemsMap.get(sys.system_id)!;
        systemData.sales_bs += sys.sales_bs;
        systemData.sales_usd += sys.sales_usd;
        systemData.prizes_bs += sys.prizes_bs;
        systemData.prizes_usd += sys.prizes_usd;
      });
    });

    // Calculate totals with commission applied
    systemsMap.forEach((system) => {
      const netBs = system.sales_bs - system.prizes_bs;
      const netUsd = system.sales_usd - system.prizes_usd;
      
      system.total_bs = netBs * (system.commission_percentage_bs / 100);
      system.total_usd = netUsd * (system.commission_percentage_usd / 100);
    });

    return Array.from(systemsMap.values()).sort((a, b) => a.system_name.localeCompare(b.system_name));
  }, [summaries, commissions]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    return systemsData.reduce(
      (acc, sys) => {
        acc.sales_bs += sys.sales_bs;
        acc.sales_usd += sys.sales_usd;
        acc.prizes_bs += sys.prizes_bs;
        acc.prizes_usd += sys.prizes_usd;
        acc.total_bs += sys.total_bs;
        acc.total_usd += sys.total_usd;
        return acc;
      },
      { sales_bs: 0, sales_usd: 0, prizes_bs: 0, prizes_usd: 0, total_bs: 0, total_usd: 0 }
    );
  }, [systemsData]);

  const loading = summariesLoading || commissionsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Cargando resumen de sistemas...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resumen por Sistemas</h1>
          <p className="text-muted-foreground">Ventas y premios agregados por sistema aplicando % BS</p>
        </div>
      </div>

      {currentWeek && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <CardTitle className="text-center">
                {format(currentWeek.start, "d 'de' MMMM", { locale: es })} -{" "}
                {format(currentWeek.end, "d 'de' MMMM, yyyy", { locale: es })}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <Tabs value={currency} onValueChange={(value) => setCurrency(value as "bs" | "usd")} className="w-full mt-4">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="bs">Bolívares</TabsTrigger>
                <TabsTrigger value="usd">Dólares</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Sistema</TableHead>
                    <TableHead className="text-right font-bold">Ventas</TableHead>
                    <TableHead className="text-right font-bold">Premios</TableHead>
                    <TableHead className="text-right font-bold">Ventas - Premios</TableHead>
                    <TableHead className="text-right font-bold">% BS</TableHead>
                    <TableHead className="text-right font-bold bg-blue-50 dark:bg-blue-950">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemsData.map((sys) => {
                    const sales = currency === "bs" ? sys.sales_bs : sys.sales_usd;
                    const prizes = currency === "bs" ? sys.prizes_bs : sys.prizes_usd;
                    const net = sales - prizes;
                    const total = currency === "bs" ? sys.total_bs : sys.total_usd;
                    const percentage = currency === "bs" ? sys.commission_percentage_bs : sys.commission_percentage_usd;

                    return (
                      <TableRow key={sys.system_id}>
                        <TableCell className="font-medium">{sys.system_name}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {currency === "bs" ? formatCurrency(sales, "VES") : formatCurrency(sales, "USD")}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {currency === "bs" ? formatCurrency(prizes, "VES") : formatCurrency(prizes, "USD")}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {currency === "bs" ? formatCurrency(net, "VES") : formatCurrency(net, "USD")}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {percentage.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950">
                          {currency === "bs" ? formatCurrency(total, "VES") : formatCurrency(total, "USD")}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Fila de totales */}
                  <TableRow className="bg-primary/10 font-bold border-t-2">
                    <TableCell className="font-bold">TOTALES</TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {currency === "bs" ? formatCurrency(grandTotals.sales_bs, "VES") : formatCurrency(grandTotals.sales_usd, "USD")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {currency === "bs" ? formatCurrency(grandTotals.prizes_bs, "VES") : formatCurrency(grandTotals.prizes_usd, "USD")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {currency === "bs" 
                        ? formatCurrency(grandTotals.sales_bs - grandTotals.prizes_bs, "VES") 
                        : formatCurrency(grandTotals.sales_usd - grandTotals.prizes_usd, "USD")}
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right font-mono font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 text-lg">
                      {currency === "bs" ? formatCurrency(grandTotals.total_bs, "VES") : formatCurrency(grandTotals.total_usd, "USD")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {systemsData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos disponibles para esta semana
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
