import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ChevronLeft, ChevronRight, Lock, Users, Banknote, Trophy, DollarSign, ChevronDown, ChevronUp, Building2, Search, Receipt, HandCoins, CreditCard, Smartphone } from 'lucide-react';
import { GastosOperativosForm } from '@/components/taquillera/GastosOperativosForm';
import { InterAgencyLoansForm } from '@/components/encargada/InterAgencyLoansForm';
import { PagoMovilRecibidos } from '@/components/taquillera/PagoMovilRecibidos';
import { PagoMovilPagados } from '@/components/taquillera/PagoMovilPagados';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeeklyData {
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  total_expenses_bs: number;
  total_expenses_usd: number;
  total_debt_bs: number;
  total_debt_usd: number;
  total_bank_bs: number;
  total_balance_bs: number;
  total_balance_usd: number;
  total_sessions: number;
  is_weekly_closed: boolean;
  weekly_closure_notes: string;
}

interface AgencyWeeklyData {
  agency_id: string;
  agency_name: string;
  total_sales_bs: number;
  total_sales_usd: number;
  total_prizes_bs: number;
  total_prizes_usd: number;
  total_expenses_bs: number;
  total_expenses_usd: number;
  total_debt_bs: number;
  total_debt_usd: number;
  total_bank_bs: number;
  total_balance_bs: number;
  total_balance_usd: number;
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
      // Use the existing RPC function that handles Venezuela timezone correctly
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
        // Fallback to local calculation
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
        
