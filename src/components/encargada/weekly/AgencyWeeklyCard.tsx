import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, TrendingDown, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { AgencyWeeklySummary } from "@/hooks/useWeeklyCuadre";
import { PerSystemTable } from "./PerSystemTable";

interface Props {
  summary: AgencyWeeklySummary;
}

export function AgencyWeeklyCard({ summary }: Props) {
  const hasActivity =
    summary.total_sales_bs > 0 ||
    summary.total_sales_usd > 0 ||
    summary.total_prizes_bs > 0 ||
    summary.total_prizes_usd > 0 ||
    summary.total_deudas_bs > 0 ||
    summary.total_gastos_bs > 0 ||
    summary.total_banco_bs > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {summary.agency_name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Tasa (Domingo): {formatCurrency(summary.sunday_exchange_rate, "VES")}
            </p>
          </div>
          {!hasActivity && <Badge variant="secondary">Sin datos</Badge>}
        </div>
      </CardHeader>

      {hasActivity && (
        <CardContent className="pt-6 space-y-6">
          {/* Resumen principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Ventas */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Ventas Totales</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Bolívares:</span>
                  <span className="font-mono font-semibold">{formatCurrency(summary.total_sales_bs, "VES")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Dólares:</span>
                  <span className="font-mono font-semibold">{formatCurrency(summary.total_sales_usd, "USD")}</span>
                </div>
              </div>
            </div>

            {/* Premios */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Premios Totales</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Bolívares:</span>
                  <span className="font-mono font-semibold">{formatCurrency(summary.total_prizes_bs, "VES")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Dólares:</span>
                  <span className="font-mono font-semibold">{formatCurrency(summary.total_prizes_usd, "USD")}</span>
                </div>
              </div>
            </div>

            {/* Total en banco (destacado) */}
            <div className="space-y-2 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
              <h4 className="font-semibold text-sm text-primary uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Total en Banco
              </h4>
              <div className="flex justify-between">
                <span className="text-sm">Bolívares:</span>
                <span className="font-mono font-bold text-lg text-primary">{formatCurrency(summary.total_banco_bs, "VES")}</span>
              </div>
            </div>

            {/* Deudas (destacado) */}
            <div className="space-y-2 p-4 rounded-lg border-2 border-destructive/20 bg-destructive/5">
              <h4 className="font-semibold text-sm text-destructive uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="h-4 w-4" /> Deudas Totales
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Bolívares:</span>
                  <span className="font-mono font-bold text-destructive">{formatCurrency(summary.total_deudas_bs, "VES")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Dólares:</span>
                  <span className="font-mono font-bold text-destructive">{formatCurrency(summary.total_deudas_usd, "USD")}</span>
                </div>
              </div>
            </div>

            {/* Gastos (destacado) */}
            <div className="space-y-2 p-4 rounded-lg border-2 border-orange-500/20 bg-orange-500/5">
              <h4 className="font-semibold text-sm text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="h-4 w-4" /> Gastos Totales
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Bolívares:</span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{formatCurrency(summary.total_gastos_bs, "VES")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Dólares:</span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{formatCurrency(summary.total_gastos_usd, "USD")}</span>
                </div>
              </div>
            </div>

            {/* Premios por pagar */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Premios por Pagar</h4>
              <div className="flex justify-between">
                <span className="text-sm">Bolívares:</span>
                <span className="font-mono font-semibold">{formatCurrency(summary.premios_por_pagar_bs, "VES")}</span>
              </div>
            </div>
          </div>

          {/* Detalle por sistema */}
          {summary.per_system?.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="sistemas">
                <AccordionTrigger>Detalle por sistema</AccordionTrigger>
                <AccordionContent>
                  <PerSystemTable data={summary.per_system} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      )}
    </Card>
  );
}
