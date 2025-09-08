import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, Calculator } from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DailyCuadreData {
  [systemId: string]: {
    amount_bs: number;
    amount_usd: number;
  };
}

interface LotterySystem {
  id: string;
  name: string;
  code: string;
}

export function DailyCuadreSistemas({ profile }: { profile: any }) {
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 1)); // Default to yesterday
  const [systems, setSystems] = useState<LotterySystem[]>([]);
  const [cuadreData, setCuadreData] = useState<DailyCuadreData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSystems();
  }, []);

  useEffect(() => {
    if (systems.length > 0 && selectedDate) {
      fetchCuadreData();
    }
  }, [systems, selectedDate]);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchCuadreData = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_system_cuadres')
        .select('*')
        .eq('user_id', profile?.user_id)
        .eq('agency_id', profile?.agency_id)
        .eq('cuadre_date', format(selectedDate, 'yyyy-MM-dd'));

      if (error) throw error;

      const cuadreMap: DailyCuadreData = {};
      systems.forEach(system => {
        const existingCuadre = data?.find(d => d.lottery_system_id === system.id);
        cuadreMap[system.id] = {
          amount_bs: existingCuadre?.amount_bs || 0,
          amount_usd: existingCuadre?.amount_usd || 0,
        };
      });

      setCuadreData(cuadreMap);
    } catch (error: any) {
      console.error('Error fetching cuadre data:', error);
    }
  };

  const handleInputChange = (systemId: string, field: 'amount_bs' | 'amount_usd', value: string) => {
    const numValue = parseFloat(value) || 0;
    setCuadreData(prev => ({
      ...prev,
      [systemId]: {
        ...prev[systemId],
        [field]: numValue,
      },
    }));
  };

  const saveCuadre = async () => {
    setSaving(true);
    try {
      const upsertData = systems.map(system => ({
        user_id: profile?.user_id,
        agency_id: profile?.agency_id,
        cuadre_date: format(selectedDate, 'yyyy-MM-dd'),
        lottery_system_id: system.id,
        amount_bs: cuadreData[system.id]?.amount_bs || 0,
        amount_usd: cuadreData[system.id]?.amount_usd || 0,
      }));

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

  const totalBs = Object.values(cuadreData).reduce((sum, item) => sum + (item?.amount_bs || 0), 0);
  const totalUsd = Object.values(cuadreData).reduce((sum, item) => sum + (item?.amount_usd || 0), 0);

  if (loading) {
    return <div>Cargando sistemas...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Cuadre Diario de Sistemas</CardTitle>
          </div>
          <div className="flex items-center gap-4">
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
            <Button onClick={saveCuadre} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systems.map((system) => (
            <Card key={system.id} className="p-4">
              <h4 className="font-semibold mb-3">{system.name}</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor={`${system.id}_bs`}>Monto Bs</Label>
                  <Input
                    id={`${system.id}_bs`}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cuadreData[system.id]?.amount_bs || ''}
                    onChange={(e) => handleInputChange(system.id, 'amount_bs', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`${system.id}_usd`}>Monto USD</Label>
                  <Input
                    id={`${system.id}_usd`}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cuadreData[system.id]?.amount_usd || ''}
                    onChange={(e) => handleInputChange(system.id, 'amount_usd', e.target.value)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4 bg-muted">
          <h4 className="font-semibold mb-2">Resumen Total</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Bolívares</Label>
              <div className="text-2xl font-bold text-green-600">
                Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <Label>Total Dólares</Label>
              <div className="text-2xl font-bold text-blue-600">
                $ {totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </Card>
      </CardContent>
    </Card>
  );
}