import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Calculator, CheckCircle2, XCircle, Save, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDateForDB } from '@/lib/dateUtils';

interface CuadreGeneralEncargadaProps {
  selectedAgency: string;
  selectedDate: Date;
  refreshKey?: number;
}

interface ParleySystem {
  name: string;
  sales_bs: number;
  prizes_bs: number;
}

interface SystemSummary {
  id: string;
  name: string;
  code: string;
  sales_bs: number;
  sales_usd: number;
  prizes_bs: number;
  prizes_usd: number;
  hasSublevels: boolean;
}

interface CuadreData {
  // Sales & Prizes
  totalSales: { bs: number; usd: number };
  totalPrizes: { bs: number; usd: number };
  
  // Expenses separated by category
  totalGastos: { bs: number; usd: number };
  totalDeudas: { bs: number; usd: number };
  
  // Detailed expenses for dropdowns
  gastosDetails: Array<{ description: string; amount_bs: number; amount_usd: number; created_at: string }>;
  deudasDetails: Array<{ description: string; amount_bs: number; amount_usd: number; created_at: string }>;
  
  // Mobile payments separated
  pagoMovilRecibidos: number;
  pagoMovilPagados: number;
  
  // Point of sale
  totalPointOfSale: number;
  
  // Daily closure data
  cashAvailable: number;
  cashAvailableUsd: number;
  closureConfirmed: boolean;
  closureNotes: string;
  premiosPorPagar: number;
  
  // Exchange rate
  exchangeRate: number;
  
  // Session info
  sessionId?: string;
  
  // Multiple sessions for agency
  sessionsCount: number;
  
  // Parley y Caballos systems
  parleySystems: ParleySystem[];
  
  // All systems summary
  systemsSummary: SystemSummary[];
}

