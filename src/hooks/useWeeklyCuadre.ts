import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface WeekBoundaries {
  start: Date;
  end: Date;
}

export interface PerSystemTotals {
  system_id: string;
  system_name: string;
  sales_bs: number;
  sales_usd: number;
  prizes_bs: number;
  prizes_usd: number;
}

export interface AgencyWeeklySummary {
  agency_id: string;
  agency_name: string;
  // Totales por la semana
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  total_deudas_bs: number;
  total_deudas_usd: number;
  total_gastos_bs: number;
  total_gastos_usd: number;
  premios_por_pagar_bs: number;
  total_banco_bs: number;
  sunday_exchange_rate: number;
  per_system: PerSystemTotals[];
}

interface UseWeeklyCuadreResult {
  loading: boolean;
  error: string | null;
  agencies: { id: string; name: string }[];
  summaries: AgencyWeeklySummary[];
  refresh: () => Promise<void>;
}

export function useWeeklyCuadre(currentWeek: WeekBoundaries | null): UseWeeklyCuadreResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [summaries, setSummaries] = useState<AgencyWeeklySummary[]>([]);

  const startStr = useMemo(() => (currentWeek ? format(currentWeek.start, "yyyy-MM-dd") : null), [currentWeek]);
  const endStr = useMemo(() => (currentWeek ? format(currentWeek.end, "yyyy-MM-dd") : null), [currentWeek]);

  const fetchAll = async () => {
    if (!startStr || !endStr) return;
    setLoading(true);
    setError(null);

    try {
      // 1) Agencias
      const [{ data: agenciesData, error: agenciesError }, { data: details, error: detailsError }, { data: systems, error: systemsError }, { data: summaryData, error: summaryError }, { data: expenses, error: expensesError }, { data: sessions, error: sessionsError }, { data: profiles, error: profilesError }] = await Promise.all([
        supabase.from("agencies").select("id,name").eq("is_active", true).order("name"),
        supabase
          .from("encargada_cuadre_details")
          .select("agency_id, session_date, lottery_system_id, sales_bs, sales_usd, prizes_bs, prizes_usd")
          .gte("session_date", startStr)
          .lte("session_date", endStr),
        supabase.from("lottery_systems").select("id,name"),
        supabase
          .from("daily_cuadres_summary")
          .select(
            "agency_id, session_date, total_banco_bs, pending_prizes, exchange_rate, created_at, updated_at"
          )
          .is("session_id", null)
          .gte("session_date", startStr)
          .lte("session_date", endStr),
        supabase
          .from("expenses")
          .select("amount_bs, amount_usd, category, session_id, agency_id, transaction_date")
          .gte("transaction_date", startStr)
          .lte("transaction_date", endStr),
        supabase
          .from("daily_sessions")
          .select("id, user_id, session_date")
          .gte("session_date", startStr)
          .lte("session_date", endStr),
        supabase.from("profiles").select("user_id, agency_id"),
      ]);

      if (agenciesError) throw agenciesError;
      if (detailsError) throw detailsError;
      if (systemsError) throw systemsError;
      if (summaryError) throw summaryError;
      if (expensesError) throw expensesError;
      if (sessionsError) throw sessionsError;
      if (profilesError) throw profilesError;

      setAgencies(agenciesData || []);

      // Mapa sistema -> nombre
      const systemNameById = new Map<string, string>();
      systems?.forEach((s) => systemNameById.set(s.id, s.name));

      // Sesion -> Agencia (para gastos sin agency_id)
      const sessionToAgency = new Map<string, string>();
      sessions?.forEach((s) => {
        const profile = profiles?.find((p) => p.user_id === s.user_id);
        if (profile?.agency_id) sessionToAgency.set(s.id, profile.agency_id);
      });

      // Construir por agencia
      const byAgency: Record<string, AgencyWeeklySummary> = {};

      // Base por agencia
      (agenciesData || []).forEach((a) => {
        byAgency[a.id] = {
          agency_id: a.id,
          agency_name: a.name,
          total_sales_bs: 0,
          total_sales_usd: 0,
          total_prizes_bs: 0,
          total_prizes_usd: 0,
          total_deudas_bs: 0,
          total_deudas_usd: 0,
          total_gastos_bs: 0,
          total_gastos_usd: 0,
          premios_por_pagar_bs: 0,
          total_banco_bs: 0,
          sunday_exchange_rate: 36,
          per_system: [],
        };
      });

      // Totales por sistema en la semana
      const perAgencySystem = new Map<string, Map<string, PerSystemTotals>>();
      (details || []).forEach((d) => {
        const agencyId = d.agency_id;
        if (!perAgencySystem.has(agencyId)) perAgencySystem.set(agencyId, new Map());
        const perSys = perAgencySystem.get(agencyId)!;
        const key = d.lottery_system_id;
        const current: PerSystemTotals =
          perSys.get(key) || {
            system_id: key,
            system_name: systemNameById.get(key) || "Sistema",
            sales_bs: 0,
            sales_usd: 0,
            prizes_bs: 0,
            prizes_usd: 0,
          };
        current.sales_bs += Number(d.sales_bs || 0);
        current.sales_usd += Number(d.sales_usd || 0);
        current.prizes_bs += Number(d.prizes_bs || 0);
        current.prizes_usd += Number(d.prizes_usd || 0);
        perSys.set(key, current);
      });

      // Aplicar per-system y totales de ventas/premios
      Object.entries(byAgency).forEach(([agencyId, ag]) => {
        const perSys = perAgencySystem.get(agencyId);
        if (perSys) {
          ag.per_system = Array.from(perSys.values()).sort((a, b) => a.system_name.localeCompare(b.system_name));
          ag.per_system.forEach((s) => {
            ag.total_sales_bs += s.sales_bs;
            ag.total_sales_usd += s.sales_usd;
            ag.total_prizes_bs += s.prizes_bs;
            ag.total_prizes_usd += s.prizes_usd;
          });
        }
      });

      // Resumen encargada (banco, premios por pagar, tasa del domingo)
      const latestByDateByAgency = new Map<string, Map<string, any>>();
      (summaryData || []).forEach((s) => {
        if (!latestByDateByAgency.has(s.agency_id)) latestByDateByAgency.set(s.agency_id, new Map());
        const byDate = latestByDateByAgency.get(s.agency_id)!;
        const existing = byDate.get(s.session_date as string);
        const existingTime = existing?.updated_at || existing?.created_at;
        const newTime = s.updated_at || s.created_at;
        if (!existing || (newTime && existingTime && new Date(newTime) > new Date(existingTime))) {
          byDate.set(s.session_date as string, s);
        }
      });

      Object.entries(byAgency).forEach(([agencyId, ag]) => {
        const byDate = latestByDateByAgency.get(agencyId);
        if (byDate) {
          const list = Array.from(byDate.values());
          ag.total_banco_bs = list.reduce((sum, v: any) => sum + Number(v.total_banco_bs || 0), 0);
          ag.premios_por_pagar_bs = list.reduce((sum, v: any) => sum + Number(v.pending_prizes || 0), 0);
          const sunday = byDate.get(endStr!);
          ag.sunday_exchange_rate = sunday?.exchange_rate ? Number(sunday.exchange_rate) : ag.sunday_exchange_rate;
        }
      });

      // Gastos/Deudas
      (expenses || []).forEach((e) => {
        const agencyId = e.agency_id || (e.session_id ? sessionToAgency.get(e.session_id) : undefined);
        if (!agencyId || !byAgency[agencyId]) return;
        if (e.category === "deuda") {
          byAgency[agencyId].total_deudas_bs += Number(e.amount_bs || 0);
          byAgency[agencyId].total_deudas_usd += Number(e.amount_usd || 0);
        } else if (e.category === "gasto_operativo") {
          byAgency[agencyId].total_gastos_bs += Number(e.amount_bs || 0);
          byAgency[agencyId].total_gastos_usd += Number(e.amount_usd || 0);
        }
      });

      setSummaries(Object.values(byAgency));
    } catch (err: any) {
      console.error("useWeeklyCuadre error:", err);
      setError(err.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startStr, endStr]);

  return {
    loading,
    error,
    agencies,
    summaries,
    refresh: fetchAll,
  };
}
