import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Eye, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface WeeklyHistory {
  id: string;
  week_start_date: string;
  week_end_date: string;
  week_number: number;
  year: number;
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  total_balance_bs: number;
  total_balance_usd: number;
  total_sessions: number;
  is_closed: boolean;
  closure_notes: string;
  created_at: string;
}

interface DailyDetail {
  day_date: string;
  day_name: string;
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  balance_bs: number;
  balance_usd: number;
  sessions_count: number;
  is_completed: boolean;
}

export function WeeklyCuadreHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<WeeklyHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyHistory | null>(null);
  const [weekDetails, setWeekDetails] = useState<DailyDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weekly_cuadres_summary')
        .select('*')
        .eq('encargada_id', user?.id)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el histórico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWeekDetails = async (weekId: string) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('weekly_cuadres_details')
        .select('*')
        .eq('weekly_summary_id', weekId)
        .order('day_date');

      if (error) throw error;
      setWeekDetails(data || []);
    } catch (error: any) {
      console.error('Error fetching week details:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la semana",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const openWeekDetails = (week: WeeklyHistory) => {
    setSelectedWeek(week);
    fetchWeekDetails(week.id);
  };

  const formatCurrency = (amount: number, currency: 'bs' | 'usd') => {
    if (currency === 'usd') {
      return `$${Number(amount).toLocaleString('es-VE')}`;
    }
    return `${Number(amount).toLocaleString('es-VE')} Bs`;
  };

  if (loading) {
    return <div className="p-6">Cargando histórico...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Cuadres Semanales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay cuadres semanales registrados
            </p>
          ) : (
            <div className="space-y-4">
              {history.map((week) => (
                <Card key={week.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">
                          Semana {week.week_number} - {week.year}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(week.week_start_date), 'dd MMM', { locale: es })} - {format(new Date(week.week_end_date), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={week.is_closed ? "default" : "secondary"}>
                          {week.is_closed ? "Cerrada" : "Activa"}
                        </Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openWeekDetails(week)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalles
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Detalles - Semana {selectedWeek?.week_number} - {selectedWeek?.year}
                              </DialogTitle>
                            </DialogHeader>
                            {selectedWeek && (
                              <div className="space-y-6">
                                {/* Weekly Summary */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Resumen Semanal</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                      <div className="text-center">
                                        <p className="text-sm text-muted-foreground">Ventas Bs</p>
                                        <p className="text-xl font-bold text-green-600">
                                          {formatCurrency(selectedWeek.total_sales_bs, 'bs')}
                                        </p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-sm text-muted-foreground">Ventas USD</p>
                                        <p className="text-xl font-bold text-green-600">
                                          {formatCurrency(selectedWeek.total_sales_usd, 'usd')}
                                        </p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-sm text-muted-foreground">Premios Bs</p>
                                        <p className="text-xl font-bold text-red-600">
                                          {formatCurrency(selectedWeek.total_prizes_bs, 'bs')}
                                        </p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-sm text-muted-foreground">Premios USD</p>
                                        <p className="text-xl font-bold text-red-600">
                                          {formatCurrency(selectedWeek.total_prizes_usd, 'usd')}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div className="text-center p-3 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Balance Bs</p>
                                        <p className={`text-2xl font-bold ${Number(selectedWeek.total_balance_bs) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatCurrency(selectedWeek.total_balance_bs, 'bs')}
                                        </p>
                                      </div>
                                      <div className="text-center p-3 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Balance USD</p>
                                        <p className={`text-2xl font-bold ${Number(selectedWeek.total_balance_usd) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatCurrency(selectedWeek.total_balance_usd, 'usd')}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-center">
                                      <p className="text-sm text-muted-foreground">Total de Sesiones</p>
                                      <p className="text-lg font-semibold">{selectedWeek.total_sessions}</p>
                                    </div>

                                    {selectedWeek.closure_notes && (
                                      <div className="mt-4 p-3 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Notas de Cierre:</p>
                                        <p className="text-sm">{selectedWeek.closure_notes}</p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Daily Details */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Desglose Diario</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    {loadingDetails ? (
                                      <p className="text-center py-4">Cargando detalles...</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {weekDetails.map((day) => (
                                          <Collapsible key={day.day_date}>
                                            <CollapsibleTrigger className="w-full">
                                              <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                                                <div className="flex items-center gap-3">
                                                  <div className={`w-3 h-3 rounded-full ${day.is_completed ? 'bg-green-500' : 'bg-red-500'}`} />
                                                  <div className="text-left">
                                                    <p className="font-medium">{day.day_name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                      {format(new Date(day.day_date), 'dd/MM/yyyy')}
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <div className="text-right">
                                                    <p className={`text-sm font-medium ${Number(day.balance_bs) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                      Balance: {formatCurrency(day.balance_bs, 'bs')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      {day.sessions_count} sesión(es)
                                                    </p>
                                                  </div>
                                                  <ChevronDown className="h-4 w-4" />
                                                </div>
                                              </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <div className="ml-6 mr-2 mt-2 p-3 bg-background border rounded-lg">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                  <div>
                                                    <p className="text-muted-foreground">Ventas Bs:</p>
                                                    <p className="font-medium text-green-600">
                                                      {formatCurrency(day.total_sales_bs, 'bs')}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-muted-foreground">Ventas USD:</p>
                                                    <p className="font-medium text-green-600">
                                                      {formatCurrency(day.total_sales_usd, 'usd')}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-muted-foreground">Premios Bs:</p>
                                                    <p className="font-medium text-red-600">
                                                      {formatCurrency(day.total_prizes_bs, 'bs')}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-muted-foreground">Premios USD:</p>
                                                    <p className="font-medium text-red-600">
                                                      {formatCurrency(day.total_prizes_usd, 'usd')}
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            </CollapsibleContent>
                                          </Collapsible>
                                        ))}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground">Ventas Bs</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(week.total_sales_bs, 'bs')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Ventas USD</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(week.total_sales_usd, 'usd')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Premios Bs</p>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(week.total_prizes_bs, 'bs')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Premios USD</p>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(week.total_prizes_usd, 'usd')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Balance Total</p>
                        <p className={`font-semibold ${Number(week.total_balance_bs) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(week.total_balance_bs, 'bs')}
                        </p>
                        <p className={`text-xs ${Number(week.total_balance_usd) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(week.total_balance_usd, 'usd')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{week.total_sessions} sesión(es) registradas</span>
                        <span>Creado: {format(new Date(week.created_at), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}