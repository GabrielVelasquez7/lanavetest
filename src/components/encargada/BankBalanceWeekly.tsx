import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCcw, 
  TrendingUp,
  TrendingDown,
  CreditCard,
  Landmark
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { WeeklyBankExpensesManager } from './WeeklyBankExpensesManager';

interface AgencyBankBalance {
  agency_id: string;
  agency_name: string;
  mobile_received: number;
  mobile_paid: number;
  pos_total: number;
  expenses: number;
  bank_balance: number;
}

export function BankBalanceWeekly() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [agencies, setAgencies] = useState<any[]>([]);
  const [balances, setBalances] = useState<AgencyBankBalance[]>([]);

  useEffect(() => {
    if (user) {
      getCurrentWeekBoundaries();
      fetchAgencies();
    }
  }, [user]);

  useEffect(() => {
    if (currentWeek) {
      fetchBankBalances();
    }
  }, [currentWeek, selectedAgency]);

  const getCurrentWeekBoundaries = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_week_boundaries');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const w = data[0];
        setCurrentWeek({
          start: new Date(w.week_start + 'T00:00:00'),
          end: new Date(w.week_end + 'T23:59:59'),
        });
      } else {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        setCurrentWeek({ start: weekStart, end: weekEnd });
      }
    } catch (error) {
      console.error('Error fetching week boundaries:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron obtener las fechas de la semana',
        variant: 'destructive',
      });
    }
  };

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error('Error fetching agencies:', error);
    }
  };

  const fetchBankBalances = async () => {
    if (!currentWeek) return;

    try {
      setLoading(true);

      const startStr = format(currentWeek.start, 'yyyy-MM-dd');
      const endStr = format(currentWeek.end, 'yyyy-MM-dd');

      // Fetch mobile payments
      let mobileQuery = supabase
        .from('mobile_payments')
        .select('agency_id, amount_bs, description')
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr)
        .not('agency_id', 'is', null);

      if (selectedAgency !== 'all') {
        mobileQuery = mobileQuery.eq('agency_id', selectedAgency);
      }

      const { data: mobileData, error: mobileError } = await mobileQuery;

      if (mobileError) throw mobileError;

      // Fetch point of sale
      let posQuery = supabase
        .from('point_of_sale')
        .select('agency_id, amount_bs')
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr)
        .not('agency_id', 'is', null);

      if (selectedAgency !== 'all') {
        posQuery = posQuery.eq('agency_id', selectedAgency);
      }

      const { data: posData, error: posError } = await posQuery;

      if (posError) throw posError;

      // Fetch weekly bank expenses
      let expensesQuery = supabase
        .from('weekly_bank_expenses')
        .select('agency_id, amount_bs')
        .eq('week_start_date', startStr)
        .eq('week_end_date', endStr);

      if (selectedAgency !== 'all') {
        expensesQuery = expensesQuery.or(`agency_id.eq.${selectedAgency},agency_id.is.null`);
      }

      const { data: expensesData, error: expensesError } = await expensesQuery;

      if (expensesError) throw expensesError;

      // Get agency names
      const agencyIds = Array.from(
        new Set([
          ...(mobileData?.map(m => m.agency_id) || []),
          ...(posData?.map(p => p.agency_id) || [])
        ])
      ).filter(Boolean);

      const { data: agencyNames } = await supabase
        .from('agencies')
        .select('id, name')
        .in('id', agencyIds);

      // Calculate balances by agency
      const balanceMap = new Map<string, AgencyBankBalance>();

      agencyIds.forEach(agencyId => {
        const agency = agencyNames?.find(a => a.id === agencyId);
        
        // Calculate mobile payments
        const agencyMobile = mobileData?.filter(m => m.agency_id === agencyId) || [];
        const mobileReceived = agencyMobile
          .filter(m => m.amount_bs > 0 || m.description?.includes('[RECIBIDO]'))
          .reduce((sum, m) => sum + Math.abs(Number(m.amount_bs)), 0);
        
        const mobilePaid = agencyMobile
          .filter(m => m.amount_bs < 0 || m.description?.includes('[PAGADO]'))
          .reduce((sum, m) => sum + Math.abs(Number(m.amount_bs)), 0);

        // Calculate POS
        const posTotal = posData
          ?.filter(p => p.agency_id === agencyId)
          .reduce((sum, p) => sum + Number(p.amount_bs), 0) || 0;

        // Calculate expenses for this agency (specific + proportional global)
        const specificExpenses = expensesData
          ?.filter(e => e.agency_id === agencyId)
          .reduce((sum, e) => sum + Number(e.amount_bs), 0) || 0;

        const globalExpenses = expensesData
          ?.filter(e => e.agency_id === null)
          .reduce((sum, e) => sum + Number(e.amount_bs), 0) || 0;

        // Calculate proportional global expenses
        const agencyBase = mobileReceived + posTotal;
        const totalBase = agencyIds.reduce((sum, id) => {
          const mReceived = (mobileData?.filter(m => m.agency_id === id) || [])
            .filter(m => m.amount_bs > 0 || m.description?.includes('[RECIBIDO]'))
            .reduce((s, m) => s + Math.abs(Number(m.amount_bs)), 0);
          const pTotal = posData?.filter(p => p.agency_id === id).reduce((s, p) => s + Number(p.amount_bs), 0) || 0;
          return sum + mReceived + pTotal;
        }, 0);

        const proportionalGlobal = totalBase > 0 ? (agencyBase / totalBase) * globalExpenses : 0;
        const totalExpenses = specificExpenses + proportionalGlobal;

        const bankBalance = mobileReceived - mobilePaid + posTotal - totalExpenses;

        balanceMap.set(agencyId, {
          agency_id: agencyId,
          agency_name: agency?.name || 'Agencia desconocida',
          mobile_received: mobileReceived,
          mobile_paid: mobilePaid,
          pos_total: posTotal,
          expenses: totalExpenses,
          bank_balance: bankBalance,
        });
      });

      const balancesList = Array.from(balanceMap.values())
        .sort((a, b) => a.agency_name.localeCompare(b.agency_name));

      setBalances(balancesList);
    } catch (error) {
      console.error('Error fetching bank balances:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los saldos bancarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (dir: 'prev' | 'next') => {
    if (!currentWeek) return;
    const newStart = dir === 'prev' ? subWeeks(currentWeek.start, 1) : addWeeks(currentWeek.start, 1);
    const newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
    setCurrentWeek({ start: newStart, end: newEnd });
  };

  if (loading || !currentWeek) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando saldos bancarios...</p>
        </div>
      </div>
    );
  }

  const totalReceived = balances.reduce((sum, b) => sum + b.mobile_received, 0);
  const totalPaid = balances.reduce((sum, b) => sum + b.mobile_paid, 0);
  const totalPos = balances.reduce((sum, b) => sum + b.pos_total, 0);
  const totalExpenses = balances.reduce((sum, b) => sum + b.expenses, 0);
  const totalBank = totalReceived - totalPaid + totalPos - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header with week navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Landmark className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Bolívares en Banco</h2>
            <p className="text-sm text-muted-foreground">
              {format(currentWeek.start, "d 'de' MMMM", { locale: es })} — {format(currentWeek.end, "d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={fetchBankBalances} title="Refrescar datos">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Agency Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Filtrar por Agencia</Label>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Seleccionar agencia" />
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Smaller */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs text-green-700 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              PM Recibido
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(totalReceived, 'VES')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-red-50/50">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs text-red-700 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              PM Pagado
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(totalPaid, 'VES')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs text-blue-700 flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              Punto Venta
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(totalPos, 'VES')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs text-orange-700 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Gastos Fijos
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-lg font-bold text-orange-600">
              {formatCurrency(totalExpenses, 'VES')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs text-primary flex items-center gap-1">
              <Landmark className="h-3 w-3" />
              Total Banco
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className={`text-lg font-bold ${totalBank >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(totalBank, 'VES')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Expenses Manager */}
      <WeeklyBankExpensesManager 
        weekStart={currentWeek.start}
        weekEnd={currentWeek.end}
        agencies={agencies}
        onExpensesChange={fetchBankBalances}
      />

      {/* Agency Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Agencia</CardTitle>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos bancarios para esta semana
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Agencia</TableHead>
                    <TableHead className="text-right font-bold text-green-700">PM Recibido</TableHead>
                    <TableHead className="text-right font-bold text-red-700">PM Pagado</TableHead>
                    <TableHead className="text-right font-bold text-blue-700">Punto Venta</TableHead>
                    <TableHead className="text-right font-bold text-orange-700">Gastos Fijos</TableHead>
                    <TableHead className="text-right font-bold text-primary">Total Banco</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((balance) => (
                    <TableRow key={balance.agency_id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm">{balance.agency_name}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-600">
                        {formatCurrency(balance.mobile_received, 'VES')}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-red-600">
                        -{formatCurrency(balance.mobile_paid, 'VES')}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-blue-600">
                        {formatCurrency(balance.pos_total, 'VES')}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-orange-600">
                        -{formatCurrency(balance.expenses, 'VES')}
                      </TableCell>
                      <TableCell className={`text-right text-sm font-bold ${balance.bank_balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrency(balance.bank_balance, 'VES')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">TOTALES</TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      {formatCurrency(totalReceived, 'VES')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-700">
                      -{formatCurrency(totalPaid, 'VES')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-700">
                      {formatCurrency(totalPos, 'VES')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-700">
                      -{formatCurrency(totalExpenses, 'VES')}
                    </TableCell>
                    <TableCell className={`text-right font-bold text-lg ${totalBank >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(totalBank, 'VES')}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}