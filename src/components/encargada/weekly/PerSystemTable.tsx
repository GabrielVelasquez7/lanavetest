import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { PerSystemTotals } from "@/hooks/useWeeklyCuadre";

interface Props {
  data: PerSystemTotals[];
}

export function PerSystemTable({ data }: Props) {
  if (!data?.length) return null;
  const totals = data.reduce(
    (acc, s) => {
      acc.sales_bs += s.sales_bs;
      acc.sales_usd += s.sales_usd;
      acc.prizes_bs += s.prizes_bs;
      acc.prizes_usd += s.prizes_usd;
      return acc;
    },
    { sales_bs: 0, sales_usd: 0, prizes_bs: 0, prizes_usd: 0 }
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => (
            <TableRow key={s.system_id}>
              <TableCell className="font-medium">{s.system_name}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(s.sales_bs, "VES")}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(s.sales_usd, "USD")}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(s.prizes_bs, "VES")}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(s.prizes_usd, "USD")}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="font-semibold">Totales</TableCell>
            <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.sales_bs, "VES")}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.sales_usd, "USD")}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.prizes_bs, "VES")}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.prizes_usd, "USD")}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
