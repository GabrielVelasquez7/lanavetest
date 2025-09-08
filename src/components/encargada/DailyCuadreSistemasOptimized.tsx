import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Save, Calculator, Building2, CheckCircle2, AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SystemCuadreData {
  lottery_system_id: string;
  system_name: string;
  system_code: string;
  amount_bs: number;
  amount_usd: number;
}

interface AgencyCuadreData {
  agency_id: string;
  agency_name: string;
  systems: SystemCuadreData[];
  total_bs: number;
  total_usd: number;
}

interface LotterySystem {
  id: string;
  name: string;
  code: string;
}

interface Agency {
  id: string;
  name: string;
}

export function DailyCuadreSistemasOptimized({ profile }: { profile: any }) {
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 1));
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [systems, setSystems] = useState<LotterySystem[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [cuadreData, setCuadreData] = useState<AgencyCuadreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([fetchSystems(), fetchAgencies()]);
  }, []);

  useEffect(() => {
    if (systems.length > 0 && agencies.length > 0 && selectedDate) {
      fetchCuadreData();
    }
  }, [systems, agencies, selectedDate, selectedAgency]);

  const fetchSystems = async () => {
    try {
      const { data, error } = await supabase
        .from('lottery_systems')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSystems(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los sistemas de lotería",
        variant: "destructive",
      });
    }
  };

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
      toast({
        title: "Error",
        description: "No se pudieron cargar las agencias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCuadreData = async () => {
    try {
      const agencyFilter = selectedAgency === "all" ? agencies : agencies.filter(a => a.id === selectedAgency);
      
      const cuadrePromises = agencyFilter.map(async (agency) => {
        const { data, error } = await supabase
          .from('daily_system_cuadres')
          .select(`
            *,
            lottery_systems!daily_system_cuadres_lottery_system_id_fkey(name, code)
          `)
          .eq('cuadre_date', format(selectedDate, 'yyyy-MM-dd'))
          .eq('agency_id', agency.id);

        if (error) throw error;

        const systemsData: SystemCuadreData[] = systems.map(system => {
          const existingCuadre = data?.find(d => d.lottery_system_id === system.id);
          return {
            lottery_system_id: system.id,
            system_name: system.name,
            system_code: system.code,
            amount_bs: existingCuadre?.amount_bs || 0,
            amount_usd: existingCuadre?.amount_usd || 0,
          };
        });

        const totalBs = systemsData.reduce((sum, s) => sum + s.amount_bs, 0);
        const totalUsd = systemsData.reduce((sum, s) => sum + s.amount_usd, 0);

        return {
          agency_id: agency.id,
          agency_name: agency.name,
          systems: systemsData,
          total_bs: totalBs,
          total_usd: totalUsd,
        };
      });

      const results = await Promise.all(cuadrePromises);
      setCuadreData(results);
    } catch (error: any) {
      console.error('Error fetching cuadre data:', error);
    }
  };

  const handleInputChange = (agencyId: string, systemId: string, field: 'amount_bs' | 'amount_usd', value: string) => {
    const numValue = parseFloat(value) || 0;
    
    setCuadreData(prev => prev.map(agency => {
      if (agency.agency_id !== agencyId) return agency;
      
      const updatedSystems = agency.systems.map(system => {
        if (system.lottery_system_id !== systemId) return system;
        return { ...system, [field]: numValue };
      });

      const totalBs = updatedSystems.reduce((sum, s) => sum + s.amount_bs, 0);
      const totalUsd = updatedSystems.reduce((sum, s) => sum + s.amount_usd, 0);

      return {
        ...agency,
        systems: updatedSystems,
        total_bs: totalBs,
        total_usd: totalUsd,
      };
    }));
  };

  const saveCuadre = async () => {
    setSaving(true);
    try {
      const upsertData = cuadreData.flatMap(agency =>
        agency.systems.map(system => ({
          user_id: profile?.user_id,
          agency_id: agency.agency_id,
          cuadre_date: format(selectedDate, 'yyyy-MM-dd'),
          lottery_system_id: system.lottery_system_id,
          amount_bs: system.amount_bs,
          amount_usd: system.amount_usd,
        }))
      );

      const { error } = await supabase
        .from('daily_system_cuadres')
        .upsert(upsertData, {
          onConflict: 'user_id,agency_id,cuadre_date,lottery_system_id'
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cuadre diario guardado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo guardar el cuadre",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getTotalsBySystem = () => {
    const systemTotals: Record<string, { bs: number; usd: number; name: string }> = {};
    
    systems.forEach(system => {
      const totalBs = cuadreData.reduce((sum, agency) => {
        const systemData = agency.systems.find(s => s.lottery_system_id === system.id);
        return sum + (systemData?.amount_bs || 0);
      }, 0);
      
      const totalUsd = cuadreData.reduce((sum, agency) => {
        const systemData = agency.systems.find(s => s.lottery_system_id === system.id);
        return sum + (systemData?.amount_usd || 0);
      }, 0);

      systemTotals[system.id] = {
        bs: totalBs,
        usd: totalUsd,
        name: system.name
      };
    });

    return systemTotals;
  };

  const grandTotalBs = cuadreData.reduce((sum, agency) => sum + agency.total_bs, 0);
  const grandTotalUsd = cuadreData.reduce((sum, agency) => sum + agency.total_usd, 0);
  const systemTotals = getTotalsBySystem();

  if (loading) {
    return <div className="p-6">Cargando sistemas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with title and controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Calculator className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-xl">Cuadre Diario de Sistemas</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Gestión de cuadres por sistema de lotería - Todas las agencias
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

              <Button onClick={saveCuadre} disabled={saving} size="lg">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Todo"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total General Bs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-800">
              Bs {grandTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total General USD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-800">
              $ {grandTotalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-700 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Agencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-800">
              {selectedAgency === "all" ? agencies.length : 1}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Sistemas Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-800">
              {systems.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agency Cuadres */}
      {cuadreData.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No hay datos para mostrar</h3>
              <p className="text-muted-foreground">
                No se encontraron cuadres para la fecha seleccionada.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        cuadreData.map((agency) => (
        <Card key={agency.agency_id} className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-slate-600" />
                <div>
                  <CardTitle className="text-lg">{agency.agency_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Cuadre por sistemas de lotería
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Bs</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {agency.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total USD</p>
                  <p className="text-lg font-semibold text-green-600">
                    {agency.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agency.systems.map((system) => (
                <Card key={system.lottery_system_id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{system.system_name}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {system.system_code}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor={`${agency.agency_id}_${system.lottery_system_id}_bs`} className="text-xs font-medium">
                        Monto Bs
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${agency.agency_id}_${system.lottery_system_id}_bs`}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={system.amount_bs || ''}
                          onChange={(e) => handleInputChange(agency.agency_id, system.lottery_system_id, 'amount_bs', e.target.value)}
                          className="pr-8 text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          Bs
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`${agency.agency_id}_${system.lottery_system_id}_usd`} className="text-xs font-medium">
                        Monto USD
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${agency.agency_id}_${system.lottery_system_id}_usd`}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={system.amount_usd || ''}
                          onChange={(e) => handleInputChange(agency.agency_id, system.lottery_system_id, 'amount_usd', e.target.value)}
                          className="pr-8 text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          $
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        ))
      )}

      {/* System Totals Summary */}
      {Object.keys(systemTotals).length > 0 && (
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Resumen por Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(systemTotals).map(([systemId, totals]) => (
                <div key={systemId} className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-sm mb-2">{totals.name}</h4>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Bs:</span>{' '}
                      <span className="font-medium text-blue-600">
                        {totals.bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">USD:</span>{' '}
                      <span className="font-medium text-green-600">
                        {totals.usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}