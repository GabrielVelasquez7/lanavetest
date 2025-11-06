import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { ExpenseDetail } from "@/hooks/useWeeklyCuadre";

interface Props {
  expenses: ExpenseDetail[];
  title: string;
}

export function ExpensesTable({ expenses, title }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No hay {title.toLowerCase()} registrados esta semana
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Bolívares</TableHead>
            <TableHead className="text-right">Dólares</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="font-medium">
                {format(new Date(expense.date), "dd/MM/yyyy")}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {expense.description || "Sin descripción"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(expense.amount_bs, "VES")}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(expense.amount_usd, "USD")}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(
                expenses.reduce((sum, e) => sum + e.amount_bs, 0),
                "VES"
              )}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(
                expenses.reduce((sum, e) => sum + e.amount_usd, 0),
                "USD"
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
