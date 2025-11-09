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
  group_id: string | null;
}

interface AgencyGroup {
  id: string;
  name: string;
  description: string | null;
}

interface Agency {
  id: string;
  name: string;
  group_id: string | null;
}

export function AdminGananciasView() {
  const [currentWeek, setCurrentWeek] = useState<WeekBoundaries | null>(null);
  const [bankExpenses, setBankExpenses] = useState<WeeklyBankExpense[]>([]);
  const [agencyGroups, setAgencyGroups] = useState<AgencyGroup[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
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
      fetchAgencies();
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

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name, group_id")
        .eq("is_active", true);

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error("Error fetching agencies:", error);
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

  // Calculate data by groups
  const groupsData = useMemo(() => {
    return agencyGroups.map((group) => {
      // Get agencies in this group
      const groupAgencies = agencies.filter((a) => a.group_id === group.id);
      const groupAgencyIds = groupAgencies.map((a) => a.id);
      
      // Get summaries for agencies in this group
      const groupSummaries = summaries.filter((s) => groupAgencyIds.includes(s.agency_id));
      
      // Calculate gross profit (commissions)
      const grossProfitBs = groupSummaries.reduce((total, summary) => {
        const agencyCommissions = summary.per_system.reduce((acc, sys) => {
          const commission = commissions.get(sys.system_id);
          if (commission) {
            acc += sys.sales_bs * (commission.commission_percentage / 100);
          }
          return acc;
        }, 0);
        return total + agencyCommissions;
      }, 0);
      
      const grossProfitUsd = groupSummaries.reduce((total, summary) => {
        const agencyCommissions = summary.per_system.reduce((acc, sys) => {
          const commission = commissions.get(sys.system_id);
          if (commission) {
            acc += sys.sales_usd * (commission.commission_percentage_usd / 100);
          }
          return acc;
        }, 0);
        return total + agencyCommissions;
      }, 0);
      
      // Calculate operational expenses
      const operationalExpensesBs = groupSummaries.reduce((total, summary) => total + summary.total_gastos_bs, 0);
      const operationalExpensesUsd = groupSummaries.reduce((total, summary) => total + summary.total_gastos_usd, 0);
      
      // Calculate net profit
      const netProfitBs = grossProfitBs - operationalExpensesBs;
      const netProfitUsd = grossProfitUsd - operationalExpensesUsd;
      
      // Get fixed expenses for this group
      const groupFixedExpenses = bankExpenses.filter((e) => e.group_id === group.id);
      const fixedExpensesBs = groupFixedExpenses.reduce((total, e) => total + Number(e.amount_bs || 0), 0);
      
      // Calculate final profit
      const finalProfitBs = netProfitBs - fixedExpensesBs;
      
      // Group expenses by category
      const expensesByCategory: Record<string, number> = {};
      groupFixedExpenses.forEach((expense) => {
        expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + Number(expense.amount_bs || 0);
      });
      
      return {
        group,
        grossProfitBs,
        grossProfitUsd,
        operationalExpensesBs,
        operationalExpensesUsd,
        netProfitBs,
        netProfitUsd,
        fixedExpensesBs,
        finalProfitBs,
        expensesByCategory,
        agenciesCount: groupAgencies.length,
      };
    });
  }, [agencyGroups, agencies, summaries, commissions, bankExpenses]);

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

            {/* Desglose por Grupos */}
            {groupsData.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">Desglose por Grupos</h2>
                <div className="grid grid-cols-1 gap-4">
                  {groupsData.map(({ group, grossProfitBs, grossProfitUsd, operationalExpensesBs, operationalExpensesUsd, netProfitBs, netProfitUsd, fixedExpensesBs, finalProfitBs, expensesByCategory, agenciesCount }) => (
                    <Card key={group.id} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <span>{group.name}</span>
                          <span className="text-sm font-normal text-muted-foreground">
                            {agenciesCount} {agenciesCount === 1 ? "agencia" : "agencias"}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Bruto</p>
                            <p className="text-sm font-bold text-green-600 font-mono">
                              {formatCurrency(grossProfitBs, "VES")}
                            </p>
                            <p className="text-xs text-green-600/70 font-mono">
                              {formatCurrency(grossProfitUsd, "USD")}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Gastos Op.</p>
                            <p className="text-sm font-bold text-red-600 font-mono">
                              -{formatCurrency(operationalExpensesBs, "VES")}
                            </p>
                            <p className="text-xs text-red-600/70 font-mono">
                              -{formatCurrency(operationalExpensesUsd, "USD")}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Neto</p>
                            <p className="text-sm font-bold text-blue-600 font-mono">
                              {formatCurrency(netProfitBs, "VES")}
                            </p>
                            <p className="text-xs text-blue-600/70 font-mono">
                              {formatCurrency(netProfitUsd, "USD")}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Gastos Fijos</p>
                            <p className="text-sm font-bold text-orange-600 font-mono">
                              -{formatCurrency(fixedExpensesBs, "VES")}
                            </p>
                          </div>
                          
                          <div className="space-y-1 bg-purple-500/10 p-2 rounded-lg">
                            <p className="text-xs font-semibold text-purple-700">Final</p>
                            <p className="text-lg font-bold text-purple-700 font-mono">
                              {formatCurrency(finalProfitBs, "VES")}
                            </p>
                          </div>
                        </div>
                        
                        {Object.keys(expensesByCategory).length > 0 && (
                          <div className="pt-3 border-t">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Gastos Fijos:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(expensesByCategory).map(([category, amount]) => (
                                <div
                                  key={category}
                                  className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full text-xs"
                                >
                                  <span className="capitalize">{category.replace(/_/g, " ")}</span>
                                  <span className="font-bold font-mono">{formatCurrency(amount, "VES")}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