export const CuadreGeneralEncargada = ({ selectedAgency, selectedDate, refreshKey = 0 }: CuadreGeneralEncargadaProps) => {
  const [cuadre, setCuadre] = useState<CuadreData>({
    totalSales: { bs: 0, usd: 0 },
    totalPrizes: { bs: 0, usd: 0 },
    totalGastos: { bs: 0, usd: 0 },
    totalDeudas: { bs: 0, usd: 0 },
    gastosDetails: [],
    deudasDetails: [],
    pagoMovilRecibidos: 0,
    pagoMovilPagados: 0,
    totalPointOfSale: 0,
    cashAvailable: 0,
    cashAvailableUsd: 0,
    closureConfirmed: false,
    closureNotes: '',
    premiosPorPagar: 0,
    exchangeRate: 36.00,
    sessionsCount: 0,
    parleySystems: [],
    systemsSummary: [],
  });
  
  // Temporary string states for input fields
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('36.00');
  const [cashAvailableInput, setCashAvailableInput] = useState<string>('0');
  const [cashAvailableUsdInput, setCashAvailableUsdInput] = useState<string>('0');
  
  // Track if user has manually edited the fields to prevent overriding them
  const [fieldsEditedByUser, setFieldsEditedByUser] = useState({
    exchangeRate: false,
    cashAvailable: false,
    cashAvailableUsd: false,
  });

  // State for collapsible dropdowns
  const [gastosOpen, setGastosOpen] = useState(false);
  const [deudasOpen, setDeudasOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Limpiar datos anteriores al cambiar agencia/fecha
    setCuadre({
      totalSales: { bs: 0, usd: 0 },
      totalPrizes: { bs: 0, usd: 0 },
      totalGastos: { bs: 0, usd: 0 },
      totalDeudas: { bs: 0, usd: 0 },
      gastosDetails: [],
      deudasDetails: [],
      pagoMovilRecibidos: 0,
      pagoMovilPagados: 0,
      totalPointOfSale: 0,
      cashAvailable: 0,
      cashAvailableUsd: 0,
      closureConfirmed: false,
      closureNotes: '',
      premiosPorPagar: 0,
      exchangeRate: 36.00,
      sessionsCount: 0,
      parleySystems: [],
      systemsSummary: [],
    });
    setExchangeRateInput('36.00');
    setCashAvailableInput('0');
    setCashAvailableUsdInput('0');
    setFieldsEditedByUser({
      exchangeRate: false,
      cashAvailable: false,
      cashAvailableUsd: false,
    });
    
    if (user && selectedAgency && selectedDate) {
      fetchCuadreData();
    }
    
    // Cleanup
    return () => {
      setLoading(false);
    };
  }, [user, selectedAgency, selectedDate, refreshKey]);

  const fetchCuadreData = async () => {
    if (!user || !selectedAgency || !selectedDate) return;

    try {
      setLoading(true);
      const dateStr = formatDateForDB(selectedDate);

      console.log('🔍 CUADRE ENCARGADA DEBUG - Fechas:', { dateStr, selectedAgency });

      // First get users from the selected agency
      const { data: agencyUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('agency_id', selectedAgency);

      console.log('🔍 CUADRE ENCARGADA DEBUG - Agency users:', { agencyUsers, usersError });

      if (usersError) throw usersError;

      const userIds = agencyUsers?.map(u => u.user_id) || [];
      
      if (userIds.length === 0) {
        // No users found for agency; fallback to daily_cuadres_summary
        const { data: summaryRows, error: summaryError } = await supabase
          .from('daily_cuadres_summary')
          .select(`
            total_sales_bs, total_sales_usd,
            total_prizes_bs, total_prizes_usd,
            total_expenses_bs, total_expenses_usd,
            total_mobile_payments_bs, total_pos_bs,
            cash_available_bs, cash_available_usd,
            exchange_rate, daily_closure_confirmed, closure_notes
          `)
          .eq('agency_id', selectedAgency)
          .eq('session_date', dateStr)
          .is('session_id', null);

        console.log('🔍 CUADRE ENCARGADA DEBUG - Summary fallback (no users):', { summaryRows, summaryError });
        if (summaryError) throw summaryError;

        // Además consultar gastos/deudas a nivel de agencia para el día
        const { data: expensesFallback, error: expensesFallbackError } = await supabase
          .from('expenses')
          .select('amount_bs, amount_usd, category, description, created_at')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr);

        if (expensesFallbackError) throw expensesFallbackError;

        const gastosList = (expensesFallback || []).filter(e => e.category === 'gasto_operativo');
        const deudasList = (expensesFallback || []).filter(e => e.category === 'deuda');

        const totalGastosFromExpenses = gastosList.reduce(
          (acc, item: any) => ({
            bs: acc.bs + Number(item.amount_bs || 0),
            usd: acc.usd + Number(item.amount_usd || 0),
          }),
          { bs: 0, usd: 0 }
        );

        const totalDeudasFromExpenses = deudasList.reduce(
          (acc, item: any) => ({
            bs: acc.bs + Number(item.amount_bs || 0),
            usd: acc.usd + Number(item.amount_usd || 0),
          }),
          { bs: 0, usd: 0 }
        );

        if ((summaryRows?.length || 0) > 0) {
          const totalSales = summaryRows!.reduce((acc, r: any) => ({
            bs: acc.bs + Number(r.total_sales_bs || 0),
            usd: acc.usd + Number(r.total_sales_usd || 0),
          }), { bs: 0, usd: 0 });
          const totalPrizes = summaryRows!.reduce((acc, r: any) => ({
            bs: acc.bs + Number(r.total_prizes_bs || 0),
            usd: acc.usd + Number(r.total_prizes_usd || 0),
          }), { bs: 0, usd: 0 });
          const totalGastos = summaryRows!.reduce((acc, r: any) => ({
            bs: acc.bs + Number(r.total_expenses_bs || 0),
            usd: acc.usd + Number(r.total_expenses_usd || 0),
          }), { bs: 0, usd: 0 });
          const pagoMovilRecibidos = summaryRows!.reduce((sum, r: any) => sum + Number(r.total_mobile_payments_bs || 0), 0);
          const totalPointOfSale = summaryRows!.reduce((sum, r: any) => sum + Number(r.total_pos_bs || 0), 0);
          const cashAvailable = summaryRows!.reduce((sum, r: any) => sum + Number(r.cash_available_bs || 0), 0);
          const cashAvailableUsd = summaryRows!.reduce((sum, r: any) => sum + Number(r.cash_available_usd || 0), 0);
          const averageExchangeRate = summaryRows!.reduce((sum, r: any) => sum + Number(r.exchange_rate || 36), 0) / summaryRows!.length;
          const closureConfirmed = summaryRows!.every((r: any) => !!r.daily_closure_confirmed);
          const closureNotes = summaryRows!.map((r: any) => r.closure_notes).filter(Boolean).join(' | ');

          setCuadre({
            totalSales,
            totalPrizes,
            // Sumar también los gastos de la tabla expenses (por si el resumen aún no los refleja)
            totalGastos: {
              bs: totalGastos.bs + totalGastosFromExpenses.bs,
              usd: totalGastos.usd + totalGastosFromExpenses.usd,
            },
            totalDeudas: totalDeudasFromExpenses,
            gastosDetails: gastosList as any,
            deudasDetails: deudasList as any,
            pagoMovilRecibidos,
            pagoMovilPagados: 0,
            totalPointOfSale,
            cashAvailable,
            cashAvailableUsd,
            closureConfirmed,
            closureNotes,
            premiosPorPagar: 0,
            exchangeRate: averageExchangeRate,
            sessionsCount: 0,
            parleySystems: [],
            systemsSummary: [],
          });
        } else {
          setCuadre({
            totalSales: { bs: 0, usd: 0 },
            totalPrizes: { bs: 0, usd: 0 },
            totalGastos: totalGastosFromExpenses,
            totalDeudas: totalDeudasFromExpenses,
            gastosDetails: gastosList as any,
            deudasDetails: deudasList as any,
            pagoMovilRecibidos: 0,
            pagoMovilPagados: 0,
            totalPointOfSale: 0,
            cashAvailable: 0,
            cashAvailableUsd: 0,
            closureConfirmed: false,
            closureNotes: '',
            premiosPorPagar: 0,
            exchangeRate: 36.00,
            sessionsCount: 0,
            parleySystems: [],
            systemsSummary: [],
          });
        }
        setLoading(false);
        return;
      }

      // Get sessions for the agency users on the selected date
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select(`
          id, 
          cash_available_bs, 
          cash_available_usd, 
          daily_closure_confirmed, 
          closure_notes, 
          exchange_rate,
          user_id
        `)
        .in('user_id', userIds)
        .eq('session_date', dateStr);

      console.log('🔍 CUADRE ENCARGADA DEBUG - Sessions query:', { sessions, sessionsError });

      if (sessionsError) throw sessionsError;

      const sessionIds = sessions?.map(s => s.id) || [];
      console.log('🔍 CUADRE ENCARGADA DEBUG - Session IDs to query:', sessionIds);

        // No sessions found; fallback to daily_cuadres_summary (agency-level)
        const { data: summaryRows, error: summaryError } = await supabase
          .from('daily_cuadres_summary')
          .select(`
            total_sales_bs, total_sales_usd,
            total_prizes_bs, total_prizes_usd,
            total_expenses_bs, total_expenses_usd,
            total_mobile_payments_bs, total_pos_bs,
            cash_available_bs, cash_available_usd,
            exchange_rate, daily_closure_confirmed, closure_notes
          `)
          .eq('agency_id', selectedAgency)
          .eq('session_date', dateStr)
          .is('session_id', null);

        console.log('🔍 CUADRE ENCARGADA DEBUG - Summary fallback (no sessions):', { summaryRows, summaryError });
        if (summaryError) throw summaryError;

        // Además consultar gastos/deudas a nivel de agencia para el día
        const { data: expensesFallback, error: expensesFallbackError } = await supabase
          .from('expenses')
          .select('amount_bs, amount_usd, category, description, created_at')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr);

        if (expensesFallbackError) throw expensesFallbackError;

        const gastosList = (expensesFallback || []).filter(e => e.category === 'gasto_operativo');
        const deudasList = (expensesFallback || []).filter(e => e.category === 'deuda');

        const totalGastosFromExpenses = gastosList.reduce(
          (acc, item: any) => ({
            bs: acc.bs + Number(item.amount_bs || 0),
            usd: acc.usd + Number(item.amount_usd || 0),
          }),
          { bs: 0, usd: 0 }
        );

        const totalDeudasFromExpenses = deudasList.reduce(
          (acc, item: any) => ({
            bs: acc.bs + Number(item.amount_bs || 0),
            usd: acc.usd + Number(item.amount_usd || 0),
          }),
          { bs: 0, usd: 0 }
        );

        if ((summaryRows?.length || 0) > 0) {
          const totalSales = summaryRows!.reduce((acc, r: any) => ({
            bs: acc.bs + Number(r.total_sales_bs || 0),
            usd: acc.usd + Number(r.total_sales_usd || 0),
          }), { bs: 0, usd: 0 });
          const totalPrizes = summaryRows!.reduce((acc, r: any) => ({
            bs: acc.bs + Number(r.total_prizes_bs || 0),
            usd: acc.usd + Number(r.total_prizes_usd || 0),
          }), { bs: 0, usd: 0 });
          const totalGastos = summaryRows!.reduce((acc, r: any) => ({
            bs: acc.bs + Number(r.total_expenses_bs || 0),
            usd: acc.usd + Number(r.total_expenses_usd || 0),
          }), { bs: 0, usd: 0 });
          const pagoMovilRecibidos = summaryRows!.reduce((sum, r: any) => sum + Number(r.total_mobile_payments_bs || 0), 0);
          const totalPointOfSale = summaryRows!.reduce((sum, r: any) => sum + Number(r.total_pos_bs || 0), 0);
          const cashAvailable = summaryRows!.reduce((sum, r: any) => sum + Number(r.cash_available_bs || 0), 0);
          const cashAvailableUsd = summaryRows!.reduce((sum, r: any) => sum + Number(r.cash_available_usd || 0), 0);
          const averageExchangeRate = summaryRows!.reduce((sum, r: any) => sum + Number(r.exchange_rate || 36), 0) / summaryRows!.length;
          const closureConfirmed = summaryRows!.every((r: any) => !!r.daily_closure_confirmed);
          const closureNotes = summaryRows!.map((r: any) => r.closure_notes).filter(Boolean).join(' | ');

          setCuadre({
            totalSales,
            totalPrizes,
            // Sumar también los gastos de la tabla expenses (por si el resumen aún no los refleja)
            totalGastos: {
              bs: totalGastos.bs + totalGastosFromExpenses.bs,
              usd: totalGastos.usd + totalGastosFromExpenses.usd,
            },
            totalDeudas: totalDeudasFromExpenses,
            gastosDetails: gastosList as any,
            deudasDetails: deudasList as any,
            pagoMovilRecibidos,
            pagoMovilPagados: 0,
            totalPointOfSale,
            cashAvailable,
            cashAvailableUsd,
            closureConfirmed,
            closureNotes,
            premiosPorPagar: 0,
            exchangeRate: averageExchangeRate,
            sessionsCount: 0,
            parleySystems: [],
            systemsSummary: [],
          });
        } else {
          setCuadre({
            totalSales: { bs: 0, usd: 0 },
            totalPrizes: { bs: 0, usd: 0 },
            totalGastos: totalGastosFromExpenses,
            totalDeudas: totalDeudasFromExpenses,
            gastosDetails: gastosList as any,
            deudasDetails: deudasList as any,
            pagoMovilRecibidos: 0,
            pagoMovilPagados: 0,
            totalPointOfSale: 0,
            cashAvailable: 0,
            cashAvailableUsd: 0,
            closureConfirmed: false,
            closureNotes: '',
            premiosPorPagar: 0,
            exchangeRate: 36.00,
            sessionsCount: 0,
            parleySystems: [],
            systemsSummary: [],
          });
        }
        setLoading(false);
        return;

      // Fetch all data in parallel
      const [
        salesData, 
        prizesData, 
        expensesData, 
        mobilePaymentsData, 
        posData,
        pendingPrizesData,
        parleySalesData,
        parleyPrizesData,
        lotterySystems,
        allSalesData,
        allPrizesData,
        allLotterySystems
      ] = await Promise.all([
        supabase
          .from('sales_transactions')
          .select('amount_bs, amount_usd')
          .in('session_id', sessionIds),
        supabase
          .from('prize_transactions')
          .select('amount_bs, amount_usd')
          .in('session_id', sessionIds),
        supabase
          .from('expenses')
          .select('amount_bs, amount_usd, category, description, created_at')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        supabase
          .from('mobile_payments')
          .select('amount_bs, description')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        supabase
          .from('point_of_sale')
          .select('amount_bs')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        supabase
          .from('pending_prizes')
          .select('amount_bs, is_paid')
          .in('session_id', sessionIds),
        supabase
          .from('sales_transactions')
          .select('lottery_system_id, amount_bs')
          .in('session_id', sessionIds),
        supabase
          .from('prize_transactions')
          .select('lottery_system_id, amount_bs')
          .in('session_id', sessionIds),
        supabase
          .from('lottery_systems')
          .select('id, name, code, parent_system_id')
          .in('code', ['INMEJORABLE-MULTIS-1', 'INMEJORABLE-MULTIS-2', 'INMEJORABLE-MULTIS-3', 'INMEJORABLE-MULTIS-4', 'INMEJORABLE-5Y6', 'POLLA', 'MULTISPORT-CABALLOS-NAC', 'MULTISPORT-CABALLOS-INT', 'MULTISPORT-5Y6']),
        supabase
          .from('sales_transactions')
          .select('lottery_system_id, amount_bs, amount_usd')
          .in('session_id', sessionIds),
        supabase
          .from('prize_transactions')
          .select('lottery_system_id, amount_bs, amount_usd')
          .in('session_id', sessionIds),
        supabase
          .from('lottery_systems')
          .select('id, name, code, parent_system_id, has_subcategories')
          .eq('is_active', true)
      ]);

      console.log('🔍 CUADRE ENCARGADA DEBUG - Query results:', {
        salesData: { data: salesData.data, error: salesData.error },
        prizesData: { data: prizesData.data, error: prizesData.error },
        expensesData: { data: expensesData.data, error: expensesData.error },
        mobilePaymentsData: { data: mobilePaymentsData.data, error: mobilePaymentsData.error },
        posData: { data: posData.data, error: posData.error },
        pendingPrizesData: { data: pendingPrizesData.data, error: pendingPrizesData.error },
        parleySalesData: { data: parleySalesData.data, error: parleySalesData.error },
        parleyPrizesData: { data: parleyPrizesData.data, error: parleyPrizesData.error },
        lotterySystems: { data: lotterySystems.data, error: lotterySystems.error }
      });

      // Check for errors
      if (salesData.error) throw salesData.error;
      if (prizesData.error) throw prizesData.error;
      if (expensesData.error) throw expensesData.error;
      if (mobilePaymentsData.error) throw mobilePaymentsData.error;
      if (posData.error) throw posData.error;
      if (pendingPrizesData.error) throw pendingPrizesData.error;

      // Calculate totals
      const totalSales = salesData.data?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      const totalPrizes = prizesData.data?.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      ) || { bs: 0, usd: 0 };

      // Separate expenses by category
      const gastos = expensesData.data?.filter(e => e.category === 'gasto_operativo') || [];
      const deudas = expensesData.data?.filter(e => e.category === 'deuda') || [];

      const totalGastos = gastos.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      );

      const totalDeudas = deudas.reduce(
        (acc, item) => ({
          bs: acc.bs + Number(item.amount_bs || 0),
          usd: acc.usd + Number(item.amount_usd || 0),
        }),
        { bs: 0, usd: 0 }
      );

      // Separate mobile payments (positive = received, negative = paid)
      const pagoMovilRecibidos = mobilePaymentsData.data?.reduce(
        (sum, item) => {
          const amount = Number(item.amount_bs || 0);
          return amount > 0 ? sum + amount : sum;
        },
        0
      ) || 0;

      const pagoMovilPagados = Math.abs(mobilePaymentsData.data?.reduce(
        (sum, item) => {
          const amount = Number(item.amount_bs || 0);
          return amount < 0 ? sum + amount : sum;
        },
        0
      ) || 0);

      const totalPointOfSale = posData.data?.reduce(
        (sum, item) => sum + Number(item.amount_bs || 0),
        0
      ) || 0;

      // Calculate pending prizes from new table
      const premiosPorPagarFromDB = pendingPrizesData.data?.filter(p => !p.is_paid)
        .reduce((sum, item) => sum + Number(item.amount_bs || 0), 0) || 0;

      // Aggregate session data
      const totalCashAvailable = sessions?.reduce((sum, s) => sum + Number(s.cash_available_bs || 0), 0) || 0;
      const totalCashAvailableUsd = sessions?.reduce((sum, s) => sum + Number(s.cash_available_usd || 0), 0) || 0;
      const averageExchangeRate = sessions?.length ? 
        sessions.reduce((sum, s) => sum + Number(s.exchange_rate || 36), 0) / sessions.length : 36;
      const allConfirmed = sessions?.every(s => s.daily_closure_confirmed) || false;
      const combinedNotes = sessions?.map(s => s.closure_notes).filter(n => n).join(' | ') || '';

      // Process Parley y Caballos systems
      const systemsMap = new Map<string, ParleySystem>();
      lotterySystems.data?.forEach(system => {
        systemsMap.set(system.id, {
          name: system.name,
          sales_bs: 0,
          prizes_bs: 0,
        });
      });

      // Aggregate sales by system
      parleySalesData.data?.forEach(sale => {
        const system = systemsMap.get(sale.lottery_system_id);
        if (system) {
          system.sales_bs += Number(sale.amount_bs || 0);
        }
      });

      // Aggregate prizes by system
      parleyPrizesData.data?.forEach(prize => {
        const system = systemsMap.get(prize.lottery_system_id);
        if (system) {
          system.prizes_bs += Number(prize.amount_bs || 0);
        }
      });

      const parleySystems = Array.from(systemsMap.values());

      // Process all systems summary
      const allSystemsMap = new Map<string, SystemSummary>();
      
      // Build systems map - group by parent if has sublevel
      allLotterySystems.data?.forEach(system => {
        const systemKey = system.parent_system_id || system.id;
        
        if (!allSystemsMap.has(systemKey)) {
          // Find parent system info
          const parentSystem = system.parent_system_id 
            ? allLotterySystems.data?.find(s => s.id === system.parent_system_id)
            : system;
          
          allSystemsMap.set(systemKey, {
            id: systemKey,
            name: parentSystem?.name || system.name,
            code: parentSystem?.code || system.code,
            sales_bs: 0,
            sales_usd: 0,
            prizes_bs: 0,
            prizes_usd: 0,
            hasSublevels: !!system.parent_system_id || system.has_subcategories,
          });
        }
      });

      // Aggregate sales by system (group sublevels into parent)
      allSalesData.data?.forEach(sale => {
        const system = allLotterySystems.data?.find(s => s.id === sale.lottery_system_id);
        if (system) {
          const systemKey = system.parent_system_id || system.id;
          const summarySystem = allSystemsMap.get(systemKey);
          if (summarySystem) {
            summarySystem.sales_bs += Number(sale.amount_bs || 0);
            summarySystem.sales_usd += Number(sale.amount_usd || 0);
          }
        }
      });

      // Aggregate prizes by system (group sublevels into parent)
      allPrizesData.data?.forEach(prize => {
        const system = allLotterySystems.data?.find(s => s.id === prize.lottery_system_id);
        if (system) {
          const systemKey = system.parent_system_id || system.id;
          const summarySystem = allSystemsMap.get(systemKey);
          if (summarySystem) {
            summarySystem.prizes_bs += Number(prize.amount_bs || 0);
            summarySystem.prizes_usd += Number(prize.amount_usd || 0);
          }
        }
      });

      const systemsSummary = Array.from(allSystemsMap.values())
        .filter(s => s.sales_bs > 0 || s.prizes_bs > 0 || s.sales_usd > 0 || s.prizes_usd > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      const finalCuadre = {
        totalSales,
        totalPrizes,
        totalGastos,
        totalDeudas,
        gastosDetails: gastos,
        deudasDetails: deudas,
        pagoMovilRecibidos,
        pagoMovilPagados,
        totalPointOfSale,
        cashAvailable: totalCashAvailable,
        cashAvailableUsd: totalCashAvailableUsd,
        closureConfirmed: allConfirmed,
        closureNotes: combinedNotes,
        premiosPorPagar: premiosPorPagarFromDB,
        exchangeRate: averageExchangeRate,
        sessionId: sessions?.[0]?.id,
        sessionsCount: sessions?.length || 0,
        parleySystems,
        systemsSummary,
      };
      
        setCuadre(finalCuadre);
        
        // Update input states only if user hasn't edited them manually
        if (!fieldsEditedByUser.exchangeRate) {
          setExchangeRateInput(finalCuadre.exchangeRate.toString());
        }
        if (!fieldsEditedByUser.cashAvailable) {
          setCashAvailableInput(finalCuadre.cashAvailable.toString());
        }
        if (!fieldsEditedByUser.cashAvailableUsd) {
          setCashAvailableUsdInput(finalCuadre.cashAvailableUsd.toString());
        }
    } catch (error) {
      console.error('Error fetching cuadre data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save daily closure function
  const saveDailyClosure = async () => {
    if (!user || !selectedAgency || !selectedDate) {
      toast({
        title: 'Error',
        description: 'Usuario, agencia o fecha no válidos',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dateStr = formatDateForDB(selectedDate);
      
      // Update the cuadre with current input values
      const updatedCuadre = {
        ...cuadre,
        exchangeRate: parseFloat(exchangeRateInput) || 36.00,
        cashAvailable: parseFloat(cashAvailableInput) || 0,
        cashAvailableUsd: parseFloat(cashAvailableUsdInput) || 0,
      };

      // Save to daily_cuadres_summary (agency level)
      const payload = {
        agency_id: selectedAgency,
        session_date: dateStr,
        total_sales_bs: updatedCuadre.totalSales.bs,
        total_sales_usd: updatedCuadre.totalSales.usd,
        total_prizes_bs: updatedCuadre.totalPrizes.bs,
        total_prizes_usd: updatedCuadre.totalPrizes.usd,
        total_expenses_bs: updatedCuadre.totalGastos.bs + updatedCuadre.totalDeudas.bs,
        total_expenses_usd: updatedCuadre.totalGastos.usd + updatedCuadre.totalDeudas.usd,
        total_debt_bs: updatedCuadre.totalDeudas.bs,
        total_debt_usd: updatedCuadre.totalDeudas.usd,
        total_mobile_payments_bs: updatedCuadre.pagoMovilRecibidos - updatedCuadre.pagoMovilPagados,
        total_pos_bs: updatedCuadre.totalPointOfSale,
        cash_available_bs: updatedCuadre.cashAvailable,
        cash_available_usd: updatedCuadre.cashAvailableUsd,
        exchange_rate: updatedCuadre.exchangeRate,
        pending_prizes: updatedCuadre.premiosPorPagar,
        daily_closure_confirmed: updatedCuadre.closureConfirmed,
        closure_notes: updatedCuadre.closureNotes,
        session_id: null, // Encargada level entry
        user_id: user.id,
        is_closed: true,
      };

      const { error } = await supabase
        .from('daily_cuadres_summary')
        .upsert(payload, { 
          onConflict: 'agency_id,session_date,user_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Cuadre guardado correctamente',
      });

      // Update local state
      setCuadre(updatedCuadre);
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al guardar el cuadre',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Calculando resumen general...</p>
        </div>
      </div>
    );
  }

  // Calculate main cuadre (Sales - Prizes)
  const cuadreVentasPremios = {
    bs: cuadre.totalSales.bs - cuadre.totalPrizes.bs,
    usd: cuadre.totalSales.usd - cuadre.totalPrizes.usd,
  };

  // Calculate bank total (Mobile received + POS - Mobile paid)
  const totalBanco = cuadre.pagoMovilRecibidos + cuadre.totalPointOfSale - cuadre.pagoMovilPagados;

  // Calculate USD excess (difference) for BS formula
  const excessUsd = cuadre.cashAvailableUsd - cuadreVentasPremios.usd;
  
  // Bolivares Closure Formula
  const sumatoriaBolivares = 
    cuadre.cashAvailable + 
    totalBanco + 
    cuadre.totalDeudas.bs + 
    cuadre.totalGastos.bs + 
    (excessUsd * cuadre.exchangeRate);

  const diferenciaCierre = sumatoriaBolivares - cuadreVentasPremios.bs;
  const diferenciaFinal = diferenciaCierre - cuadre.premiosPorPagar;
  const isCuadreBalanced = Math.abs(diferenciaFinal) <= 100; // Allow 100 Bs tolerance

  return (
    <div className="space-y-6">
      {/* Title and Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Resumen General</h2>
          {cuadre.sessionsCount > 0 && (
            <Badge variant="outline">
              {cuadre.sessionsCount} sesión{cuadre.sessionsCount !== 1 ? 'es' : ''}
            </Badge>
          )}
        </div>
        {cuadre.closureConfirmed && (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Cuadre Confirmado
          </Badge>
        )}
      </div>

      {/* Exchange Rate Display */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="text-center space-y-2">
            <div className="text-lg">💱</div>
            <p className="text-sm text-muted-foreground">
              Tasa promedio del día: <span className="font-bold">{cuadre.exchangeRate.toFixed(2)} Bs por USD</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campos editables para encargada */}
      <Card className="border-2 border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-amber-700 flex items-center gap-2">
            <Save className="h-5 w-5" />
            Configuración del Cuadre
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exchange-rate">Tasa BCV (Bs/$)</Label>
              <Input
                id="exchange-rate"
                type="number"
                step="0.01"
                value={exchangeRateInput}
                onChange={(e) => {
                  setExchangeRateInput(e.target.value);
                  setFieldsEditedByUser(prev => ({ ...prev, exchangeRate: true }));
                  const rate = parseFloat(e.target.value) || 36.00;
                  setCuadre(prev => ({ ...prev, exchangeRate: rate }));
                }}
                className="text-center font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cash-bs">Efectivo Disponible (Bs)</Label>
              <Input
                id="cash-bs"
                type="number"
                step="0.01"
                value={cashAvailableInput}
                onChange={(e) => {
                  setCashAvailableInput(e.target.value);
                  setFieldsEditedByUser(prev => ({ ...prev, cashAvailable: true }));
                  const amount = parseFloat(e.target.value) || 0;
                  setCuadre(prev => ({ ...prev, cashAvailable: amount }));
                }}
                className="text-center font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cash-usd">Efectivo Disponible (USD)</Label>
              <Input
                id="cash-usd"
                type="number"
                step="0.01"
                value={cashAvailableUsdInput}
                onChange={(e) => {
                  setCashAvailableUsdInput(e.target.value);
                  setFieldsEditedByUser(prev => ({ ...prev, cashAvailableUsd: true }));
                  const amount = parseFloat(e.target.value) || 0;
                  setCuadre(prev => ({ ...prev, cashAvailableUsd: amount }));
                }}
                className="text-center font-mono"
              />
            </div>
          </div>
          
          <Button onClick={saveDailyClosure} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Guardar Cuadre del Día
          </Button>
        </CardContent>
      </Card>

      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Sales */}
        <Card className="border-2 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(cuadre.totalSales.bs, 'VES')}
            </p>
            <p className="text-sm text-green-600">
              {formatCurrency(cuadre.totalSales.usd, 'USD')}
            </p>
          </CardContent>
        </Card>

        {/* Total Prizes */}
        <Card className="border-2 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">Total Premios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(cuadre.totalPrizes.bs, 'VES')}
            </p>
            <p className="text-sm text-red-600">
              {formatCurrency(cuadre.totalPrizes.usd, 'USD')}
            </p>
          </CardContent>
        </Card>

        {/* Net Sales */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700">Cuadre (Ventas - Premios)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(cuadreVentasPremios.bs, 'VES')}
            </p>
            <p className="text-sm text-blue-600">
              {formatCurrency(cuadreVentasPremios.usd, 'USD')}
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-success flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pago Móvil Recibidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-success">
              {formatCurrency(cuadre.pagoMovilRecibidos, 'VES')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Pago Móvil Pagados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-destructive">
              {formatCurrency(cuadre.pagoMovilPagados, 'VES')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">
              Punto de Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(cuadre.totalPointOfSale, 'VES')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Closure Formula Card */}
      <Card className="border-2 border-primary/20 border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-primary">Resumen en Bolívares</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Sumatoria:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Efectivo del día:</span>
                    <span className="font-medium">{formatCurrency(cuadre.cashAvailable, 'VES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total en banco:</span>
                    <span className="font-medium">{formatCurrency(totalBanco, 'VES')}</span>
                  </div>
                  <Collapsible open={deudasOpen} onOpenChange={setDeudasOpen}>
                    <CollapsibleTrigger asChild>
                      <div className="flex justify-between items-center cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors">
                        <span className="flex items-center gap-1">
                          {deudasOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          Deudas:
                        </span>
                        <span className="font-medium">{formatCurrency(cuadre.totalDeudas.bs, 'VES')}</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 mt-2 space-y-1 text-xs">
                        {cuadre.deudasDetails.length > 0 ? (
                          cuadre.deudasDetails.map((deuda, index) => (
                            <div key={index} className="flex justify-between items-center py-1 px-2 bg-muted/30 rounded">
                              <div className="flex-1">
                                <span className="text-muted-foreground">{deuda.description}</span>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(deuda.created_at), 'dd/MM/yyyy')}
                                </div>
                              </div>
                              <div className="text-right">
                                <div>{formatCurrency(deuda.amount_bs, 'VES')}</div>
                                {deuda.amount_usd > 0 && (
                                  <div className="text-xs text-muted-foreground">{formatCurrency(deuda.amount_usd, 'USD')}</div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground text-center py-2">No hay deudas registradas</div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible open={gastosOpen} onOpenChange={setGastosOpen}>
                    <CollapsibleTrigger asChild>
                      <div className="flex justify-between items-center cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors">
                        <span className="flex items-center gap-1">
                          {gastosOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          Gastos:
                        </span>
                        <span className="font-medium">{formatCurrency(cuadre.totalGastos.bs, 'VES')}</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 mt-2 space-y-1 text-xs">
                        {cuadre.gastosDetails.length > 0 ? (
                          cuadre.gastosDetails.map((gasto, index) => (
                            <div key={index} className="flex justify-between items-center py-1 px-2 bg-muted/30 rounded">
                              <div className="flex-1">
                                <span className="text-muted-foreground">{gasto.description}</span>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(gasto.created_at), 'dd/MM/yyyy')}
                                </div>
                              </div>
                              <div className="text-right">
                                <div>{formatCurrency(gasto.amount_bs, 'VES')}</div>
                                {gasto.amount_usd > 0 && (
                                  <div className="text-xs text-muted-foreground">{formatCurrency(gasto.amount_usd, 'USD')}</div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground text-center py-2">No hay gastos registrados</div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <div className="flex justify-between">
                    <span>Excedente USD → Bs (x{cuadre.exchangeRate.toFixed(2)}):</span>
                    <span className="font-medium">{formatCurrency(excessUsd * cuadre.exchangeRate, 'VES')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total Sumatoria:</span>
                    <span>{formatCurrency(sumatoriaBolivares, 'VES')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Comparación:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sumatoria:</span>
                    <span className="font-medium">{formatCurrency(sumatoriaBolivares, 'VES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cuadre (V-P):</span>
                    <span className="font-medium">{formatCurrency(cuadreVentasPremios.bs, 'VES')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Diferencia inicial:</span>
                    <span className="font-medium">{formatCurrency(diferenciaCierre, 'VES')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Menos: Premios por pagar:</span>
                    <span className="font-medium">-{formatCurrency(cuadre.premiosPorPagar, 'VES')}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-bold text-xl mb-4">
                    <span>Diferencia Final:</span>
                    <span className={`${isCuadreBalanced ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(diferenciaFinal, 'VES')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-center mt-4">
                    {isCuadreBalanced ? (
                      <Badge variant="default" className="flex items-center gap-2 px-4 py-2 text-base">
                        <CheckCircle2 className="h-4 w-4" />
                        ¡Cuadre Perfecto!
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-2 px-4 py-2 text-base">
                        <XCircle className="h-4 w-4" />
                        Diferencia encontrada
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* USD Closure Formula Card */}
      <Card className="border-2 border-accent/20 border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="text-accent">Resumen en Dólares (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Sumatoria USD:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Efectivo en dólares:</span>
                    <span className="font-medium">{formatCurrency(cuadre.cashAvailableUsd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos en USD:</span>
                    <span className="font-medium">{formatCurrency(cuadre.totalGastos.usd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deudas en USD:</span>
                    <span className="font-medium">{formatCurrency(cuadre.totalDeudas.usd, 'USD')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total USD:</span>
                    <span>{formatCurrency(cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd, 'USD')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Comparación USD:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total USD:</span>
                    <span className="font-medium">{formatCurrency(cuadre.cashAvailableUsd + cuadre.totalGastos.usd + cuadre.totalDeudas.usd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cuadre USD (V-P):</span>
                    <span className="font-medium">{formatCurrency(cuadreVentasPremios.usd, 'USD')}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-bold text-xl">
                    <span>Diferencia USD:</span>
                    <span className={`${Math.abs(excessUsd) <= 10 ? 'text-success' : 'text-accent'}`}>
                      {formatCurrency(excessUsd, 'USD')}
                    </span>
                  </div>
                  {Math.abs(excessUsd) > 10 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {excessUsd > 0 ? 'Excedente convertido a Bs en el cálculo' : 'Déficit manejado en el cálculo'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parley y Caballos Section */}
      {cuadre.parleySystems.length > 0 && (
        <>
          <div className="py-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
              <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider px-4 py-2 bg-purple-50 rounded-full border border-purple-200">
                Parley y Caballos
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
            </div>
          </div>

          <Card className="border-2 border-purple-200">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Totales Generales */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-xs text-green-700 mb-1">Total Ventas</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(
                        cuadre.parleySystems.reduce((sum, sys) => sum + sys.sales_bs, 0),
                        'VES'
                      )}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded border border-red-200">
                    <p className="text-xs text-red-700 mb-1">Total Premios</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(
                        cuadre.parleySystems.reduce((sum, sys) => sum + sys.prizes_bs, 0),
                        'VES'
                      )}
                    </p>
                  </div>
                </div>

                {/* Lista de Sistemas */}
                <div className="space-y-2">
                  {cuadre.parleySystems.map((system, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{system.name}</span>
                        <div className="flex gap-4 text-xs">
                          <span className="text-green-600">
                            V: {formatCurrency(system.sales_bs, 'VES')}
                          </span>
                          <span className="text-red-600">
                            P: {formatCurrency(system.prizes_bs, 'VES')}
                          </span>
                          <span className="text-blue-600 font-medium">
                            Neto: {formatCurrency(system.sales_bs - system.prizes_bs, 'VES')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Neto Total */}
                <div className="pt-3 border-t border-purple-200">
                  <div className="flex justify-between items-center text-center p-3 bg-blue-50 rounded border border-blue-200">
                    <span className="text-sm font-bold text-blue-700">NETO TOTAL (Ventas - Premios)</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(
                        cuadre.parleySystems.reduce((sum, sys) => sum + (sys.sales_bs - sys.prizes_bs), 0),
                        'VES'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Systems Summary Section */}
      {cuadre.systemsSummary.length > 0 && (
        <>
          <div className="py-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
              <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
                Resumen Por Sistemas
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
            </div>
          </div>

          <Card className="border-2 border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
                  <div>Sistema</div>
                  <div className="text-right">Ventas Bs</div>
                  <div className="text-right">Premios Bs</div>
                  <div className="text-right">Ventas USD</div>
                  <div className="text-right">Premios USD</div>
                  <div className="text-right">Neto Bs</div>
                </div>

                {/* Systems List */}
                <div className="space-y-1">
                  {cuadre.systemsSummary.map((system, index) => {
                    const netoBs = system.sales_bs - system.prizes_bs;
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-6 gap-2 p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors text-xs"
                      >
                        <div className="font-medium flex items-center">
                          {system.name}
                          {system.hasSublevels && (
                            <Badge variant="outline" className="ml-2 text-xs">Sub</Badge>
                          )}
                        </div>
                        <div className="text-right text-green-600 font-medium">
                          {formatCurrency(system.sales_bs, 'VES')}
                        </div>
                        <div className="text-right text-red-600 font-medium">
                          {formatCurrency(system.prizes_bs, 'VES')}
                        </div>
                        <div className="text-right text-green-600">
                          {formatCurrency(system.sales_usd, 'USD')}
                        </div>
                        <div className="text-right text-red-600">
                          {formatCurrency(system.prizes_usd, 'USD')}
                        </div>
                        <div className={`text-right font-bold ${netoBs >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
                          {formatCurrency(netoBs, 'VES')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="pt-3 border-t-2 border-blue-300">
                  <div className="grid grid-cols-6 gap-2 p-3 bg-blue-50 rounded border border-blue-200 text-sm font-bold">
                    <div className="text-blue-700">TOTALES</div>
                    <div className="text-right text-green-700">
                      {formatCurrency(
                        cuadre.systemsSummary.reduce((sum, sys) => sum + sys.sales_bs, 0),
                        'VES'
                      )}
                    </div>
                    <div className="text-right text-red-700">
                      {formatCurrency(
                        cuadre.systemsSummary.reduce((sum, sys) => sum + sys.prizes_bs, 0),
                        'VES'
                      )}
                    </div>
                    <div className="text-right text-green-700">
                      {formatCurrency(
                        cuadre.systemsSummary.reduce((sum, sys) => sum + sys.sales_usd, 0),
                        'USD'
                      )}
                    </div>
                    <div className="text-right text-red-700">
                      {formatCurrency(
                        cuadre.systemsSummary.reduce((sum, sys) => sum + sys.prizes_usd, 0),
                        'USD'
                      )}
                    </div>
                    <div className="text-right text-blue-700">
                      {formatCurrency(
                        cuadre.systemsSummary.reduce((sum, sys) => sum + (sys.sales_bs - sys.prizes_bs), 0),
                        'VES'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Notes Section */}
      {cuadre.closureNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notas del Cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm p-3 bg-muted/50 rounded border">
              {cuadre.closureNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};