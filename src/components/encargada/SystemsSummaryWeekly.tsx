import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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

interface Agency {
  id: string;
  name: string;
}

export const SystemsSummaryWeekly = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [systemsSummary, setSystemsSummary] = useState<SystemSummary[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [weekDates, setWeekDates] = useState<{ start: string; end: string }>({ start: '', end: '' });

  useEffect(() => {
    if (user) {
      fetchAgencies();
      fetchWeekBoundaries();
    }
  }, [user]);

  useEffect(() => {
    if (weekDates.start && weekDates.end) {
      fetchSystemsSummary();
    }
  }, [selectedAgency, weekDates]);

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

  const fetchWeekBoundaries = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_week_boundaries');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setWeekDates({
          start: data[0].week_start,
          end: data[0].week_end,
        });
      }
    } catch (error) {
      console.error('Error fetching week boundaries:', error);
    }
  };

  const fetchSystemsSummary = async () => {
    if (!weekDates.start || !weekDates.end) return;

    try {
      setLoading(true);

      // Get data from daily_cuadres_summary based on selected agency
      let query = supabase
        .from('daily_cuadres_summary')
        .select(`
          lottery_system_id,
          total_sales_bs,
          total_sales_usd,
          total_prizes_bs,
          total_prizes_usd
        `)
        .gte('session_date', weekDates.start)
        .lte('session_date', weekDates.end)
        .is('session_id', null); // Only encargada data

      // Filter by agency if selected
      if (selectedAgency !== 'all') {
        query = query.eq('agency_id', selectedAgency);
      }

      const { data: summaryData, error: summaryError } = await query;

      if (summaryError) throw summaryError;

      // Get all lottery systems info
      const { data: allLotterySystems, error: systemsError } = await supabase
        .from('lottery_systems')
        .select('id, name, code, parent_system_id, has_subcategories')
        .eq('is_active', true);

      if (systemsError) throw systemsError;

      // Process all systems summary
      const allSystemsMap = new Map<string, SystemSummary>();
      
      // Build systems map - group by parent if has sublevel
      allLotterySystems?.forEach(system => {
        const systemKey = system.parent_system_id || system.id;
        
        if (!allSystemsMap.has(systemKey)) {
          // Find parent system info
          const parentSystem = system.parent_system_id 
            ? allLotterySystems?.find(s => s.id === system.parent_system_id)
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

      // Aggregate data by system (group sublevels into parent)
      summaryData?.forEach(row => {
        if (!row.lottery_system_id) return;
        
        const system = allLotterySystems?.find(s => s.id === row.lottery_system_id);
        if (system) {
          const systemKey = system.parent_system_id || system.id;
          const summarySystem = allSystemsMap.get(systemKey);
          if (summarySystem) {
            summarySystem.sales_bs += Number(row.total_sales_bs || 0);
            summarySystem.sales_usd += Number(row.total_sales_usd || 0);
            summarySystem.prizes_bs += Number(row.total_prizes_bs || 0);
            summarySystem.prizes_usd += Number(row.total_prizes_usd || 0);
          }
        }
      });

      const summary = Array.from(allSystemsMap.values())
        .filter(s => s.sales_bs > 0 || s.prizes_bs > 0 || s.sales_usd > 0 || s.prizes_usd > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setSystemsSummary(summary);
    } catch (error) {
      console.error('Error fetching systems summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Cargando resumen por sistemas...</p>
        </div>
      </div>
    );
  }

  const totalSalesBs = systemsSummary.reduce((sum, sys) => sum + sys.sales_bs, 0);
  const totalPrizesBs = systemsSummary.reduce((sum, sys) => sum + sys.prizes_bs, 0);
  const totalSalesUsd = systemsSummary.reduce((sum, sys) => sum + sys.sales_usd, 0);
  const totalPrizesUsd = systemsSummary.reduce((sum, sys) => sum + sys.prizes_usd, 0);
  const netBs = totalSalesBs - totalPrizesBs;
  const netUsd = totalSalesUsd - totalPrizesUsd;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resumen por Sistemas</h2>
          <p className="text-muted-foreground">
            Semana del {weekDates.start} al {weekDates.end}
          </p>
        </div>
      </div>

      {/* Agency Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Agencia</Label>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalSalesBs, 'VES')}
            </p>
            <p className="text-sm text-green-600">
              {formatCurrency(totalSalesUsd, 'USD')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Premios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalPrizesBs, 'VES')}
            </p>
            <p className="text-sm text-red-600">
              {formatCurrency(totalPrizesUsd, 'USD')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Neto Total
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className={`text-2xl font-bold ${netBs >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
              {formatCurrency(netBs, 'VES')}
            </p>
            <p className={`text-sm ${netUsd >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
              {formatCurrency(netUsd, 'USD')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Systems Table */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-700">Detalle por Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {systemsSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos para mostrar en esta semana
            </div>
          ) : (
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
                {systemsSummary.map((system, index) => {
                  const netoBs = system.sales_bs - system.prizes_bs;
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-6 gap-2 p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors text-xs"
                    >
                      <div className="font-medium flex items-center gap-2">
                        {system.name}
                        {system.hasSublevels && (
                          <Badge variant="outline" className="text-xs">Sub</Badge>
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
                    {formatCurrency(totalSalesBs, 'VES')}
                  </div>
                  <div className="text-right text-red-700">
                    {formatCurrency(totalPrizesBs, 'VES')}
                  </div>
                  <div className="text-right text-green-700">
                    {formatCurrency(totalSalesUsd, 'USD')}
                  </div>
                  <div className="text-right text-red-700">
                    {formatCurrency(totalPrizesUsd, 'USD')}
                  </div>
                  <div className="text-right text-blue-700">
                    {formatCurrency(netBs, 'VES')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
