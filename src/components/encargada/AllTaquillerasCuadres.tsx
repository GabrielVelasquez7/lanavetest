import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users, Search, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TaquilleraCuadre {
  session_id: string;
  session_date: string;
  user_name: string;
  agency_name: string;
  is_closed: boolean;
  daily_closure_confirmed: boolean;
  cash_available_bs: number;
  cash_available_usd: number;
  exchange_rate: number;
  notes: string;
  closure_notes: string;
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
}

export function AllTaquillerasCuadres() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [cuadres, setCuadres] = useState<TaquilleraCuadre[]>([]);
  const [filteredCuadres, setFilteredCuadres] = useState<TaquilleraCuadre[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCuadre, setSelectedCuadre] = useState<TaquilleraCuadre | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCuadres();
  }, [selectedDate]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredCuadres(
        cuadres.filter(cuadre => 
          cuadre.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cuadre.agency_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredCuadres(cuadres);
    }
  }, [cuadres, searchTerm]);

  const fetchCuadres = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log('Fetching cuadres for date:', dateStr);
      
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select(`
          id,
          session_date,
          is_closed,
          daily_closure_confirmed,
          cash_available_bs,
          cash_available_usd,
          exchange_rate,
          notes,
          closure_notes,
          user_id
        `)
        .eq('session_date', dateStr)
        .order('created_at', { ascending: false });

      console.log('Sessions found:', sessions?.length || 0, sessions);

      if (sessionsError) {
        console.error('Sessions error:', sessionsError);
        throw sessionsError;
      }

      // Fetch user profiles separately
      const userIds = [...new Set(sessions?.map(s => s.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          agencies (name)
        `)
        .in('user_id', userIds);

      console.log('Profiles found:', profiles?.length || 0, profiles);
      
      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw profilesError;
      }

      // Create a map of profiles by user_id
      const profilesMap = profiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      // Fetch sales and prizes for each session
      const cuadresWithTotals = await Promise.all(
        (sessions || []).map(async (session) => {
          const [salesResult, prizesResult] = await Promise.all([
            supabase
              .from('sales_transactions')
              .select('amount_bs, amount_usd')
              .eq('session_id', session.id),
            supabase
              .from('prize_transactions')
              .select('amount_bs, amount_usd')
              .eq('session_id', session.id)
          ]);

          const totalSalesBs = salesResult.data?.reduce((sum, sale) => sum + (sale.amount_bs || 0), 0) || 0;
          const totalSalesUsd = salesResult.data?.reduce((sum, sale) => sum + (sale.amount_usd || 0), 0) || 0;
          const totalPrizesBs = prizesResult.data?.reduce((sum, prize) => sum + (prize.amount_bs || 0), 0) || 0;
          const totalPrizesUsd = prizesResult.data?.reduce((sum, prize) => sum + (prize.amount_usd || 0), 0) || 0;

          const profile = profilesMap[session.user_id];
          
          return {
            session_id: session.id,
            session_date: session.session_date,
            user_name: profile?.full_name || 'Usuario desconocido',
            agency_name: profile?.agencies?.name || 'Sin agencia',
            is_closed: session.is_closed,
            daily_closure_confirmed: session.daily_closure_confirmed,
            cash_available_bs: session.cash_available_bs || 0,
            cash_available_usd: session.cash_available_usd || 0,
            exchange_rate: session.exchange_rate || 36,
            notes: session.notes || '',
            closure_notes: session.closure_notes || '',
            total_sales_bs: totalSalesBs,
            total_sales_usd: totalSalesUsd,
            total_prizes_bs: totalPrizesBs,
            total_prizes_usd: totalPrizesUsd,
          } as TaquilleraCuadre;
        })
      );

      setCuadres(cuadresWithTotals);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los cuadres de taquilleras",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (cuadre: TaquilleraCuadre) => {
    if (cuadre.daily_closure_confirmed) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Confirmado
        </Badge>
      );
    }
    if (cuadre.is_closed) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Cerrado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Abierto
      </Badge>
    );
  };

  const calculateBalance = (cuadre: TaquilleraCuadre) => {
    const totalIncomeBs = cuadre.total_sales_bs + cuadre.total_sales_usd * cuadre.exchange_rate;
    const availableBs = cuadre.cash_available_bs + cuadre.cash_available_usd * cuadre.exchange_rate;
    const balanceBs = availableBs - totalIncomeBs + cuadre.total_prizes_bs + cuadre.total_prizes_usd * cuadre.exchange_rate;
    return balanceBs;
  };

  if (loading) {
    return <div className="p-6">Cargando cuadres...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Supervisión de Cuadres - Todas las Taquilleras</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar taquillera o agencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCuadres.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay cuadres registrados para la fecha seleccionada
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCuadres.map((cuadre) => {
              const balance = calculateBalance(cuadre);
              const isBalanced = Math.abs(balance) <= 100; // 100 Bs tolerance

              return (
                <Card key={cuadre.session_id} className={cn(
                  "p-4",
                  isBalanced ? "border-green-200" : "border-red-200"
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{cuadre.user_name}</h4>
                      <p className="text-sm text-muted-foreground">{cuadre.agency_name}</p>
                    </div>
                    {getStatusBadge(cuadre)}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Ventas:</span>
                      <span>Bs {cuadre.total_sales_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Premios:</span>
                      <span>Bs {cuadre.total_prizes_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Efectivo:</span>
                      <span>Bs {cuadre.cash_available_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className={cn(
                      "flex justify-between text-sm font-semibold pt-2 border-t",
                      isBalanced ? "text-green-600" : "text-red-600"
                    )}>
                      <span>Balance:</span>
                      <span>Bs {balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedCuadre(cuadre)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          Detalles del Cuadre - {cuadre.user_name}
                        </DialogTitle>
                      </DialogHeader>
                      {selectedCuadre && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Taquillera</Label>
                              <p className="font-semibold">{selectedCuadre.user_name}</p>
                            </div>
                            <div>
                              <Label>Agencia</Label>
                              <p className="font-semibold">{selectedCuadre.agency_name}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Total Ventas Bs</Label>
                              <p className="text-lg font-bold text-green-600">
                                Bs {selectedCuadre.total_sales_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <Label>Total Ventas USD</Label>
                              <p className="text-lg font-bold text-green-600">
                                $ {selectedCuadre.total_sales_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Total Premios Bs</Label>
                              <p className="text-lg font-bold text-red-600">
                                Bs {selectedCuadre.total_prizes_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <Label>Total Premios USD</Label>
                              <p className="text-lg font-bold text-red-600">
                                $ {selectedCuadre.total_prizes_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Efectivo Disponible Bs</Label>
                              <p className="text-lg font-bold">
                                Bs {selectedCuadre.cash_available_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <Label>Efectivo Disponible USD</Label>
                              <p className="text-lg font-bold">
                                $ {selectedCuadre.cash_available_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label>Tasa de Cambio</Label>
                            <p className="text-lg font-bold">
                              Bs {selectedCuadre.exchange_rate.toLocaleString('es-VE', { minimumFractionDigits: 2 })} / USD
                            </p>
                          </div>

                          {selectedCuadre.notes && (
                            <div>
                              <Label>Notas</Label>
                              <p className="p-2 bg-muted rounded">{selectedCuadre.notes}</p>
                            </div>
                          )}

                          {selectedCuadre.closure_notes && (
                            <div>
                              <Label>Notas de Cierre</Label>
                              <p className="p-2 bg-muted rounded">{selectedCuadre.closure_notes}</p>
                            </div>
                          )}

                          <div className="pt-4 border-t">
                            <div className={cn(
                              "text-center p-4 rounded",
                              isBalanced ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                            )}>
                              <p className="font-semibold">
                                Balance Final: Bs {calculateBalance(selectedCuadre).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-sm mt-1">
                                {isBalanced ? "✅ Cuadre perfecto (dentro de tolerancia)" : "⚠️ Cuadre con diferencia"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-muted-foreground">{children}</label>;
}