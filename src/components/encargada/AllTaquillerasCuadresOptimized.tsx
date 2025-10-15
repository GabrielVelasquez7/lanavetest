import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarIcon,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Building2,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TaquilleraCuadreDetalle } from "./TaquilleraCuadreDetalle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface TaquilleraCuadre {
  id: string;
  session_id: string;
  session_date: string;
  user_id: string; // Add user_id field
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
  // New fields for complete cuadre calculation
  total_gastos_bs?: number;
  total_gastos_usd?: number;
  total_deudas_bs?: number;
  total_deudas_usd?: number;
  pago_movil_recibidos?: number;
  pago_movil_pagados?: number;
  premios_por_pagar?: number;
  cuadre_ventas_premios_bs?: number;
  cuadre_ventas_premios_usd?: number;
  total_banco?: number;
  excess_usd?: number;
  sumatoria_bolivares?: number;
  diferencia_cierre?: number;
  diferencia_final?: number;
  // Encargada review fields
  encargada_status?: string;
  encargada_observations?: string;
  encargada_reviewed_by?: string;
  encargada_reviewed_at?: string;
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
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingCuadre, setReviewingCuadre] = useState<TaquilleraCuadre | null>(null);
  const [reviewObservations, setReviewObservations] = useState("");
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
      const { data, error } = await supabase.from("agencies").select("*").eq("is_active", true).order("name");

      if (error) throw error;
      setAgencies(data || []);
    } catch (error: any) {
      console.error("Error fetching agencies:", error);
    }
  };

  const fetchCuadres = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      console.log("Fetching cuadres for date:", dateStr);

      // Query the summary table directly
      const { data: cuadresSummary, error: cuadresError } = await supabase
        .from("daily_cuadres_summary")
        .select("*")
        .eq("session_date", dateStr)
        .order("created_at", { ascending: false });

      console.log("Cuadres summary found:", cuadresSummary?.length || 0, cuadresSummary);

      if (cuadresError) {
        console.error("Cuadres error:", cuadresError);
        throw cuadresError;
      }

      if (!cuadresSummary || cuadresSummary.length === 0) {
        setAgencyGroups([]);
        return;
      }

      // Fetch user profiles for the found cuadres, filtering only taquilleras
      const userIds = [...new Set(cuadresSummary.map((c) => c.user_id))];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, agency_id, role")
        .in("user_id", userIds)
        .eq("role", "taquillero");

      console.log("Profiles found:", profiles?.length || 0, profiles);

      if (profilesError) {
        console.error("Profiles error:", profilesError);
      }

      // Fetch agency data separately for found profiles
      const agencyIds = [...new Set(cuadresSummary.map((c) => c.agency_id).filter(Boolean))];
      let agenciesMap: Record<string, any> = {};

      if (agencyIds.length > 0) {
        const { data: agenciesData, error: agenciesError } = await supabase
          .from("agencies")
          .select("id, name")
          .in("id", agencyIds);

        console.log("Agencies found:", agenciesData?.length || 0, agenciesData);

        if (!agenciesError && agenciesData) {
          agenciesMap = agenciesData.reduce(
            (acc, agency) => {
              acc[agency.id] = agency;
              return acc;
            },
            {} as Record<string, any>,
          );
        }
      }

      // Create a map of profiles by user_id
      const profilesMap =
        profiles?.reduce(
          (acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          },
          {} as Record<string, any>,
        ) || {};

      // Transform data to match existing interface - only include taquilleras
      const cuadresWithData = cuadresSummary
        .filter((cuadre) => profilesMap[cuadre.user_id]) // Only include users with taquillero role
        .map((cuadre) => {
          const profile = profilesMap[cuadre.user_id];
          const agency = agenciesMap[cuadre.agency_id];

          return {
            id: cuadre.id,
            session_id: cuadre.session_id,
            session_date: cuadre.session_date,
            user_id: cuadre.user_id, // Add user_id
            user_name: profile?.full_name || "Usuario desconocido",
            agency_id: cuadre.agency_id || profile?.agency_id || "sin-agencia",
            agency_name: agency?.name || "Sin agencia",
            is_closed: cuadre.is_closed,
            daily_closure_confirmed: cuadre.daily_closure_confirmed,
            cash_available_bs: cuadre.cash_available_bs || 0,
            cash_available_usd: cuadre.cash_available_usd || 0,
            exchange_rate: cuadre.exchange_rate || 36,
            notes: cuadre.notes || "",
            closure_notes: cuadre.closure_notes || "",
            total_sales_bs: cuadre.total_sales_bs || 0,
            total_sales_usd: cuadre.total_sales_usd || 0,
            total_prizes_bs: cuadre.total_prizes_bs || 0,
            total_prizes_usd: cuadre.total_prizes_usd || 0,
            // Updated fields for complete cuadre calculation
            total_gastos_bs: (cuadre.total_expenses_bs || 0) - (cuadre.total_debt_bs || 0),
            total_gastos_usd: (cuadre.total_expenses_usd || 0) - (cuadre.total_debt_usd || 0),
            total_deudas_bs: cuadre.total_debt_bs || 0,
            total_deudas_usd: cuadre.total_debt_usd || 0,
            pago_movil_recibidos: Math.max(cuadre.total_mobile_payments_bs || 0, 0),
            pago_movil_pagados: Math.abs(Math.min(cuadre.total_mobile_payments_bs || 0, 0)),
            premios_por_pagar: (cuadre as any).pending_prizes || 0,
            cuadre_ventas_premios_bs: (cuadre.total_sales_bs || 0) - (cuadre.total_prizes_bs || 0),
            cuadre_ventas_premios_usd: (cuadre.total_sales_usd || 0) - (cuadre.total_prizes_usd || 0),
            total_banco: 0, // Removed field
            excess_usd: cuadre.excess_usd || 0,
            sumatoria_bolivares:
              (cuadre.total_sales_bs || 0) +
              (cuadre.total_pos_bs || 0) +
              Math.max(cuadre.total_mobile_payments_bs || 0, 0),
            diferencia_cierre: cuadre.diferencia_final || 0,
            diferencia_final: cuadre.diferencia_final || 0,
            // Encargada review fields
            encargada_status: cuadre.encargada_status || "pendiente",
            encargada_observations: cuadre.encargada_observations || "",
            encargada_reviewed_by: cuadre.encargada_reviewed_by,
            encargada_reviewed_at: cuadre.encargada_reviewed_at,
          } as TaquilleraCuadre;
        });

      console.log("Final cuadres with data:", cuadresWithData);

      // Group by agency
      const groupedByAgency = cuadresWithData.reduce(
        (acc, cuadre) => {
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
        },
        {} as Record<string, AgencyGroup>,
      );

      // Calculate stats for each agency
      const agencyGroupsArray = Object.values(groupedByAgency).map((group) => ({
        ...group,
        total_taquilleras: group.cuadres.length,
        confirmed_cuadres: group.cuadres.filter((c) => c.daily_closure_confirmed).length,
        balanced_cuadres: group.cuadres.filter((c) => {
          const balance = calculateBalance(c);
          return Math.abs(balance) <= 100;
        }).length,
      }));

      console.log("Final agency groups:", agencyGroupsArray);
      setAgencyGroups(agencyGroupsArray);
    } catch (error: any) {
      console.error("Error in fetchCuadres:", error);
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
      filtered = filtered.filter((group) => group.agency_id === selectedAgency);
    }

    if (searchTerm) {
      filtered = filtered
        .map((group) => ({
          ...group,
          cuadres: group.cuadres.filter((cuadre) => cuadre.user_name.toLowerCase().includes(searchTerm.toLowerCase())),
        }))
        .filter((group) => group.cuadres.length > 0);
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

  const getEncargadaStatusBadge = (status: string) => {
    switch (status) {
      case "aprobado":
        return (
          <Badge variant="default" className="bg-green-600">
            Aprobado
          </Badge>
        );
      case "rechazado":
        return <Badge variant="destructive">Rechazado</Badge>;
      case "pendiente":
      default:
        return <Badge variant="outline">Pendiente Revisión</Badge>;
    }
  };

  const openReviewDialog = (cuadre: TaquilleraCuadre) => {
    setReviewingCuadre(cuadre);
    setReviewObservations(cuadre.encargada_observations || "");
    setReviewDialogOpen(true);
  };

  const submitReview = async (status: "aprobado" | "rechazado") => {
    if (!reviewingCuadre) return;

    try {
      // Get current user info
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("🔍 REVIEW DEBUG - User:", user);
      console.log("🔍 REVIEW DEBUG - Cuadre ID:", reviewingCuadre.id);
      console.log("🔍 REVIEW DEBUG - Status:", status);
      console.log("🔍 REVIEW DEBUG - Observations:", reviewObservations);

      const updateData = {
        encargada_status: status,
        encargada_observations: reviewObservations || null,
        encargada_reviewed_by: user?.id,
        encargada_reviewed_at: new Date().toISOString(),
      };

      console.log("🔍 REVIEW DEBUG - Update data:", updateData);

      const { data, error } = await supabase
        .from("daily_cuadres_summary")
        .update(updateData)
        .eq("id", reviewingCuadre.id)
        .select();

      console.log("🔍 REVIEW DEBUG - Update result:", { data, error });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Cuadre ${status === "aprobado" ? "aprobado" : "rechazado"} correctamente`,
      });

      setReviewDialogOpen(false);
      setReviewingCuadre(null);
      setReviewObservations("");
      fetchCuadres();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al revisar el cuadre",
        variant: "destructive",
      });
    }
  };

  const calculateBalance = (cuadre: TaquilleraCuadre) => {
    // Use the pre-calculated diferencia_final from the summary table (already includes premios por pagar subtraction)
    return (cuadre as any).diferencia_final || 0;
  };

  // Calculate meaningful metrics instead of basic counts
  const allCuadres = agencyGroups.flatMap((group) => group.cuadres);
  const balancesCorrectos = allCuadres.filter((cuadre) => {
    const balance = calculateBalance(cuadre);
    return Math.abs(balance) <= 100;
  }).length;
  const diferenciasEncontradas = allCuadres.filter((cuadre) => {
    const balance = calculateBalance(cuadre);
    return Math.abs(balance) > 100;
  }).length;
  const totalDiferencia = allCuadres.reduce((sum, cuadre) => {
    const balance = calculateBalance(cuadre);
    return sum + Math.abs(balance);
  }, 0);

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
                    className={cn("w-52 justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Balances Correctos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-800">{balancesCorrectos}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Diferencias Encontradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-800">{diferenciasEncontradas}</p>
            <p className="text-xs text-red-600 mt-1"></p>
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
              <p className="text-muted-foreground">No se encontraron cuadres para la fecha y filtros seleccionados.</p>
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
                      {group.total_taquilleras} taquilleras • {group.confirmed_cuadres} confirmados •{" "}
                      {group.balanced_cuadres} balanceados
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
                    <Card
                      key={cuadre.session_id}
                      className={cn("border-l-4", isBalanced ? "border-l-green-500" : "border-l-red-500")}
                    >
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mb-2"
                              onClick={() => setSelectedCuadre(cuadre)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Cuadre Detallado - {cuadre.user_name}</DialogTitle>
                            </DialogHeader>
                            <TaquilleraCuadreDetalle
                              userId={cuadre.user_id}
                              selectedDate={selectedDate}
                              userFullName={cuadre.user_name}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => openReviewDialog(cuadre)}
                        >
                          Revisar Cuadre
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revisar Cuadre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Taquillera: {reviewingCuadre?.user_name}</p>
              <p className="text-sm text-muted-foreground">Fecha: {reviewingCuadre?.session_date}</p>
              <p className="text-sm">Diferencia: Bs {reviewingCuadre?.diferencia_final?.toLocaleString() || "0"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea
                placeholder="Escribe tus observaciones aquí..."
                value={reviewObservations}
                onChange={(e) => setReviewObservations(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex space-x-2">
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => submitReview("aprobado")}
              >
                Aprobar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => submitReview("rechazado")}>
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-muted-foreground">{children}</label>;
}
