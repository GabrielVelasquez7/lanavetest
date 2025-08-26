import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { Calendar, Edit2, Eye } from 'lucide-react';

interface CuadreHistorialData {
  session_date: string;
  session_id: string;
  sales_bs: number;
  sales_usd: number;
  prizes_bs: number;
  prizes_usd: number;
  systems_count: number;
  is_closed: boolean;
}

interface SystemDetail {
  lottery_system_name: string;
  sales_bs: number;
  sales_usd: number;
  prizes_bs: number;
  prizes_usd: number;
}

export const CuadreHistorial = () => {
  const [historialData, setHistorialData] = useState<CuadreHistorialData[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [systemsDetail, setSystemsDetail] = useState<SystemDetail[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchHistorialData();
  }, [user]);

  const fetchHistorialData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Obtener últimos 30 días de sesiones
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_sessions')
        .select('id, session_date, is_closed')
        .eq('user_id', user.id)
        .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        setHistorialData([]);
        return;
      }

      // Para cada sesión, obtener los totales de ventas y premios
      const historialPromises = sessions.map(async (session) => {
        const [salesResult, prizesResult] = await Promise.all([
          supabase
            .from('sales_transactions')
            .select('amount_bs, amount_usd')
            .eq('session_id', session.id),
          supabase
            .from('prize_transactions')
            .select('amount_bs, amount_usd')
            .eq('session_id', session.id)
        ]);

        const sales_bs = salesResult.data?.reduce((sum, s) => sum + Number(s.amount_bs), 0) || 0;
        const sales_usd = salesResult.data?.reduce((sum, s) => sum + Number(s.amount_usd), 0) || 0;
        const prizes_bs = prizesResult.data?.reduce((sum, p) => sum + Number(p.amount_bs), 0) || 0;
        const prizes_usd = prizesResult.data?.reduce((sum, p) => sum + Number(p.amount_usd), 0) || 0;

        const systems_count = new Set([
          ...(salesResult.data?.map(s => s) || []),
          ...(prizesResult.data?.map(p => p) || [])
        ]).size;

        return {
          session_date: session.session_date,
          session_id: session.id,
          sales_bs,
          sales_usd,
          prizes_bs,
          prizes_usd,
          systems_count,
          is_closed: session.is_closed,
        };
      });

      const historialResults = await Promise.all(historialPromises);
      
      // Filtrar solo sesiones con datos
      const filteredResults = historialResults.filter(h => 
        h.sales_bs > 0 || h.sales_usd > 0 || h.prizes_bs > 0 || h.prizes_usd > 0
      );

      setHistorialData(filteredResults);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar el historial',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetail = async (sessionId: string) => {
    try {
      const [salesResult, prizesResult, systemsResult] = await Promise.all([
        supabase
          .from('sales_transactions')
          .select('lottery_system_id, amount_bs, amount_usd')
          .eq('session_id', sessionId),
        supabase
          .from('prize_transactions')
          .select('lottery_system_id, amount_bs, amount_usd')
          .eq('session_id', sessionId),
        supabase
          .from('lottery_systems')
          .select('id, name')
          .eq('is_active', true)
      ]);

      const systemsMap = new Map(systemsResult.data?.map(s => [s.id, s.name]) || []);
      const detailsMap = new Map<string, SystemDetail>();

      // Procesar ventas
      salesResult.data?.forEach(sale => {
        const systemName = systemsMap.get(sale.lottery_system_id) || 'Sistema Desconocido';
        const existing = detailsMap.get(sale.lottery_system_id) || {
          lottery_system_name: systemName,
          sales_bs: 0,
          sales_usd: 0,
          prizes_bs: 0,
          prizes_usd: 0,
        };
        
        existing.sales_bs += Number(sale.amount_bs);
        existing.sales_usd += Number(sale.amount_usd);
        detailsMap.set(sale.lottery_system_id, existing);
      });

      // Procesar premios
      prizesResult.data?.forEach(prize => {
        const systemName = systemsMap.get(prize.lottery_system_id) || 'Sistema Desconocido';
        const existing = detailsMap.get(prize.lottery_system_id) || {
          lottery_system_name: systemName,
          sales_bs: 0,
          sales_usd: 0,
          prizes_bs: 0,
          prizes_usd: 0,
        };
        
        existing.prizes_bs += Number(prize.amount_bs);
        existing.prizes_usd += Number(prize.amount_usd);
        detailsMap.set(prize.lottery_system_id, existing);
      });

      setSystemsDetail(Array.from(detailsMap.values()));
      setSelectedSession(sessionId);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar el detalle',
        variant: 'destructive',
      });
    }
  };

  const filteredHistorial = historialData.filter(h => 
    selectedDate ? h.session_date === selectedDate : true
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial de Cuadres
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="date-filter">Filtrar por fecha</Label>
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={fetchHistorialData} disabled={loading}>
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>

          {filteredHistorial.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cuadres registrados para la fecha seleccionada
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistorial.map((cuadre) => (
                <Card key={cuadre.session_id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {new Date(cuadre.session_date).toLocaleDateString('es-VE', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Ventas Bs:</span>
                            <div className="font-medium text-success">
                              {formatCurrency(cuadre.sales_bs, 'VES')}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ventas USD:</span>
                            <div className="font-medium text-success">
                              {formatCurrency(cuadre.sales_usd, 'USD')}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cuadre Bs:</span>
                            <div className={`font-medium ${(cuadre.sales_bs - cuadre.prizes_bs) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(cuadre.sales_bs - cuadre.prizes_bs, 'VES')}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cuadre USD:</span>
                            <div className={`font-medium ${(cuadre.sales_usd - cuadre.prizes_usd) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(cuadre.sales_usd - cuadre.prizes_usd, 'USD')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadSessionDetail(cuadre.session_id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle de sesión seleccionada */}
      {selectedSession && systemsDetail.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle por Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Sistema</div>
                <div className="text-center">Ventas Bs</div>
                <div className="text-center">Premios Bs</div>
                <div className="text-center">Ventas USD</div>
                <div className="text-center">Premios USD</div>
              </div>
              
              {systemsDetail.map((system, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-center text-sm">
                  <div className="font-medium">{system.lottery_system_name}</div>
                  <div className="text-center text-success">
                    {formatCurrency(system.sales_bs, 'VES')}
                  </div>
                  <div className="text-center text-destructive">
                    {formatCurrency(system.prizes_bs, 'VES')}
                  </div>
                  <div className="text-center text-success">
                    {formatCurrency(system.sales_usd, 'USD')}
                  </div>
                  <div className="text-center text-destructive">
                    {formatCurrency(system.prizes_usd, 'USD')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};