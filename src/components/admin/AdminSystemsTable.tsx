import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface SystemWithCommission {
  system_id: string;
  system_name: string;
  sales_bs: number;
  sales_usd: number;
  prizes_bs: number;
  prizes_usd: number;
  commission_percentage: number;
  utility_percentage: number;
}

interface AdminSystemsTableProps {
  systems: SystemWithCommission[];
  loading?: boolean;
}

export function AdminSystemsTable({ systems, loading }: AdminSystemsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!systems || systems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay datos disponibles para esta semana
      </div>
    );
  }

  // Calcular totales
  const totals = systems.reduce(
    (acc, sys) => {
      const totalBs = sys.sales_bs - sys.prizes_bs;
      const commissionBs = totalBs * (sys.commission_percentage / 100);
      const subTotal = totalBs - commissionBs;
      const utilityBs = subTotal * (sys.utility_percentage / 100);
      const finalTotal = subTotal - utilityBs;

      acc.salesBs += sys.sales_bs;
      acc.salesUsd += sys.sales_usd;
      acc.prizesBs += sys.prizes_bs;
      acc.prizesUsd += sys.prizes_usd;
      acc.totalBs += totalBs;
      acc.commissionBs += commissionBs;
      acc.subTotal += subTotal;
      acc.utilityBs += utilityBs;
      acc.finalTotal += finalTotal;

      return acc;
    },
    {
      salesBs: 0,
      salesUsd: 0,
      prizesBs: 0,
      prizesUsd: 0,
      totalBs: 0,
      commissionBs: 0,
      subTotal: 0,
      utilityBs: 0,
      finalTotal: 0,
    }
  );

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Sistema</TableHead>
            <TableHead className="text-right">Ventas Bs</TableHead>
            <TableHead className="text-right">Ventas USD</TableHead>
            <TableHead className="text-right">Premios Bs</TableHead>
            <TableHead className="text-right">Premios USD</TableHead>
            <TableHead className="text-right">TOTAL Bs</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right bg-yellow-50 dark:bg-yellow-950 font-bold">
              % Bs
            </TableHead>
            <TableHead className="text-right">SUB TOTAL</TableHead>
            <TableHead className="text-right">% x UTILIDAD</TableHead>
            <TableHead className="text-right font-bold">TOTAL Bs (final)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {systems.map((sys) => {
            const totalBs = sys.sales_bs - sys.prizes_bs;
            const commissionBs = totalBs * (sys.commission_percentage / 100);
            const subTotal = totalBs - commissionBs;
            const utilityBs = subTotal * (sys.utility_percentage / 100);
            const finalTotal = subTotal - utilityBs;

            return (
              <TableRow key={sys.system_id}>
                <TableCell className="font-medium">{sys.system_name}</TableCell>
                <TableCell className="text-right font-mono text-green-600">
                  {formatCurrency(sys.sales_bs, "VES")}
                </TableCell>
                <TableCell className="text-right font-mono text-green-600">
                  {formatCurrency(sys.sales_usd, "USD")}
                </TableCell>
                <TableCell className="text-right font-mono text-red-600">
                  {formatCurrency(sys.prizes_bs, "VES")}
                </TableCell>
                <TableCell className="text-right font-mono text-red-600">
                  {formatCurrency(sys.prizes_usd, "USD")}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(totalBs, "VES")}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {sys.commission_percentage.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right font-mono font-bold bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100">
                  {formatCurrency(commissionBs, "VES")}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(subTotal, "VES")}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {utilityBs > 0 ? formatCurrency(utilityBs, "VES") : "-"}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-blue-600">
                  {formatCurrency(finalTotal, "VES")}
                </TableCell>
              </TableRow>
            );
          })}

          {/* Fila de totales */}
          <TableRow className="bg-blue-50 dark:bg-blue-950 font-bold">
            <TableCell className="font-bold">TOTALES</TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.salesBs, "VES")}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.salesUsd, "USD")}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.prizesBs, "VES")}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.prizesUsd, "USD")}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.totalBs, "VES")}
            </TableCell>
            <TableCell className="text-right">-</TableCell>
            <TableCell className="text-right font-mono bg-yellow-100 dark:bg-yellow-900">
              {formatCurrency(totals.commissionBs, "VES")}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.subTotal, "VES")}
            </TableCell>
            <TableCell className="text-right font-mono">
              {totals.utilityBs > 0 ? formatCurrency(totals.utilityBs, "VES") : "-"}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.finalTotal, "VES")}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
