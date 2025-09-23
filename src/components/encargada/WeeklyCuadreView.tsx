import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ChevronLeft, ChevronRight, Calculator, CheckCircle2, XCircle, Save, TrendingUp, TrendingDown, ChevronDown, ChevronRight as ChevronRightIcon, Building2, Search, Receipt, HandCoins, CreditCard, Smartphone, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeeklyData {
  // Sales & Prizes
  totalSales: { bs: number; usd: number };
  totalPrizes: { bs: number; usd: number };
  
  // Expenses separated by category
  totalGastos: { bs: number; usd: number };
  totalDeudas: { bs: number; usd: number };
  
  // Detailed expenses for dropdowns
  gastosDetails: Array<{ description: string; amount_bs: number; amount_usd: number; created_at: string; agency_name?: string }>;
  deudasDetails: Array<{ description: string; amount_bs: number; amount_usd: number; created_at: string; agency_name?: string }>;
  
  // Mobile payments separated
  pagoMovilRecibidos: number;
  pagoMovilPagados: number;
  
  // Point of sale
  totalPointOfSale: number;
  
  // Cash available (aggregated)
  totalCashAvailable: number;
  totalCashAvailableUsd: number;
  
  // Pending prizes
  premiosPorPagar: number;
  
  // Average exchange rate for the week 
  averageExchangeRate: number;
  
  // Week info
  total_sessions: number;
  is_weekly_closed: boolean;
  weekly_closure_notes: string;
}

interface AgencyWeeklyData {
  agency_id: string;
  agency_name: string;
  totalSales: { bs: number; usd: number };
  totalPrizes: { bs: number; usd: number };
  totalGastos: { bs: number; usd: number };
  totalDeudas: { bs: number; usd: number };
  pagoMovilRecibidos: number;
  pagoMovilPagados: number;
  totalPointOfSale: number;
  totalCashAvailable: number;
  totalCashAvailableUsd: number;
  premiosPorPagar: number;
  averageExchangeRate: number;
  total_sessions: number;
  is_weekly_closed: boolean;
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

interface WeekBoundaries {
  start: Date;
  end: Date;
  number: number;
  year: number;
}

export function WeeklyCuadreView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [agenciesData, setAgenciesData] = useState<AgencyWeeklyData[]>([]);
  const [filteredAgencies, setFilteredAgencies] = useState<AgencyWeeklyData[]>([]);
  const [dailyDetails, setDailyDetails] = useState<DailyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [closureNotes, setClosureNotes] = useState('');
  const [currentWeek, setCurrentWeek] = useState<WeekBoundaries | null>(null);
  const [allAgencies, setAllAgencies] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [activeAgencyTab, setActiveAgencyTab] = useState('resumen');
  
  // State for collapsible dropdowns
  const [gastosOpen, setGastosOpen] = useState(false);
  const [deudasOpen, setDeudasOpen] = useState(false);

  useEffect(() => {
    if (user) {
      getCurrentWeekBoundaries();
      fetchAgencies();
    }
  }, [user]);

  useEffect(() => {
    if (currentWeek && user) {
      fetchWeeklyData();
    }
  }, [currentWeek, user]);

  useEffect(() => {
    let filtered = agenciesData;
    
    if (selectedAgency !== 'all') {
      filtered = filtered.filter(agency => agency.agency_id === selectedAgency);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(agency => 
        agency.agency_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredAgencies(filtered);
  }, [agenciesData, selectedAgency, searchTerm]);

  const fetchAgencies = async () => {
    try {
      const { data: agencies, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAllAgencies(agencies || []);
    } catch (error: any) {
      console.error('Error fetching agencies:', error);
    }
  };

  const getCurrentWeekBoundaries = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_week_boundaries');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const weekData = data[0];
        setCurrentWeek({
          start: new Date(weekData.week_start + 'T00:00:00'),
          end: new Date(weekData.week_end + 'T23:59:59'),
          number: weekData.week_number,
          year: weekData.year,
        });
      } else {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        
        setCurrentWeek({
          start: weekStart,
          end: weekEnd,
          number: parseInt(format(weekStart, 'w')),
          year: parseInt(format(weekStart, 'yyyy')),
        });
      }
    } catch (error: any) {
      console.error('Error getting week boundaries:', error);
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      
      setCurrentWeek({
        start: weekStart,
        end: weekEnd,
        number: parseInt(format(weekStart, 'w')),
        year: parseInt(format(weekStart, 'yyyy')),
      });
      
      toast({
        title: "Advertencia",
        description: "Usando fechas locales. Puede haber diferencias con el timezone de Venezuela",
        variant: "default",
      });
    }
  };