        setCurrentWeek({
          start: weekStart,
          end: weekEnd,
          number: parseInt(format(weekStart, 'w')),
          year: parseInt(format(weekStart, 'yyyy')),
        });
      }
    } catch (error: any) {
      console.error('Error getting week boundaries:', error);
      // Fallback to local calculation
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      
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
      // Get all daily cuadres for this week (only from encargada - official data)
      const { data: dailyCuadres, error: cuadresError } = await supabase
        .from('daily_cuadres_summary')
        .select(`
          *,
          agencies(name)
        `)
        .eq('user_id', user?.id)
        .is('session_id', null) // Solo datos de encargada
        .gte('session_date', format(currentWeek.start, 'yyyy-MM-dd'))
        .lte('session_date', format(currentWeek.end, 'yyyy-MM-dd'));

      if (cuadresError) throw cuadresError;

      // Calculate weekly totals and agency breakdown
      let totalSalesBs = 0;
      let totalSalesUsd = 0;
      let totalPrizesBs = 0;
      let totalPrizesUsd = 0;
      let totalExpensesBs = 0;
      let totalExpensesUsd = 0;
      let totalDebtBs = 0;
      let totalDebtUsd = 0;
      let totalBankBs = 0;
      let totalSessions = 0;
      let isWeeklyClosed = false;
      let weeklyClosureNotes = '';

      // Agency data tracking
      const agencyData: { [key: string]: AgencyWeeklyData } = {};

      // Process daily data
      const dailyData: { [key: string]: DailyDetail } = {};
      const weekDays = eachDayOfInterval({ start: currentWeek.start, end: currentWeek.end });

      // Initialize all days of the week
      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        dailyData[dayKey] = {
          day_date: dayKey,
          day_name: format(day, 'EEEE', { locale: es }),
          total_sales_bs: 0,
          total_sales_usd: 0,
          total_prizes_bs: 0,
          total_prizes_usd: 0,
          balance_bs: 0,
          balance_usd: 0,
          sessions_count: 0,
          is_completed: false,
        };
      });

      // Process cuadres data
      dailyCuadres?.forEach(cuadre => {
        const dayKey = cuadre.session_date;
        const agencyId = cuadre.agency_id;
        const agencyName = (cuadre.agencies as any)?.name || 'Agencia desconocida';
        
        // Initialize agency data if not exists
        if (agencyId && !agencyData[agencyId]) {
          agencyData[agencyId] = {
            agency_id: agencyId,
            agency_name: agencyName,
            total_sales_bs: 0,
            total_sales_usd: 0,
            total_prizes_bs: 0,
            total_prizes_usd: 0,
            total_expenses_bs: 0,
            total_expenses_usd: 0,
            total_debt_bs: 0,
            total_debt_usd: 0,
            total_bank_bs: 0,
            total_balance_bs: 0,
            total_balance_usd: 0,
            total_sessions: 0,
            is_weekly_closed: false,
          };
        }

        // Update daily data
        if (dailyData[dayKey]) {
          dailyData[dayKey].total_sales_bs += Number(cuadre.total_sales_bs || 0);
          dailyData[dayKey].total_sales_usd += Number(cuadre.total_sales_usd || 0);
          dailyData[dayKey].total_prizes_bs += Number(cuadre.total_prizes_bs || 0);
          dailyData[dayKey].total_prizes_usd += Number(cuadre.total_prizes_usd || 0);
          dailyData[dayKey].balance_bs += Number(cuadre.balance_bs || 0);
          dailyData[dayKey].sessions_count += 1;
          dailyData[dayKey].is_completed = true;
        }

        // Update agency data
        if (agencyId && agencyData[agencyId]) {
          agencyData[agencyId].total_sales_bs += Number(cuadre.total_sales_bs || 0);
          agencyData[agencyId].total_sales_usd += Number(cuadre.total_sales_usd || 0);
          agencyData[agencyId].total_prizes_bs += Number(cuadre.total_prizes_bs || 0);
          agencyData[agencyId].total_prizes_usd += Number(cuadre.total_prizes_usd || 0);
          agencyData[agencyId].total_expenses_bs += Number(cuadre.total_expenses_bs || 0);
          agencyData[agencyId].total_expenses_usd += Number(cuadre.total_expenses_usd || 0);
          agencyData[agencyId].total_debt_bs += Number(cuadre.total_debt_bs || 0);
          agencyData[agencyId].total_debt_usd += Number(cuadre.total_debt_usd || 0);
          
          agencyData[agencyId].total_balance_bs += Number(cuadre.balance_bs || 0);
          agencyData[agencyId].total_sessions += 1;
          
          if (cuadre.is_weekly_closed) {
            agencyData[agencyId].is_weekly_closed = true;
          }
        }

        // Weekly totals
        totalSalesBs += Number(cuadre.total_sales_bs || 0);
        totalSalesUsd += Number(cuadre.total_sales_usd || 0);
        totalPrizesBs += Number(cuadre.total_prizes_bs || 0);
        totalPrizesUsd += Number(cuadre.total_prizes_usd || 0);
        totalExpensesBs += Number(cuadre.total_expenses_bs || 0);
        totalExpensesUsd += Number(cuadre.total_expenses_usd || 0);
        totalDebtBs += Number(cuadre.total_debt_bs || 0);
        totalDebtUsd += Number(cuadre.total_debt_usd || 0);
        
        totalSessions += 1;

        // Check weekly closure status
        if (cuadre.is_weekly_closed) {
          isWeeklyClosed = true;
          weeklyClosureNotes = cuadre.weekly_closure_notes || '';
        }
      });

      // Aggregate expenses (taquillera + encargada) from expenses table within week by agency
      const startStr = format(currentWeek.start, 'yyyy-MM-dd');
      const endStr = format(currentWeek.end, 'yyyy-MM-dd');

      // Build a session -> agency mapping to attribute taquillera entries (which only have session_id)
      const { data: weekSessions, error: sesErr } = await supabase
        .from('daily_sessions')
        .select('id, user_id')
        .gte('session_date', startStr)
        .lte('session_date', endStr);
      if (sesErr) throw sesErr;

      const userIds = Array.from(new Set((weekSessions || []).map((s: any) => s.user_id).filter(Boolean)));
      const sessionAgencyMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('user_id, agency_id')
          .in('user_id', userIds);
        if (profErr) throw profErr;
        const userToAgency = new Map<string, string>();
        (profiles || []).forEach((p: any) => {
          if (p.agency_id) userToAgency.set(p.user_id, p.agency_id);
        });
        (weekSessions || []).forEach((s: any) => {
          const ag = userToAgency.get(s.user_id);
          if (ag) sessionAgencyMap.set(s.id, ag);
        });
      }

      // Get all expenses from both taquilleras and encargada within the week range
      const { data: weeklyExpenses, error: expErr } = await supabase
        .from('expenses')
        .select('agency_id, amount_bs, amount_usd, category, transaction_date, session_id')
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr);
      if (expErr) throw expErr;

      console.log('Weekly expenses found:', weeklyExpenses?.length || 0, 'Sessions:', weekSessions?.length || 0, 'Session->Agency mapped:', sessionAgencyMap.size);
      const unmappedExpenses = (weeklyExpenses || []).filter((e: any) => !e.agency_id && e.session_id && !sessionAgencyMap.get(e.session_id)).length;
      console.log('Expenses unmapped to agency:', unmappedExpenses);

      (weeklyExpenses || []).forEach((e: any) => {
        // Prefer explicit agency_id, otherwise derive from session
        const derivedAgId = e.agency_id || (e.session_id ? sessionAgencyMap.get(e.session_id) : undefined);
        const bs = Number(e.amount_bs || 0);
        const usd = Number(e.amount_usd || 0);

        // Sum all expense types (including both taquillera and encargada entries)
        if (e.category === 'gasto_operativo' || e.category === 'operativo' || e.category === 'gasto') {
          if (derivedAgId) {
            if (!agencyData[derivedAgId]) {
              const agencyName = allAgencies.find(a => a.id === derivedAgId)?.name || 'Agencia';
              agencyData[derivedAgId] = {
                agency_id: derivedAgId,
                agency_name: agencyName,
                total_sales_bs: 0,
                total_sales_usd: 0,
                total_prizes_bs: 0,
                total_prizes_usd: 0,
                total_expenses_bs: 0,
                total_expenses_usd: 0,
                total_debt_bs: 0,
                total_debt_usd: 0,
                total_bank_bs: 0,
                total_balance_bs: 0,
                total_balance_usd: 0,
                total_sessions: 0,
                is_weekly_closed: false,
              };
            }
            agencyData[derivedAgId].total_expenses_bs += bs;
            agencyData[derivedAgId].total_expenses_usd += usd;
          }
          totalExpensesBs += bs;
          totalExpensesUsd += usd;
        } else if (e.category === 'deuda' || e.category === 'prestamo') {
          if (derivedAgId) {
            if (!agencyData[derivedAgId]) {
              const agencyName = allAgencies.find(a => a.id === derivedAgId)?.name || 'Agencia';
              agencyData[derivedAgId] = {
                agency_id: derivedAgId,
                agency_name: agencyName,
                total_sales_bs: 0,
                total_sales_usd: 0,
                total_prizes_bs: 0,
                total_prizes_usd: 0,
                total_expenses_bs: 0,
                total_expenses_usd: 0,
                total_debt_bs: 0,
                total_debt_usd: 0,
                total_bank_bs: 0,
                total_balance_bs: 0,
                total_balance_usd: 0,
                total_sessions: 0,
                is_weekly_closed: false,
              };
            }
            agencyData[derivedAgId].total_debt_bs += bs;
            agencyData[derivedAgId].total_debt_usd += usd;
          }
          totalDebtBs += bs;
          totalDebtUsd += usd;
        }
      });

      // Also get inter-agency loans within the week range
      const { data: weeklyLoans, error: loansErr } = await supabase
        .from('inter_agency_loans')
        .select('from_agency_id, to_agency_id, amount_bs, amount_usd, status, loan_date')
        .gte('loan_date', startStr)
        .lte('loan_date', endStr);
      if (loansErr) throw loansErr;

      console.log('Weekly inter-agency loans found:', weeklyLoans?.length || 0);

      (weeklyLoans || []).forEach((loan: any) => {
        // Add debt to the debtor agency (to_agency_id)
        const debtorId = loan.to_agency_id;
        if (debtorId && loan.status === 'pendiente') {
          if (!agencyData[debtorId]) {
            const agencyName = allAgencies.find(a => a.id === debtorId)?.name || 'Agencia';
            agencyData[debtorId] = {
              agency_id: debtorId,
              agency_name: agencyName,
              total_sales_bs: 0,
              total_sales_usd: 0,
              total_prizes_bs: 0,
              total_prizes_usd: 0,
              total_expenses_bs: 0,
              total_expenses_usd: 0,
              total_debt_bs: 0,
              total_debt_usd: 0,
              total_bank_bs: 0,
              total_balance_bs: 0,
              total_balance_usd: 0,
              total_sessions: 0,
              is_weekly_closed: false,
            };
          }
          
          const loanBs = Number(loan.amount_bs || 0);
          const loanUsd = Number(loan.amount_usd || 0);
          agencyData[debtorId].total_debt_bs += loanBs;
          agencyData[debtorId].total_debt_usd += loanUsd;
          totalDebtBs += loanBs;
          totalDebtUsd += loanUsd;
        }
      });

      // Aggregate bank totals from mobile_payments (net) and point_of_sale by agency
      const [{ data: weeklyMobile, error: mobErr }, { data: weeklyPOS, error: posErr }] = await Promise.all([
        supabase
          .from('mobile_payments')
          .select('agency_id, session_id, amount_bs, transaction_date')
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr),
        supabase
          .from('point_of_sale')
          .select('agency_id, session_id, amount_bs, transaction_date')
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr),
      ]);
      if (mobErr) throw mobErr;
      if (posErr) throw posErr;

      const bankByAgency = new Map<string, number>();
      let totalBankBsSum = 0;
      (weeklyMobile || []).forEach((m: any) => {
        const agId = m.agency_id || (m.session_id ? sessionAgencyMap.get(m.session_id) : undefined);
        const amt = Number(m.amount_bs || 0);
        totalBankBsSum += amt; // net: recibidos positivos, pagados negativos
        if (!agId) return;
        bankByAgency.set(agId, (bankByAgency.get(agId) || 0) + amt);
      });
      (weeklyPOS || []).forEach((p: any) => {
        const agId = p.agency_id || (p.session_id ? sessionAgencyMap.get(p.session_id) : undefined);
        const amt = Number(p.amount_bs || 0);
        totalBankBsSum += amt;
        if (!agId) return;
        bankByAgency.set(p.agency_id || agId, (bankByAgency.get(p.agency_id || agId) || 0) + amt);
      });
      bankByAgency.forEach((val, agId) => {
        if (!agencyData[agId]) {
          agencyData[agId] = {
            agency_id: agId,
            agency_name: (allAgencies.find(a => a.id === agId)?.name) || 'Agencia',
            total_sales_bs: 0,
            total_sales_usd: 0,
            total_prizes_bs: 0,
            total_prizes_usd: 0,
            total_expenses_bs: 0,
            total_expenses_usd: 0,
            total_debt_bs: 0,
            total_debt_usd: 0,
            total_bank_bs: 0,
            total_balance_bs: 0,
            total_balance_usd: 0,
            total_sessions: 0,
            is_weekly_closed: false,
          };
        }
        agencyData[agId].total_bank_bs += val;
      });
      totalBankBs = totalBankBsSum;

      // Calculate balance USD for daily data and agency data
      Object.values(dailyData).forEach(day => {
        day.balance_usd = day.total_sales_usd - day.total_prizes_usd;
      });

      Object.values(agencyData).forEach(agency => {
        agency.total_balance_usd = agency.total_sales_usd - agency.total_prizes_usd;
      });

      setWeeklyData({
        total_sales_bs: totalSalesBs,
        total_sales_usd: totalSalesUsd,
        total_prizes_bs: totalPrizesBs,
        total_prizes_usd: totalPrizesUsd,
        total_expenses_bs: totalExpensesBs,
        total_expenses_usd: totalExpensesUsd,
        total_debt_bs: totalDebtBs,
        total_debt_usd: totalDebtUsd,
        total_bank_bs: totalBankBs,
        total_balance_bs: totalSalesBs - totalPrizesBs,
        total_balance_usd: totalSalesUsd - totalPrizesUsd,
        total_sessions: totalSessions,
        is_weekly_closed: isWeeklyClosed,
        weekly_closure_notes: weeklyClosureNotes,
      });

      setAgenciesData(Object.values(agencyData));
      setDailyDetails(Object.values(dailyData));
      setClosureNotes(weeklyClosureNotes);

    } catch (error: any) {
      console.error('Error fetching weekly data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos semanales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const closeWeek = async () => {
    if (!weeklyData || !currentWeek) return;
    
    try {
      // Mark all daily cuadres for this week as weekly closed
      const { error } = await supabase
        .from('daily_cuadres_summary')
        .update({ 
          is_weekly_closed: true,
          weekly_closure_notes: closureNotes,
          week_start_date: format(currentWeek.start, 'yyyy-MM-dd'),
          week_end_date: format(currentWeek.end, 'yyyy-MM-dd')
        })
        .eq('user_id', user?.id)
        .is('session_id', null) // Solo datos de encargada
        .gte('session_date', format(currentWeek.start, 'yyyy-MM-dd'))
        .lte('session_date', format(currentWeek.end, 'yyyy-MM-dd'));

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Semana cerrada correctamente",
      });

      await fetchWeeklyData();
    } catch (error: any) {
      console.error('Error closing week:', error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la semana",
        variant: "destructive",
      });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (!currentWeek) return;
    
    const newStart = direction === 'prev' 
      ? subWeeks(currentWeek.start, 1)
      : addWeeks(currentWeek.start, 1);
    
    const newEnd = endOfWeek(newStart, { weekStartsOn: 1 }); // Sunday
    
    setCurrentWeek({
      start: startOfWeek(newStart, { weekStartsOn: 1 }), // Make sure we get Monday
      end: newEnd,
      number: parseInt(format(newStart, 'w')),
      year: parseInt(format(newStart, 'yyyy')),
    });
  };

  const formatCurrency = (amount: number, currency: 'bs' | 'usd') => {
    if (currency === 'usd') {
      return `$${Number(amount).toLocaleString('es-VE')}`;
    }
    return `${Number(amount).toLocaleString('es-VE')} Bs`;
  };

  const getFilteredSummary = () => {
    if (!weeklyData) return {
      total_sales_bs: 0,
      total_sales_usd: 0,
      total_prizes_bs: 0,
      total_prizes_usd: 0,
      total_expenses_bs: 0,
      total_expenses_usd: 0,
      total_debt_bs: 0,
      total_debt_usd: 0,
      total_bank_bs: 0,
      total_balance_bs: 0,
      total_balance_usd: 0,
    };

    if (selectedAgency === 'all') {
      return weeklyData;
    }

    // Filter data by selected agency
    const agencyData = agenciesData.find(agency => agency.agency_id === selectedAgency);
    if (!agencyData) {
      return {
        total_sales_bs: 0,
        total_sales_usd: 0,
        total_prizes_bs: 0,
        total_prizes_usd: 0,
        total_expenses_bs: 0,
        total_expenses_usd: 0,
        total_debt_bs: 0,
        total_debt_usd: 0,
        total_bank_bs: 0,
        total_balance_bs: 0,
        total_balance_usd: 0,
      };
    }

    return {
      total_sales_bs: agencyData.total_sales_bs,
      total_sales_usd: agencyData.total_sales_usd,
      total_prizes_bs: agencyData.total_prizes_bs,
      total_prizes_usd: agencyData.total_prizes_usd,
      total_expenses_bs: agencyData.total_expenses_bs,
      total_expenses_usd: agencyData.total_expenses_usd,
      total_debt_bs: agencyData.total_debt_bs,
      total_debt_usd: agencyData.total_debt_usd,
      total_bank_bs: agencyData.total_bank_bs,
      total_balance_bs: agencyData.total_balance_bs,
      total_balance_usd: agencyData.total_balance_usd,
    };
  };

  if (loading) {
    return <div className="p-6">Cargando datos semanales...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>Cuadre Semanal</span>
              {weeklyData?.is_weekly_closed && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Cerrada
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentWeek && (
            <div className="text-center">
              <p className="text-xl font-semibold">
                Semana {currentWeek.number} - {currentWeek.year}
              </p>
              <p className="text-muted-foreground">
                {format(currentWeek.start, 'dd MMM', { locale: es })} - {format(currentWeek.end, 'dd MMM yyyy', { locale: es })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      {weeklyData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Resumen Semanal
              </CardTitle>
              
              {/* Agency Filter */}
              <div className="flex items-center gap-2">
                <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                  <SelectTrigger className="w-[200px] bg-background">
                    <SelectValue placeholder="Seleccionar agencia" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="all">Todas las agencias</SelectItem>
                    {allAgencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="bolivares" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bolivares">Bolívares</TabsTrigger>
                <TabsTrigger value="dolares">Dólares</TabsTrigger>
              </TabsList>
              
              <TabsContent value="bolivares" className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-700">Ventas</span>
                    </div>
                    <span className="font-bold text-green-600">
                      {formatCurrency(getFilteredSummary().total_sales_bs, 'bs')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-700">Premios</span>
                    </div>
                    <span className="font-bold text-red-600">
                      {formatCurrency(getFilteredSummary().total_prizes_bs, 'bs')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-700">Gastos</span>
                    </div>
                    <span className="font-bold text-amber-600">
                      {formatCurrency(getFilteredSummary().total_expenses_bs, 'bs')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <HandCoins className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-orange-700">Deudas</span>
                    </div>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(getFilteredSummary().total_debt_bs, 'bs')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-700">Total Banco</span>
                    </div>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(getFilteredSummary().total_bank_bs, 'bs')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg border-2">
                    <div className="flex items-center gap-3">
                      <Banknote className="h-6 w-6 text-muted-foreground" />
                      <span className="text-lg font-semibold">Balance Final</span>
                    </div>
                    <span className={`text-2xl font-bold ${Number(getFilteredSummary().total_balance_bs) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(getFilteredSummary().total_balance_bs, 'bs')}
                    </span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="dolares" className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-700">Ventas</span>
                    </div>
                    <span className="font-bold text-green-600">
                      {formatCurrency(getFilteredSummary().total_sales_usd, 'usd')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-700">Premios</span>
                    </div>
                    <span className="font-bold text-red-600">
                      {formatCurrency(getFilteredSummary().total_prizes_usd, 'usd')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-700">Gastos</span>
                    </div>
                    <span className="font-bold text-amber-600">
                      {formatCurrency(getFilteredSummary().total_expenses_usd, 'usd')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <HandCoins className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-orange-700">Deudas</span>
                    </div>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(getFilteredSummary().total_debt_usd, 'usd')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg border-2">
                    <div className="flex items-center gap-3">
                      <Banknote className="h-6 w-6 text-muted-foreground" />
                      <span className="text-lg font-semibold">Balance Final</span>
                    </div>
                    <span className={`text-2xl font-bold ${Number(getFilteredSummary().total_balance_usd) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(getFilteredSummary().total_balance_usd, 'usd')}
                    </span>
                  </div>
                </div>
              </TabsContent>
              
              <div className="mt-4 text-center p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-center items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total de Registros</span>
                </div>
                <span className="text-xl font-semibold">{selectedAgency === 'all' ? weeklyData.total_sessions : agenciesData.find(a => a.agency_id === selectedAgency)?.total_sessions || 0}</span>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Agency Breakdown */}
      {agenciesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Desglose por Agencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las agencias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las agencias</SelectItem>
                      {allAgencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar agencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Agency Cards */}
              <div className="space-y-4">
                {filteredAgencies.map((agency) => (
                  <div key={agency.agency_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{agency.agency_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {agency.total_sessions} registro(s) • {agency.is_weekly_closed ? 'Cerrada' : 'Activa'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${Number(agency.total_balance_bs) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Balance: {formatCurrency(agency.total_balance_bs, 'bs')}
                        </p>
                        <p className={`text-xs ${Number(agency.total_balance_usd) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(agency.total_balance_usd, 'usd')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-muted-foreground">Ventas Bs</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(agency.total_sales_bs, 'bs')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-muted-foreground">Ventas USD</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(agency.total_sales_usd, 'usd')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-muted-foreground">Premios Bs</p>
                        <p className="font-medium text-red-600">
                          {formatCurrency(agency.total_prizes_bs, 'bs')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-muted-foreground">Premios USD</p>
                        <p className="font-medium text-red-600">
                          {formatCurrency(agency.total_prizes_usd, 'usd')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredAgencies.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No se encontraron agencias</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown */}
      <Card>
        <Collapsible open={isDailyOpen} onOpenChange={setIsDailyOpen}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Desglose Diario
                </CardTitle>
                {isDailyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-3">
                {dailyDetails.map((day) => (
                  <div key={day.day_date} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${day.is_completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="font-medium capitalize">{day.day_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(day.day_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${Number(day.balance_bs) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Balance: {formatCurrency(day.balance_bs, 'bs')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {day.sessions_count} registro(s)
                        </p>
                      </div>
                    </div>
                    
                    {day.is_completed && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Close Week */}
      {weeklyData && !weeklyData.is_weekly_closed && weeklyData.total_sessions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cerrar Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Notas de Cierre (Opcional)
              </label>
              <Textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="Agregar observaciones sobre la semana..."
                rows={3}
              />
            </div>
            <Button onClick={closeWeek} className="w-full">
              Cerrar Semana
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Closed Week Notes */}
      {weeklyData?.is_weekly_closed && weeklyData.weekly_closure_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Notas de Cierre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm bg-muted p-3 rounded-lg">
              {weeklyData.weekly_closure_notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}