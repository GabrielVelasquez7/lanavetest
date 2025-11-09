import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, DollarSign, Receipt, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWeeklyCuadre, type WeekBoundaries } from "@/hooks/useWeeklyCuadre";
import { useSystemCommissions } from "@/hooks/useSystemCommissions";
import { formatCurrency } from "@/lib/utils";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

interface WeeklyBankExpense {
  id: string;
  category: string;
  amount_bs: number;
  description: string;
  agency_id: string | null;
}

interface AgencyGroup {
  id: string;
  name: string;
  description: string | null;
}

export function AdminGananciasView() {
  const [currentWeek, setCurrentWeek] = useState<WeekBoundaries | null>(null);
  const [bankExpenses, setBankExpenses] = useState<WeeklyBankExpense[]>([]);
  const [agencyGroups, setAgencyGroups] = useState<AgencyGroup[]>([]);
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

  useEffect(() => {
    if (currentWeek) {
      fetchBankExpenses();
      fetchAgencyGroups();
    }
  }, [currentWeek]);

  const fetchBankExpenses = async () => {
    if (!currentWeek) return;

    try {
      const startStr = format(currentWeek.start, "yyyy-MM-dd");
      const endStr = format(currentWeek.end, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("weekly_bank_expenses")
        .select("*")
        .gte("week_start_date", startStr)
        .lte("week_end_date", endStr);

      if (error) throw error;
      setBankExpenses(data || []);
    } catch (error) {
      console.error("Error fetching bank expenses:", error);
    }
  };

  const fetchAgencyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("agency_groups")
        .select("*")
        .order("name");

      if (error) throw error;
      setAgencyGroups(data || []);
    } catch (error) {
      console.error("Error fetching agency groups:", error);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    if (!currentWeek) return;
    
    const daysToAdd = direction === "next" ? 7 : -7;
    const newStart = addDays(currentWeek.start, daysToAdd);
    const newEnd = addDays(currentWeek.end, daysToAdd);
    
    setCurrentWeek({ start: newStart, end: newEnd });
  };

  // Calculate total commissions (gross profit) across all agencies
  const totalGrossProfitBs = useMemo(() => {
    return summaries.reduce((total, summary) => {
      const agencyCommissions = summary.per_system.reduce((acc, sys) => {
        const commission = commissions.get(sys.system_id);
        if (commission) {
          acc += sys.sales_bs * (commission.commission_percentage / 100);
        }
        return acc;
      }, 0);
      return total + agencyCommissions;
    }, 0);
  }, [summaries, commissions]);

  const totalGrossProfitUsd = useMemo(() => {
    return summaries.reduce((total, summary) => {
      const agencyCommissions = summary.per_system.reduce((acc, sys) => {
        const commission = commissions.get(sys.system_id);
        if (commission) {
          acc += sys.sales_usd * (commission.commission_percentage_usd / 100);
        }
        return acc;
      }, 0);
      return total + agencyCommissions;
    }, 0);
  }, [summaries, commissions]);

  // Calculate total operational expenses from summaries
  const totalOperationalExpensesBs = useMemo(() => {
    return summaries.reduce((total, summary) => total + summary.total_gastos_bs, 0);
  }, [summaries]);

  const totalOperationalExpensesUsd = useMemo(() => {
    return summaries.reduce((total, summary) => total + summary.total_gastos_usd, 0);
  }, [summaries]);

  // Calculate net profit (gross - operational expenses)
  const totalNetProfitBs = totalGrossProfitBs - totalOperationalExpensesBs;
  const totalNetProfitUsd = totalGrossProfitUsd - totalOperationalExpensesUsd;

  // Calculate total fixed expenses (weekly bank expenses)
  const totalFixedExpensesBs = useMemo(() => {
    return bankExpenses.reduce((total, expense) => total + Number(expense.amount_bs || 0), 0);
  }, [bankExpenses]);

  // Calculate final profit (net profit - fixed expenses)
  const finalProfitBs = totalNetProfitBs - totalFixedExpensesBs;

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    bankExpenses.forEach((expense) => {
      grouped[expense.category] = (grouped[expense.category] || 0) + Number(expense.amount_bs || 0);
    });
    return grouped;
  }, [bankExpenses]);

  const loading = summariesLoading || commissionsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Cargando ganancias...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ganancias</h1>
          <p className="text-muted-foreground">Resumen de ganancias y gastos semanales</p>
        </div>
      </div>

      {currentWeek && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("prev")}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <CardTitle className="text-center">
                {format(currentWeek.start, "d 'de' MMMM", { locale: es })} -{" "}
                {format(currentWeek.end, "d 'de' MMMM, yyyy", { locale: es })}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("next")}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumen Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-background border-2 border-green-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Bruto</p>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600 font-mono">
                    {formatCurrency(totalGrossProfitBs, "VES")}
                  </p>
                  <p className="text-sm text-green-600/70 font-mono mt-1">
                    {formatCurrency(totalGrossProfitUsd, "USD")}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-background border-2 border-red-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Gastos Operativos</p>
                    <Receipt className="h-5 w-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-600 font-mono">
                    -{formatCurrency(totalOperationalExpensesBs, "VES")}
                  </p>
                  <p className="text-sm text-red-600/70 font-mono mt-1">
                    -{formatCurrency(totalOperationalExpensesUsd, "USD")}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-background border-2 border-blue-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Neto</p>
                    <Calculator className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600 font-mono">
                    {formatCurrency(totalNetProfitBs, "VES")}
                  </p>
                  <p className="text-sm text-blue-600/70 font-mono mt-1">
                    {formatCurrency(totalNetProfitUsd, "USD")}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-background border-2 border-orange-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Gastos Fijos</p>
                    <Receipt className="h-5 w-5 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-600 font-mono">
                    -{formatCurrency(totalFixedExpensesBs, "VES")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Ganancia Final */}
            <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-background border-2 border-purple-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-purple-700 flex items-center gap-2">
                    <DollarSign className="h-6 w-6" />
                    Ganancia Final (Total Neto - Gastos Fijos)
                  </h3>
                </div>
                <p className="text-4xl font-bold text-purple-700 font-mono">
                  {formatCurrency(finalProfitBs, "VES")}
                </p>
              </CardContent>
            </Card>

            {/* Desglose de Gastos Fijos */}
            {bankExpenses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Desglose de Gastos Fijos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(expensesByCategory).map(([category, amount]) => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="font-medium capitalize">
                          {category.replace(/_/g, " ")}
                        </span>
                        <span className="font-bold font-mono">
                          {formatCurrency(amount, "VES")}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
