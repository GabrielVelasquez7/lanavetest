import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Debt {
  id: string;
  debtor_agency: { name: string };
  creditor_agency: { name: string };
  total_debt_bs: number;
  total_debt_usd: number;
  last_updated: string;
}

interface AgencyDebtSummary {
  agency_name: string;
  total_owed_bs: number;
  total_owed_usd: number;
  total_owing_bs: number;
  total_owing_usd: number;
  net_balance_bs: number;
  net_balance_usd: number;
}

interface InterAgencyDebtsViewProps {
  refreshTrigger?: number;
}

export function InterAgencyDebtsView({ refreshTrigger }: InterAgencyDebtsViewProps) {
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [agencySummary, setAgencySummary] = useState<AgencyDebtSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebts();
  }, [refreshTrigger]);

  const fetchDebts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inter_agency_debts')
        .select(`
          *,
          debtor_agency:agencies!debtor_agency_id(name),
          creditor_agency:agencies!creditor_agency_id(name)
        `)
        .order('total_debt_bs', { ascending: false });

      if (error) throw error;
      
      const debtsData = data || [];
      setDebts(debtsData);
      
      // Calculate agency summary
      const summary = calculateAgencySummary(debtsData);
      setAgencySummary(summary);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las deudas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAgencySummary = (debtsData: Debt[]): AgencyDebtSummary[] => {
    const agencyMap = new Map<string, AgencyDebtSummary>();

    // Initialize all agencies
    const allAgencies = new Set<string>();
    debtsData.forEach(debt => {
      allAgencies.add(debt.debtor_agency.name);
      allAgencies.add(debt.creditor_agency.name);
    });

    allAgencies.forEach(agencyName => {
      agencyMap.set(agencyName, {
        agency_name: agencyName,
        total_owed_bs: 0,
        total_owed_usd: 0,
        total_owing_bs: 0,
        total_owing_usd: 0,
        net_balance_bs: 0,
        net_balance_usd: 0,
      });
    });

    // Calculate totals
    debtsData.forEach(debt => {
      const debtorName = debt.debtor_agency.name;
      const creditorName = debt.creditor_agency.name;

      // Debtor owes money
      const debtor = agencyMap.get(debtorName)!;
      debtor.total_owing_bs += debt.total_debt_bs;
      debtor.total_owing_usd += debt.total_debt_usd;

      // Creditor is owed money
      const creditor = agencyMap.get(creditorName)!;
      creditor.total_owed_bs += debt.total_debt_bs;
      creditor.total_owed_usd += debt.total_debt_usd;
    });

    // Calculate net balances
    agencyMap.forEach(agency => {
      agency.net_balance_bs = agency.total_owed_bs - agency.total_owing_bs;
      agency.net_balance_usd = agency.total_owed_usd - agency.total_owing_usd;
    });

    return Array.from(agencyMap.values())
      .filter(agency => agency.total_owed_bs > 0 || agency.total_owing_bs > 0 || agency.total_owed_usd > 0 || agency.total_owing_usd > 0)
      .sort((a, b) => Math.abs(b.net_balance_bs) - Math.abs(a.net_balance_bs));
  };

  const getBalanceDisplay = (balanceBs: number, balanceUsd: number) => {
    const isPositive = balanceBs >= 0 && balanceUsd >= 0;
    const hasSignificantBalance = Math.abs(balanceBs) > 0.01 || Math.abs(balanceUsd) > 0.01;

    if (!hasSignificantBalance) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Equilibrado
        </Badge>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <div className={`text-sm font-mono ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {balanceBs !== 0 && (
            <div>
              {isPositive ? '+' : ''}
              {balanceBs.toLocaleString("es-ES", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} Bs
            </div>
          )}
          {balanceUsd !== 0 && (
            <div>
              {isPositive ? '+' : ''}
              ${balanceUsd.toLocaleString("es-ES", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Cargando información de deudas...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agency Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Resumen por Agencia
            </CardTitle>
            <Button onClick={fetchDebts} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {agencySummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay deudas registradas entre agencias
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Le Deben (Bs)</TableHead>
                  <TableHead>Le Deben (USD)</TableHead>
                  <TableHead>Debe (Bs)</TableHead>
                  <TableHead>Debe (USD)</TableHead>
                  <TableHead>Balance Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencySummary.map((agency) => (
                  <TableRow key={agency.agency_name}>
                    <TableCell className="font-medium">
                      {agency.agency_name}
                    </TableCell>
                    <TableCell className="text-green-600 font-mono">
                      {agency.total_owed_bs > 0 ? (
                        agency.total_owed_bs.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-green-600 font-mono">
                      {agency.total_owed_usd > 0 ? (
                        `$${agency.total_owed_usd.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-red-600 font-mono">
                      {agency.total_owing_bs > 0 ? (
                        agency.total_owing_bs.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-red-600 font-mono">
                      {agency.total_owing_usd > 0 ? (
                        `$${agency.total_owing_usd.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {getBalanceDisplay(agency.net_balance_bs, agency.net_balance_usd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detailed Debts */}
      <Card>
        <CardHeader>
          <CardTitle>Deudas Detalladas Entre Agencias</CardTitle>
        </CardHeader>
        <CardContent>
          {debts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay deudas activas entre agencias
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deudor</TableHead>
                  <TableHead>Acreedor</TableHead>
                  <TableHead>Deuda Bs</TableHead>
                  <TableHead>Deuda USD</TableHead>
                  <TableHead>Última Actualización</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">
                      {debt.debtor_agency.name}
                    </TableCell>
                    <TableCell className="font-medium">
                      {debt.creditor_agency.name}
                    </TableCell>
                    <TableCell className="font-mono">
                      {debt.total_debt_bs > 0 ? (
                        <span className="text-red-600">
                          {debt.total_debt_bs.toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} Bs
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {debt.total_debt_usd > 0 ? (
                        <span className="text-red-600">
                          ${debt.total_debt_usd.toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(debt.last_updated), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}