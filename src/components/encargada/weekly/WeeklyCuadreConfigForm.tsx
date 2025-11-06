import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Settings, Save, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

const configSchema = z.object({
  exchange_rate: z.number().min(0.01, "La tasa debe ser mayor a 0"),
  cash_bs: z.number().min(0, "El efectivo debe ser positivo"),
  dollars_to_bs: z.number().min(0, "Los dólares deben ser positivos"),
});

type ConfigForm = z.infer<typeof configSchema>;

interface WeeklyCuadreConfigFormProps {
  agencyId: string;
  agencyName: string;
  weekStart: Date;
  weekEnd: Date;
  totalBancoBs: number;
  onSuccess?: () => void;
}

export function WeeklyCuadreConfigForm({
  agencyId,
  agencyName,
  weekStart,
  weekEnd,
  totalBancoBs,
  onSuccess,
}: WeeklyCuadreConfigFormProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      exchange_rate: 36,
      cash_bs: 0,
      dollars_to_bs: 0,
    },
  });

  const watchedValues = watch();
  
  // Cálculos automáticos
  const excessUsd = watchedValues.cash_bs / watchedValues.exchange_rate - watchedValues.dollars_to_bs;
  const finalDifference = watchedValues.cash_bs - totalBancoBs;

  useEffect(() => {
    loadExistingConfig();
  }, [agencyId, weekStart, weekEnd]);

  const loadExistingConfig = async () => {
    try {
      setLoadingData(true);
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("weekly_cuadre_config")
        .select("*")
        .eq("agency_id", agencyId)
        .eq("week_start_date", weekStartStr)
        .eq("week_end_date", weekEndStr)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setValue("exchange_rate", Number(data.exchange_rate));
        setValue("cash_bs", Number(data.cash_bs));
        setValue("dollars_to_bs", Number(data.dollars_to_bs));
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (formData: ConfigForm) => {
    if (!user?.id) {
      toast.error("Usuario no autenticado");
      return;
    }

    try {
      setLoading(true);
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      const configData = {
        agency_id: agencyId,
        week_start_date: weekStartStr,
        week_end_date: weekEndStr,
        exchange_rate: formData.exchange_rate,
        cash_bs: formData.cash_bs,
        dollars_to_bs: formData.dollars_to_bs,
        excess_usd: excessUsd,
        final_difference: finalDifference,
        created_by: user.id,
      };

      const { error } = await supabase
        .from("weekly_cuadre_config")
        .upsert(configData, {
          onConflict: "agency_id,week_start_date,week_end_date",
        });

      if (error) throw error;

      toast.success("Configuración guardada correctamente");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast.error(error.message || "Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración de Cuadre Semanal
        </CardTitle>
        <CardDescription>
          Configura la tasa, efectivo y dólares para {agencyName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tasa de cambio */}
          <div className="space-y-2">
            <Label htmlFor="exchange_rate">Tasa de Cambio</Label>
            <Input
              id="exchange_rate"
              type="number"
              step="0.01"
              {...register("exchange_rate", { valueAsNumber: true })}
              placeholder="36.00"
            />
            {errors.exchange_rate && (
              <p className="text-sm text-destructive">{errors.exchange_rate.message}</p>
            )}
          </div>

          {/* Efectivo en Bs */}
          <div className="space-y-2">
            <Label htmlFor="cash_bs">Efectivo en Bolívares</Label>
            <Input
              id="cash_bs"
              type="number"
              step="0.01"
              {...register("cash_bs", { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.cash_bs && (
              <p className="text-sm text-destructive">{errors.cash_bs.message}</p>
            )}
          </div>

          {/* Dólares para convertir a Bs */}
          <div className="space-y-2">
            <Label htmlFor="dollars_to_bs">Dólares a Bolívares</Label>
            <Input
              id="dollars_to_bs"
              type="number"
              step="0.01"
              {...register("dollars_to_bs", { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.dollars_to_bs && (
              <p className="text-sm text-destructive">{errors.dollars_to_bs.message}</p>
            )}
          </div>

          {/* Cálculos automáticos */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="h-4 w-4" />
              Cálculos Automáticos
            </div>

            <div className="space-y-3">
              {/* Hay en banco */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Hay en Banco:</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(totalBancoBs, "VES")}
                </span>
              </div>

              {/* Exceso USD */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Exceso USD:</span>
                <span
                  className={`font-mono font-semibold ${
                    excessUsd >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(excessUsd, "USD")}
                </span>
              </div>

              {/* Diferencia final */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Diferencia Final:</span>
                <span
                  className={`font-mono font-bold text-lg ${
                    finalDifference >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(finalDifference, "VES")}
                </span>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
