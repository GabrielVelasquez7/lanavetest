import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PerSystemTotals } from "@/hooks/useWeeklyCuadre";
import type { CommissionRate } from "@/hooks/useSystemCommissions";

interface Props {
  data: PerSystemTotals[];
  commissions: Map<string, CommissionRate>;
}

export function AdminPerSystemTable({ data, commissions }: Props) {
  if (!data?.length) return null;

  const totalsBs = data.reduce(
    (acc, s) => {
      const cuadre_bs = s.sales_bs - s.prizes_bs;
      const commission = commissions.get(s.system_id);
      
      const comision_bs = commission
        ? s.sales_bs * (commission.commission_percentage / 100)
        : 0;
      const subtotal_bs = cuadre_bs - comision_bs;

      acc.sales_bs += s.sales_bs;
      acc.prizes_bs += s.prizes_bs;
      acc.comision_bs += comision_bs;
      acc.subtotal_bs += subtotal_bs;
      return acc;
    },
    { sales_bs: 0, prizes_bs: 0, comision_bs: 0, subtotal_bs: 0 }
  );

  const totalsUsd = data.reduce(
    (acc, s) => {
      const cuadre_usd = s.sales_usd - s.prizes_usd;
      const commission = commissions.get(s.system_id);
      
      const comision_usd = commission
        ? s.sales_usd * (commission.commission_percentage_usd / 100)
        : 0;
      const subtotal_usd = cuadre_usd - comision_usd;

      acc.sales_usd += s.sales_usd;
      acc.prizes_usd += s.prizes_usd;
      acc.comision_usd += comision_usd;
      acc.subtotal_usd += subtotal_usd;
      return acc;
    },
    { sales_usd: 0, prizes_usd: 0, comision_usd: 0, subtotal_usd: 0 }
  );

  return (
    <Tabs defaultValue="bolivares" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="bolivares">Bolívares</TabsTrigger>
        <TabsTrigger value="dolares">Dólares</TabsTrigger>
      </TabsList>

      <TabsContent value="bolivares" className="mt-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sistema</TableHead>
                <TableHead className="text-right">Ventas Bs</TableHead>
                <TableHead className="text-right">Premios Bs</TableHead>
                <TableHead className="text-right">Cuadre Bs</TableHead>
                <TableHead className="text-right">% Comisión</TableHead>
                <TableHead className="text-right bg-yellow-500/20">Comisión Bs</TableHead>
                <TableHead className="text-right font-semibold">SUB TOTAL Bs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => {
                const cuadre_bs = s.sales_bs - s.prizes_bs;
                const commission = commissions.get(s.system_id);
                const commission_percentage_bs = commission?.commission_percentage || 0;
                const comision_bs = commission
                  ? s.sales_bs * (commission_percentage_bs / 100)
                  : 0;
                const subtotal_bs = cuadre_bs - comision_bs;

                return (
                  <TableRow key={s.system_id}>
                    <TableCell className="font-medium">{s.system_name}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(s.sales_bs, "VES")}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(s.prizes_bs, "VES")}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(cuadre_bs, "VES")}</TableCell>
                    <TableCell className="text-right font-mono">{commission_percentage_bs.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono font-bold bg-yellow-500/20">
                      {formatCurrency(comision_bs, "VES")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {formatCurrency(subtotal_bs, "VES")}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell className="font-semibold">Totales</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(totalsBs.sales_bs, "VES")}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(totalsBs.prizes_bs, "VES")}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(totalsBs.sales_bs - totalsBs.prizes_bs, "VES")}</TableCell>
                <TableCell className="text-right font-mono font-semibold">-</TableCell>
                <TableCell className="text-right font-mono font-bold bg-yellow-500/20">
                  {formatCurrency(totalsBs.comision_bs, "VES")}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-primary">
                  {formatCurrency(totalsBs.subtotal_bs, "VES")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="dolares" className="mt-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sistema</TableHead>
                <TableHead className="text-right">Ventas USD</TableHead>
                <TableHead className="text-right">Premios USD</TableHead>
                <TableHead className="text-right">Cuadre USD</TableHead>
                <TableHead className="text-right">% Comisión</TableHead>
                <TableHead className="text-right bg-yellow-500/20">Comisión USD</TableHead>
                <TableHead className="text-right font-semibold">SUB TOTAL USD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => {
                const cuadre_usd = s.sales_usd - s.prizes_usd;
                const commission = commissions.get(s.system_id);
                const commission_percentage_usd = commission?.commission_percentage_usd || 0;
                const comision_usd = commission
                  ? s.sales_usd * (commission_percentage_usd / 100)
                  : 0;
                const subtotal_usd = cuadre_usd - comision_usd;

                return (
                  <TableRow key={s.system_id}>
                    <TableCell className="font-medium">{s.system_name}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(s.sales_usd, "USD")}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(s.prizes_usd, "USD")}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(cuadre_usd, "USD")}</TableCell>
                    <TableCell className="text-right font-mono">{commission_percentage_usd.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono font-bold bg-yellow-500/20">
                      {formatCurrency(comision_usd, "USD")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {formatCurrency(subtotal_usd, "USD")}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell className="font-semibold">Totales</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(totalsUsd.sales_usd, "USD")}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(totalsUsd.prizes_usd, "USD")}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(totalsUsd.sales_usd - totalsUsd.prizes_usd, "USD")}</TableCell>
                <TableCell className="text-right font-mono font-semibold">-</TableCell>
                <TableCell className="text-right font-mono font-bold bg-yellow-500/20">
                  {formatCurrency(totalsUsd.comision_usd, "USD")}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-primary">
                  {formatCurrency(totalsUsd.subtotal_usd, "USD")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
