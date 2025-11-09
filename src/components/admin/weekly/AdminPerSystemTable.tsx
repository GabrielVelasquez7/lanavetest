import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { PerSystemTotals } from "@/hooks/useWeeklyCuadre";
import type { CommissionRate } from "@/hooks/useSystemCommissions";

interface Props {
  data: PerSystemTotals[];
  commissions: Map<string, CommissionRate>;
}

export function AdminPerSystemTable({ data, commissions }: Props) {
  if (!data?.length) return null;

  const totals = data.reduce(
    (acc, s) => {
      const cuadre_bs = s.sales_bs - s.prizes_bs;
      const cuadre_usd = s.sales_usd - s.prizes_usd;
      const commission = commissions.get(s.system_id);
      
      const comision_bs = commission
        ? cuadre_bs * (commission.commission_percentage / 100)
        : 0;
      const comision_usd = commission
        ? cuadre_usd * (commission.commission_percentage_usd / 100)
        : 0;
      const subtotal_bs = cuadre_bs - comision_bs;
      const subtotal_usd = cuadre_usd - comision_usd;

      acc.sales_bs += s.sales_bs;
      acc.sales_usd += s.sales_usd;
      acc.prizes_bs += s.prizes_bs;
      acc.prizes_usd += s.prizes_usd;
      acc.comision_bs += comision_bs;
      acc.comision_usd += comision_usd;
      acc.subtotal_bs += subtotal_bs;
      acc.subtotal_usd += subtotal_usd;
      return acc;
    },
    { sales_bs: 0, sales_usd: 0, prizes_bs: 0, prizes_usd: 0, comision_bs: 0, comision_usd: 0, subtotal_bs: 0, subtotal_usd: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sistema</TableHead>
            <TableHead className="text-right">Ventas Bs</TableHead>
            <TableHead className="text-right">Ventas USD</TableHead>
            <TableHead className="text-right">Premios Bs</TableHead>
            <TableHead className="text-right">Premios USD</TableHead>
            <TableHead className="text-right">% Com. Bs</TableHead>
            <TableHead className="text-right bg-yellow-500/20">Comisión Bs</TableHead>
            <TableHead className="text-right">% Com. USD</TableHead>
            <TableHead className="text-right bg-yellow-500/20">Comisión USD</TableHead>
            <TableHead className="text-right">SUB TOTAL Bs</TableHead>
            <TableHead className="text-right">SUB TOTAL USD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => {
            const cuadre_bs = s.sales_bs - s.prizes_bs;
            const cuadre_usd = s.sales_usd - s.prizes_usd;
            const commission = commissions.get(s.system_id);
            const commission_percentage_bs = commission?.commission_percentage || 0;
            const commission_percentage_usd = commission?.commission_percentage_usd || 0;
            const comision_bs = commission
              ? cuadre_bs * (commission_percentage_bs / 100)
              : 0;
            const comision_usd = commission
              ? cuadre_usd * (commission_percentage_usd / 100)
              : 0;
            const subtotal_bs = cuadre_bs - comision_bs;
            const subtotal_usd = cuadre_usd - comision_usd;

            return (
              <TableRow key={s.system_id}>
                <TableCell className="font-medium">{s.system_name}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(s.sales_bs, "VES")}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(s.sales_usd, "USD")}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(s.prizes_bs, "VES")}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(s.prizes_usd, "USD")}</TableCell>
                <TableCell className="text-right font-mono">{commission_percentage_bs.toFixed(2)}%</TableCell>
                <TableCell className="text-right font-mono font-bold bg-yellow-500/20">
                  {formatCurrency(comision_bs, "VES")}
                </TableCell>
                <TableCell className="text-right font-mono">{commission_percentage_usd.toFixed(2)}%</TableCell>
                <TableCell className="text-right font-mono font-bold bg-yellow-500/20">
                  {formatCurrency(comision_usd, "USD")}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(subtotal_bs, "VES")}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(subtotal_usd, "USD")}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/50">
            <TableCell className="font-semibold">Totales</TableCell>
            <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.sales_bs, "VES")}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.sales_usd, "USD")}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.prizes_bs, "VES")}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.prizes_usd, "USD")}</TableCell>
            <TableCell className="text-right font-mono font-semibold">-</TableCell>
            <TableCell className="text-right font-mono font-bold bg-yellow-500/20">
              {formatCurrency(totals.comision_bs, "VES")}
            </TableCell>
            <TableCell className="text-right font-mono font-semibold">-</TableCell>
            <TableCell className="text-right font-mono font-bold bg-yellow-500/20">
              {formatCurrency(totals.comision_usd, "USD")}
            </TableCell>
            <TableCell className="text-right font-mono font-semibold">
              {formatCurrency(totals.subtotal_bs, "VES")}
            </TableCell>
            <TableCell className="text-right font-mono font-semibold">
              {formatCurrency(totals.subtotal_usd, "USD")}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
