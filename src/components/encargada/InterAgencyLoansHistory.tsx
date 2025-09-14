import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RefreshCw, CheckCircle, XCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Loan {
  id: string;
  from_agency: { name: string };
  to_agency: { name: string };
  amount_bs: number;
  amount_usd: number;
  loan_date: string;
  due_date?: string | null;
  reason: string;
  description?: string | null;
  status: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  from_agency_id: string;
  to_agency_id: string;
}

interface InterAgencyLoansHistoryProps {
  refreshTrigger?: number;
}

export function InterAgencyLoansHistory({ refreshTrigger }: InterAgencyLoansHistoryProps) {
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchLoans();
  }, [refreshTrigger]);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inter_agency_loans')
        .select(`
          *,
          from_agency:agencies!from_agency_id(name),
          to_agency:agencies!to_agency_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los préstamos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLoanStatus = async (loanId: string, newStatus: 'pagado' | 'vencido') => {
    try {
      const { error } = await supabase
        .from('inter_agency_loans')
        .update({ status: newStatus })
        .eq('id', loanId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Préstamo marcado como ${newStatus}`,
      });

      fetchLoans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del préstamo",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'pagado':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Pagado</Badge>;
      case 'vencido':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Vencido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReasonDisplay = (reason: string) => {
    const reasons: Record<string, string> = {
      premios: "Premios",
      sencillo_divisas: "Sencillo USD",
      sencillo_bolivares: "Sencillo Bs",
      operativo: "Operativo",
      emergencia: "Emergencia",
      otro: "Otro"
    };
    return reasons[reason] || reason;
  };

  const filteredLoans = loans.filter(loan => 
    statusFilter === "all" || loan.status === statusFilter
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Cargando préstamos...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historial de Préstamos Entre Agencias</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="pagado">Pagados</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchLoans} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLoans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron préstamos
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead>Monto Bs</TableHead>
                  <TableHead>Monto USD</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      {format(new Date(loan.loan_date), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {loan.from_agency.name}
                    </TableCell>
                    <TableCell className="font-medium">
                      {loan.to_agency.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getReasonDisplay(loan.reason)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {loan.amount_bs > 0 && (
                        <span className="font-mono">
                          {loan.amount_bs.toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} Bs
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {loan.amount_usd > 0 && (
                        <span className="font-mono">
                          ${loan.amount_usd.toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {loan.due_date ? (
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(loan.due_date), "dd/MM/yyyy", { locale: es })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(loan.status)}
                    </TableCell>
                    <TableCell>
                      {loan.status === 'pendiente' && (
                        <div className="flex space-x-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Marcar Pagado
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Pago</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Está seguro que desea marcar este préstamo como pagado?
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => updateLoanStatus(loan.id, 'pagado')}
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <XCircle className="h-3 w-3 mr-1" />
                                Marcar Vencido
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Marcar como Vencido</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Está seguro que desea marcar este préstamo como vencido?
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => updateLoanStatus(loan.id, 'vencido')}
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}