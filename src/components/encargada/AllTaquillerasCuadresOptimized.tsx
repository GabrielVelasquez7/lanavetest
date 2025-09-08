import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Users, Search, CheckCircle2, AlertCircle, Eye, Building2, TrendingUp, DollarSign } from "lucide-react";
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
  agency_id: string;
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

interface AgencyGroup {
  agency_id: string;
  agency_name: string;
  cuadres: TaquilleraCuadre[];
  total_taquilleras: number;
  confirmed_cuadres: number;
  balanced_cuadres: number;
}

export function AllTaquillerasCuadresOptimized() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [agencies, setAgencies] = useState<any[]>([]);
  const [agencyGroups, setAgencyGroups] = useState<AgencyGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<AgencyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCuadre, setSelectedCuadre] = useState<TaquilleraCuadre | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgencies();
  }, []);

  useEffect(() => {
    fetchCuadres();
  }, [selectedDate]);

  useEffect(() => {
    filterGroups();
  }, [agencyGroups, searchTerm, selectedAgency]);

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgencies(data || []);
    } catch (error: any) {
      console.error('Error fetching agencies:', error);
    }
  };

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
      
      if (userIds.length === 0) {
        setAgencyGroups([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          agency_id
        `)
        .in('user_id', userIds);

      // Fetch agency data separately
      const agencyIds = [...new Set(profiles?.map(p => p.agency_id).filter(Boolean) || [])];
      let agenciesMap: Record<string, any> = {};
      
      if (agencyIds.length > 0) {
        const { data: agenciesData } = await supabase
          .from('agencies')
          .select('id, name')
          .in('id', agencyIds);
        
        agenciesMap = agenciesData?.reduce((acc, agency) => {
          acc[agency.id] = agency;
          return acc;
        }, {} as Record<string, any>) || {};
      }

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
          const agency = profile?.agency_id ? agenciesMap[profile.agency_id] : null;

          return {
            session_id: session.id,
            session_date: session.session_date,
            user_name: profile?.full_name || 'Usuario desconocido',
            agency_id: profile?.agency_id || 'sin-agencia',
            agency_name: agency?.name || 'Sin agencia',
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

      // Group by agency
      const groupedByAgency = cuadresWithTotals.reduce((acc, cuadre) => {
        if (!acc[cuadre.agency_id]) {
          acc[cuadre.agency_id] = {
            agency_id: cuadre.agency_id,
            agency_name: cuadre.agency_name,
            cuadres: [],
            total_taquilleras: 0,
            confirmed_cuadres: 0,
            balanced_cuadres: 0,
          };
        }
        acc[cuadre.agency_id].cuadres.push(cuadre);
        return acc;
      }, {} as Record<string, AgencyGroup>);

      // Calculate stats for each agency
      const agencyGroupsArray = Object.values(groupedByAgency).map(group => ({
        ...group,
        total_taquilleras: group.cuadres.length,
        confirmed_cuadres: group.cuadres.filter(c => c.daily_closure_confirmed).length,
        balanced_cuadres: group.cuadres.filter(c => {
          const balance = calculateBalance(c);
          return Math.abs(balance) <= 100;
        }).length,
      }));

      setAgencyGroups(agencyGroupsArray);
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

  const filterGroups = () => {
    let filtered = agencyGroups;

    if (selectedAgency !== "all") {
      filtered = filtered.filter(group => group.agency_id === selectedAgency);
    }

    if (searchTerm) {
      filtered = filtered.map(group => ({
        ...group,
        cuadres: group.cuadres.filter(cuadre => 
          cuadre.user_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(group => group.cuadres.length > 0);
    }

    setFilteredGroups(filtered);
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

  const totalTaquilleras = agencyGroups.reduce((sum, group) => sum + group.total_taquilleras, 0);
  const totalConfirmed = agencyGroups.reduce((sum, group) => sum + group.confirmed_cuadres, 0);
  const totalBalanced = agencyGroups.reduce((sum, group) => sum + group.balanced_cuadres, 0);

  if (loading) {
    return <div className="p-6">Cargando cuadres...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-xl">Supervisión de Cuadres por Agencia</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Monitoreo y supervisión de cuadres de taquilleras organizados por agencia
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger className="w-48">
                  <Building2 className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Agencias</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar taquillera..."
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
                      "w-52 justify-start text-left font-normal",
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
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Taquilleras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-800">{totalTaquilleras}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Cuadres Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-800">{totalConfirmed}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Cuadres Balanceados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-800">{totalBalanced}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Agencias Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-800">{filteredGroups.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Agency Groups */}
      {filteredGroups.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No hay cuadres para mostrar</h3>
              <p className="text-muted-foreground">
                No se encontraron cuadres para la fecha y filtros seleccionados.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        filteredGroups.map((group) => (
          <Card key={group.agency_id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-slate-600" />
                  <div>
                    <CardTitle className="text-lg">{group.agency_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {group.total_taquilleras} taquilleras • {group.confirmed_cuadres} confirmados • {group.balanced_cuadres} balanceados
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={group.confirmed_cuadres === group.total_taquilleras ? "default" : "secondary"}>
                    {Math.round((group.confirmed_cuadres / group.total_taquilleras) * 100)}% Confirmados
                  </Badge>
                  <Badge variant={group.balanced_cuadres === group.total_taquilleras ? "default" : "destructive"}>
                    {Math.round((group.balanced_cuadres / group.total_taquilleras) * 100)}% Balanceados
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.cuadres.map((cuadre) => {
                  const balance = calculateBalance(cuadre);
                  const isBalanced = Math.abs(balance) <= 100;

                  return (
                    <Card key={cuadre.session_id} className={cn(
                      "border-l-4",
                      isBalanced ? "border-l-green-500" : "border-l-red-500"
                    )}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{cuadre.user_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{cuadre.agency_name}</p>
                          </div>
                          {getStatusBadge(cuadre)}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Ventas:</span>
                            <p className="font-medium">Bs {cuadre.total_sales_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Premios:</span>
                            <p className="font-medium">Bs {cuadre.total_prizes_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Efectivo:</span>
                            <p className="font-medium">Bs {cuadre.cash_available_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tasa:</span>
                            <p className="font-medium">{cuadre.exchange_rate}</p>
                          </div>
                        </div>

                        <div className={cn(
                          "text-center p-2 rounded border-t",
                          isBalanced ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                        )}>
                          <p className="font-semibold text-sm">
                            Balance: Bs {balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs">
                            {isBalanced ? "✅ Perfecto" : "⚠️ Con diferencia"}
                          </p>
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-muted-foreground">{children}</label>;
}