  const fetchWeeklyData = async () => {
    if (!currentWeek) return;
    
    setLoading(true);
    try {
      const startStr = format(currentWeek.start, 'yyyy-MM-dd');
      const endStr = format(currentWeek.end, 'yyyy-MM-dd');

      // Get encargada data from daily_cuadres_summary (session_id IS NULL)
      const { data: encargadaData, error: encargadaError } = await supabase
        .from('daily_cuadres_summary')
        .select(`
          total_sales_bs, total_sales_usd, total_prizes_bs, total_prizes_usd,
          total_expenses_bs, total_expenses_usd, total_mobile_payments_bs, total_pos_bs,
          cash_available_bs, cash_available_usd, exchange_rate, agency_id, session_date,
          is_weekly_closed, weekly_closure_notes, pending_prizes
        `)
        .is('session_id', null)  // Encargada data
        .gte('session_date', startStr)
        .lte('session_date', endStr);

      if (encargadaError) throw encargadaError;

      // Get taquillera cuadres for combined expenses only
      const { data: taquilleraData, error: taquilleraError } = await supabase
        .from('daily_cuadres_summary')
        .select(`
          total_expenses_bs, total_expenses_usd, total_debt_bs, total_debt_usd,
          agency_id, session_date
        `)
        .not('session_id', 'is', null)  // Taquillera data
        .gte('session_date', startStr)
        .lte('session_date', endStr);

      if (taquilleraError) throw taquilleraError;

      // Get detailed expenses from both encargada and taquilleras
      const [encargadaExpenses, taquilleraExpenses] = await Promise.all([
        supabase
          .from('expenses')
          .select('amount_bs, amount_usd, category, description, created_at, agency_id')
          .is('session_id', null)  // Encargada expenses
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr),
        supabase
          .from('expenses')
          .select('amount_bs, amount_usd, category, description, created_at, session_id')
          .not('session_id', 'is', null)  // Taquillera expenses
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr)
      ]);

      if (encargadaExpenses.error) throw encargadaExpenses.error;
      if (taquilleraExpenses.error) throw taquilleraExpenses.error;

      // Get additional encargada data (mobile payments and POS with session_id = null)
      const [encargadaMobilePayments, encargadaPOS, interAgencyLoans] = await Promise.all([
        supabase
          .from('mobile_payments')
          .select('amount_bs, description, agency_id')
          .is('session_id', null)
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr),
        supabase
          .from('point_of_sale')
          .select('amount_bs, agency_id')
          .is('session_id', null)
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr),
        supabase
          .from('inter_agency_loans')
          .select('amount_bs, amount_usd, from_agency_id, to_agency_id, status')
          .gte('loan_date', startStr)
          .lte('loan_date', endStr)
      ]);

      if (encargadaMobilePayments.error) throw encargadaMobilePayments.error;
      if (encargadaPOS.error) throw encargadaPOS.error;
      if (interAgencyLoans.error) throw interAgencyLoans.error;

      // If no data, return empty state
      if (!encargadaData?.length && !taquilleraData?.length) {
        setWeeklyData({
          totalSales: { bs: 0, usd: 0 },
          totalPrizes: { bs: 0, usd: 0 },
          totalGastos: { bs: 0, usd: 0 },
          totalDeudas: { bs: 0, usd: 0 },
          gastosDetails: [],
          deudasDetails: [],
          pagoMovilRecibidos: 0,
          pagoMovilPagados: 0,
          totalPointOfSale: 0,
          totalCashAvailable: 0,
          totalCashAvailableUsd: 0,
          premiosPorPagar: 0,
          averageExchangeRate: 36.00,
          total_sessions: 0,
          is_weekly_closed: false,
          weekly_closure_notes: '',
        });
        setAgenciesData([]);
        setLoading(false);
        return;
      }

      // Calculate totals from encargada cuadres
      const totalSales = encargadaData?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.total_sales_bs || 0),
          usd: acc.usd + Number(item.total_sales_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      const totalPrizes = encargadaData?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.total_prizes_bs || 0),
          usd: acc.usd + Number(item.total_prizes_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      // Combine expenses from both sources
      const allGastos = [
        ...(encargadaExpenses.data?.filter(e => e.category === 'gasto_operativo') || []),
        ...(taquilleraExpenses.data?.filter(e => e.category === 'gasto_operativo') || [])
      ];

      const allDeudas = [
        ...(encargadaExpenses.data?.filter(e => e.category === 'deuda') || []),
        ...(taquilleraExpenses.data?.filter(e => e.category === 'deuda') || [])
      ];

      // Add agency names to expense details
      const gastosDetails = allGastos.map(gasto => {
        let agencyName = 'Sin agencia';
        if ('agency_id' in gasto && gasto.agency_id) {
          const agency = allAgencies.find(a => a.id === gasto.agency_id);
          agencyName = agency?.name || 'Sin agencia';
        } else if ('session_id' in gasto && gasto.session_id) {
          // For taquillera expenses, we'd need to map session to agency
          // For now, just use the default
          agencyName = 'Taquillera';
        }
        return { ...gasto, agency_name: agencyName };
      });

      const deudasDetails = allDeudas.map(deuda => {
        let agencyName = 'Sin agencia';
        if ('agency_id' in deuda && deuda.agency_id) {
          const agency = allAgencies.find(a => a.id === deuda.agency_id);
          agencyName = agency?.name || 'Sin agencia';
        } else if ('session_id' in deuda && deuda.session_id) {
          // For taquillera expenses, we'd need to map session to agency
          // For now, just use the default
          agencyName = 'Taquillera';
        }
        return { ...deuda, agency_name: agencyName };
      });

      const totalGastos = allGastos.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      );

      const totalDeudas = allDeudas.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      );

      // Calculate mobile payments from encargada data
      const pagoMovilRecibidos = (encargadaMobilePayments.data?.reduce(
        (sum, item) => {
          const amount = Number(item.amount_bs || 0);
          return amount > 0 ? sum + amount : sum;
        },
        0
      ) || 0) + (encargadaData?.reduce((sum, item) => sum + Number(item.total_mobile_payments_bs || 0), 0) || 0);

      const pagoMovilPagados = Math.abs(encargadaMobilePayments.data?.reduce(
        (sum, item) => {
          const amount = Number(item.amount_bs || 0);
          return amount < 0 ? sum + amount : sum;
        },
        0
      ) || 0);

      // Calculate POS from encargada data
      const totalPointOfSale = (encargadaPOS.data?.reduce(
        (sum, item) => sum + Number(item.amount_bs || 0),
        0
      ) || 0) + (encargadaData?.reduce((sum, item) => sum + Number(item.total_pos_bs || 0), 0) || 0);

      // Calculate pending prizes from encargada cuadres
      const premiosPorPagar = encargadaData?.reduce((sum, item) => sum + Number(item.pending_prizes || 0), 0) || 0;

      // Calculate cash available and exchange rate from encargada data
      const totalCashAvailable = encargadaData?.reduce((sum, item) => sum + Number(item.cash_available_bs || 0), 0) || 0;
      const totalCashAvailableUsd = encargadaData?.reduce((sum, item) => sum + Number(item.cash_available_usd || 0), 0) || 0;
      const averageExchangeRate = encargadaData?.reduce((sum, item) => sum + Number(item.exchange_rate || 36), 0) / (encargadaData?.length || 1) || 36;

      // Build agency-specific data from encargada cuadres
      const agencyData: { [key: string]: AgencyWeeklyData } = {};

      // Initialize agencies
      allAgencies.forEach(agency => {
        agencyData[agency.id] = {
          agency_id: agency.id,
          agency_name: agency.name,
          totalSales: { bs: 0, usd: 0 },
          totalPrizes: { bs: 0, usd: 0 },
          totalGastos: { bs: 0, usd: 0 },
          totalDeudas: { bs: 0, usd: 0 },
          pagoMovilRecibidos: 0,
          pagoMovilPagados: 0,
          totalPointOfSale: 0,
          totalCashAvailable: 0,
          totalCashAvailableUsd: 0,
          premiosPorPagar: 0,
          averageExchangeRate: 36,
          total_sessions: 0,
          is_weekly_closed: false,
        };
      });

      // Aggregate encargada data by agency
      encargadaData?.forEach(cuadre => {
        if (cuadre.agency_id && agencyData[cuadre.agency_id]) {
          const agency = agencyData[cuadre.agency_id];
          agency.totalSales.bs += Number(cuadre.total_sales_bs || 0);
          agency.totalSales.usd += Number(cuadre.total_sales_usd || 0);
          agency.totalPrizes.bs += Number(cuadre.total_prizes_bs || 0);
          agency.totalPrizes.usd += Number(cuadre.total_prizes_usd || 0);
          agency.totalCashAvailable += Number(cuadre.cash_available_bs || 0);
          agency.totalCashAvailableUsd += Number(cuadre.cash_available_usd || 0);
          agency.pagoMovilRecibidos += Number(cuadre.total_mobile_payments_bs || 0);
          agency.totalPointOfSale += Number(cuadre.total_pos_bs || 0);
          agency.premiosPorPagar += Number(cuadre.pending_prizes || 0);
          agency.total_sessions += 1;
          agency.averageExchangeRate = Number(cuadre.exchange_rate || 36);
          agency.is_weekly_closed = cuadre.is_weekly_closed || false;
        }
      });

      // Add expenses by agency (both encargada and taquillera)
      allGastos.forEach(gasto => {
        const agencyId = 'agency_id' in gasto ? gasto.agency_id : null;
        if (agencyId && agencyData[agencyId]) {
          agencyData[agencyId].totalGastos.bs += Number(gasto.amount_bs || 0);
          agencyData[agencyId].totalGastos.usd += Number(gasto.amount_usd || 0);
        }
      });

      allDeudas.forEach(deuda => {
        const agencyId = 'agency_id' in deuda ? deuda.agency_id : null;
        if (agencyId && agencyData[agencyId]) {
          agencyData[agencyId].totalDeudas.bs += Number(deuda.amount_bs || 0);
          agencyData[agencyId].totalDeudas.usd += Number(deuda.amount_usd || 0);
        }
      });

      // Create daily breakdown (simplified for encargada view)
      const dailyData: { [key: string]: DailyDetail } = {};
      const weekDays = eachDayOfInterval({ start: currentWeek.start, end: currentWeek.end });

      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayData = encargadaData?.filter(item => item.session_date === dayKey) || [];
        
        const dailySales = dayData.reduce(
          (acc, item) => ({
            bs: acc.bs + Number(item.total_sales_bs || 0),
            usd: acc.usd + Number(item.total_sales_usd || 0),
          }),
          { bs: 0, usd: 0 }
        );

        const dailyPrizes = dayData.reduce(
          (acc, item) => ({
            bs: acc.bs + Number(item.total_prizes_bs || 0),
            usd: acc.usd + Number(item.total_prizes_usd || 0),
          }),
          { bs: 0, usd: 0 }
        );

        dailyData[dayKey] = {
          day_date: dayKey,
          day_name: format(day, 'EEEE', { locale: es }),
          total_sales_bs: dailySales.bs,
          total_sales_usd: dailySales.usd,
          total_prizes_bs: dailyPrizes.bs,
          total_prizes_usd: dailyPrizes.usd,
          balance_bs: dailySales.bs - dailyPrizes.bs,
          balance_usd: dailySales.usd - dailyPrizes.usd,
          sessions_count: dayData.length,
          is_completed: dayData.length > 0,
        };
      });

      // Build weekly summary
      const finalWeeklyData: WeeklyData = {
        totalSales,
        totalPrizes,
        totalGastos,
        totalDeudas,
        gastosDetails,
        deudasDetails,
        pagoMovilRecibidos,
        pagoMovilPagados,
        totalPointOfSale,
        totalCashAvailable,
        totalCashAvailableUsd,
        premiosPorPagar,
        averageExchangeRate,
        total_sessions: encargadaData?.length || 0,
        is_weekly_closed: encargadaData?.some(item => item.is_weekly_closed) || false,
        weekly_closure_notes: encargadaData?.find(item => item.weekly_closure_notes)?.weekly_closure_notes || '',
      };

      setWeeklyData(finalWeeklyData);
      setAgenciesData(Object.values(agencyData).filter(agency => agency.total_sessions > 0 || agency.totalGastos.bs > 0 || agency.totalDeudas.bs > 0));
      setDailyDetails(Object.values(dailyData));
      
    } catch (error: any) {
      console.error('Error fetching weekly data:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los datos semanales',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (!currentWeek) return;
    
    const newWeek = direction === 'prev' 
      ? subWeeks(currentWeek.start, 1) 
      : addWeeks(currentWeek.start, 1);
    
    const weekStart = startOfWeek(newWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(newWeek, { weekStartsOn: 1 });
    
    setCurrentWeek({
      start: weekStart,
      end: weekEnd,
      number: parseInt(format(weekStart, 'w')),
      year: parseInt(format(weekStart, 'yyyy')),
    });
  };

  const closeWeek = async () => {
    if (!currentWeek || !weeklyData) return;
    
    try {
      const startStr = format(currentWeek.start, 'yyyy-MM-dd');
      const endStr = format(currentWeek.end, 'yyyy-MM-dd');
      
      // Mark all daily summaries as weekly closed
      const { error } = await supabase
        .from('daily_cuadres_summary')
        .update({ 
          is_weekly_closed: true, 
          weekly_closure_notes: closureNotes,
          week_start_date: startStr,
          week_end_date: endStr
        })
        .gte('session_date', startStr)
        .lte('session_date', endStr);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Semana cerrada correctamente',
      });

      // Refresh data
      fetchWeeklyData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al cerrar la semana',
        variant: 'destructive',
      });
    }
  };

  const getFilteredSummary = () => {
    if (selectedAgency === 'all') {
      return weeklyData;
    }
    
    const agency = agenciesData.find(a => a.agency_id === selectedAgency);
    if (!agency) return weeklyData;

    // Filter gastos and deudas details by selected agency
    const selectedAgencyName = allAgencies.find(a => a.id === selectedAgency)?.name || '';
    
    const filteredGastosDetails = weeklyData?.gastosDetails.filter(gasto => 
      gasto.agency_name === selectedAgencyName
    ) || [];
    
    const filteredDeudasDetails = weeklyData?.deudasDetails.filter(deuda => 
      deuda.agency_name === selectedAgencyName
    ) || [];
    
    return {
      totalSales: agency.totalSales,
      totalPrizes: agency.totalPrizes,
      totalGastos: agency.totalGastos,
      totalDeudas: agency.totalDeudas,
      pagoMovilRecibidos: agency.pagoMovilRecibidos,
      pagoMovilPagados: agency.pagoMovilPagados,
      totalPointOfSale: agency.totalPointOfSale,
      totalCashAvailable: agency.totalCashAvailable,
      totalCashAvailableUsd: agency.totalCashAvailableUsd,
      premiosPorPagar: agency.premiosPorPagar,
      averageExchangeRate: agency.averageExchangeRate,
      gastosDetails: filteredGastosDetails,
      deudasDetails: filteredDeudasDetails,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Calculando cuadre semanal...</p>
        </div>
      </div>
    );
  }

  if (!weeklyData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p>No hay datos para mostrar</p>
        </div>
      </div>
    );
  }

  const summary = getFilteredSummary();
  if (!summary) return null;

  // Calculate main cuadre (Sales - Prizes) for the filtered data
  const cuadreVentasPremios = {
    bs: summary.totalSales.bs - summary.totalPrizes.bs,
    usd: summary.totalSales.usd - summary.totalPrizes.usd,
  };

  // Calculate bank total (Mobile received + POS - Mobile paid)
  const totalBanco = summary.pagoMovilRecibidos + summary.totalPointOfSale - summary.pagoMovilPagados;

  // Calculate USD excess (difference) for BS formula
  const excessUsd = summary.totalCashAvailableUsd - cuadreVentasPremios.usd;
  
  // Bolivares Closure Formula (identical to CuadreGeneral)
  const sumatoriaBolivares = 
    summary.totalCashAvailable + 
    totalBanco + 
    summary.totalDeudas.bs + 
    summary.totalGastos.bs + 
    (excessUsd * summary.averageExchangeRate);

  const diferenciaCierre = sumatoriaBolivares - cuadreVentasPremios.bs;
  const diferenciaFinal = diferenciaCierre - summary.premiosPorPagar;
  const isCuadreBalanced = Math.abs(diferenciaFinal) <= 100; // Allow 100 Bs tolerance

  return (
    <div className="space-y-6">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Cuadre Semanal</h1>
          {currentWeek && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className="text-sm font-mono">
                Semana {currentWeek.number}/{currentWeek.year}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por agencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las agencias</SelectItem>
              {allAgencies.map(agency => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {currentWeek && (
        <div className="text-sm text-muted-foreground">
          {format(currentWeek.start, 'dd/MM/yyyy', { locale: es })} - {format(currentWeek.end, 'dd/MM/yyyy', { locale: es })}
          {selectedAgency !== 'all' && (
            <span className="ml-2">
              • Filtrado por: {allAgencies.find(a => a.id === selectedAgency)?.name}
            </span>
          )}
        </div>
      )}

      {/* Main Summary Cards - identical structure to CuadreGeneral */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalSales.bs, 'VES')}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(summary.totalSales.usd, 'USD')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prizes Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premios Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalPrizes.bs, 'VES')}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(summary.totalPrizes.usd, 'USD')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cuadre Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuadre (Ventas - Premios)</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(cuadreVentasPremios.bs, 'VES')}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(cuadreVentasPremios.usd, 'USD')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Final</CardTitle>
            {isCuadreBalanced ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className={`text-2xl font-bold ${isCuadreBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(diferenciaFinal, 'VES')}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isCuadreBalanced ? 'default' : 'destructive'} className="text-xs">
                  {isCuadreBalanced ? 'Cuadrado' : 'Con diferencia'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Payments and POS Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pago Móvil Recibidos</CardTitle>
            <Smartphone className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.pagoMovilRecibidos, 'VES')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pago Móvil Pagados</CardTitle>
            <Smartphone className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.pagoMovilPagados, 'VES')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Punto de Venta</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.totalPointOfSale, 'VES')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Closure Formula Card - identical to CuadreGeneral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Fórmula de Cierre en Bolívares
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span>Efectivo Disponible:</span>
                <span className="font-mono font-semibold">{formatCurrency(summary.totalCashAvailable, 'VES')}</span>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span>Total Banco:</span>
                <span className="font-mono font-semibold">{formatCurrency(totalBanco, 'VES')}</span>
              </div>

              {/* Collapsible Deudas */}
              <Collapsible open={deudasOpen} onOpenChange={setDeudasOpen}>
                <CollapsibleTrigger className="flex justify-between items-center p-2 bg-muted rounded w-full hover:bg-muted/80">
                  <span>Deudas:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{formatCurrency(summary.totalDeudas.bs, 'VES')}</span>
                    {deudasOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {summary.deudasDetails.map((deuda, index) => (
                    <div key={index} className="ml-4 p-2 bg-background border rounded text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{deuda.description}</span>
                        <span className="font-mono">{formatCurrency(Number(deuda.amount_bs), 'VES')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {deuda.agency_name} • {format(new Date(deuda.created_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </div>
                  ))}
                  {summary.deudasDetails.length === 0 && (
                    <div className="ml-4 p-2 text-sm text-muted-foreground">No hay deudas registradas</div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Collapsible Gastos */}
              <Collapsible open={gastosOpen} onOpenChange={setGastosOpen}>
                <CollapsibleTrigger className="flex justify-between items-center p-2 bg-muted rounded w-full hover:bg-muted/80">
                  <span>Gastos:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{formatCurrency(summary.totalGastos.bs, 'VES')}</span>
                    {gastosOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {summary.gastosDetails.map((gasto, index) => (
                    <div key={index} className="ml-4 p-2 bg-background border rounded text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{gasto.description}</span>
                        <span className="font-mono">{formatCurrency(Number(gasto.amount_bs), 'VES')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {gasto.agency_name} • {format(new Date(gasto.created_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </div>
                  ))}
                  {summary.gastosDetails.length === 0 && (
                    <div className="ml-4 p-2 text-sm text-muted-foreground">No hay gastos registrados</div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span>Excedente USD (Bs {summary.averageExchangeRate.toFixed(2)}):</span>
                <span className="font-mono font-semibold">{formatCurrency(excessUsd * summary.averageExchangeRate, 'VES')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Sumatoria en Bolívares</div>
                  <div className="text-2xl font-bold font-mono">{formatCurrency(sumatoriaBolivares, 'VES')}</div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Diferencia de Cierre</div>
                  <div className="text-xl font-bold font-mono">{formatCurrency(diferenciaCierre, 'VES')}</div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Premios por Pagar</div>
                  <div className="text-xl font-bold font-mono">{formatCurrency(summary.premiosPorPagar, 'VES')}</div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${isCuadreBalanced ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    {isCuadreBalanced ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="text-sm text-muted-foreground">Diferencia Final</span>
                  </div>
                  <div className={`text-2xl font-bold font-mono ${isCuadreBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(diferenciaFinal, 'VES')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* USD Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumen en USD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Ventas</div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(summary.totalSales.usd, 'USD')}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Premios</div>
              <div className="text-lg font-bold text-red-600">{formatCurrency(summary.totalPrizes.usd, 'USD')}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Cuadre</div>
              <div className="text-lg font-bold text-blue-600">{formatCurrency(cuadreVentasPremios.usd, 'USD')}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Efectivo Disponible</div>
              <div className="text-lg font-bold">{formatCurrency(summary.totalCashAvailableUsd, 'USD')}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Excedente/Faltante USD</div>
              <div className={`text-lg font-bold ${excessUsd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(excessUsd, 'USD')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agency Breakdown */}
      {selectedAgency === 'all' && agenciesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Desglose por Agencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar agencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredAgencies.map((agency) => {
                  const agencyCuadre = agency.totalSales.bs - agency.totalPrizes.bs;
                  const agencyBanco = agency.pagoMovilRecibidos + agency.totalPointOfSale - agency.pagoMovilPagados;
                  const agencyExcess = agency.totalCashAvailableUsd - (agency.totalSales.usd - agency.totalPrizes.usd);
                  const agencySumatoria = 
                    agency.totalCashAvailable + 
                    agencyBanco + 
                    agency.totalDeudas.bs + 
                    agency.totalGastos.bs + 
                    (agencyExcess * agency.averageExchangeRate);
                  const agencyDiferencia = agencySumatoria - agencyCuadre;
                  const agencyFinal = agencyDiferencia - agency.premiosPorPagar;
                  const agencyBalanced = Math.abs(agencyFinal) <= 100;

                  return (
                    <div key={agency.agency_id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{agency.agency_name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={agencyBalanced ? 'default' : 'destructive'} className="text-xs">
                            {agencyBalanced ? 'Cuadrado' : 'Con diferencia'}
                          </Badge>
                          <span className={`font-mono text-sm ${agencyBalanced ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(agencyFinal, 'VES')}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Ventas:</span>
                          <div className="font-mono">{formatCurrency(agency.totalSales.bs, 'VES')}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Premios:</span>
                          <div className="font-mono">{formatCurrency(agency.totalPrizes.bs, 'VES')}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Efectivo:</span>
                          <div className="font-mono">{formatCurrency(agency.totalCashAvailable, 'VES')}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sesiones:</span>
                          <div className="font-mono">{agency.total_sessions}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown */}
      <Card>
        <Collapsible open={isDailyOpen} onOpenChange={setIsDailyOpen}>
          <CardHeader>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-left">
                <Calendar className="h-5 w-5" />
                Desglose Diario
              </CardTitle>
              {isDailyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
            <div className="space-y-2">
              {dailyDetails.map((day) => (
                <div key={day.day_date} className={`p-3 border rounded-lg ${day.is_completed ? 'bg-muted/50' : 'bg-muted/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="capitalize font-medium">{day.day_name}</div>
                      <div className="text-sm text-muted-foreground">{format(new Date(day.day_date), 'dd/MM/yyyy')}</div>
                      {day.is_completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {day.sessions_count} sesiones
                    </div>
                  </div>
                  {day.is_completed && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Ventas:</span>
                        <div className="font-mono">{formatCurrency(day.total_sales_bs, 'VES')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Premios:</span>
                        <div className="font-mono">{formatCurrency(day.total_prizes_bs, 'VES')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Balance:</span>
                        <div className="font-mono">{formatCurrency(day.balance_bs, 'VES')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">USD:</span>
                        <div className="font-mono">{formatCurrency(day.total_sales_usd - day.total_prizes_usd, 'USD')}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Weekly closure section */}
      {!weeklyData.is_weekly_closed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Cerrar Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="closure-notes">Notas de cierre semanal</Label>
              <Textarea
                id="closure-notes"
                placeholder="Observaciones del cierre semanal..."
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={closeWeek} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Cerrar Semana
            </Button>
          </CardContent>
        </Card>
      )}

      {weeklyData.is_weekly_closed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Semana Cerrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {weeklyData.weekly_closure_notes || 'Sin observaciones'}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}