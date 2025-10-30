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

interface CuadreData {
  // Sales & Prizes from encargada_cuadre_details
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
  
  // Pending prizes
  pendingPrizes: number;
  
  // Daily closure data (editable fields)
  cashAvailable: number;
  cashAvailableUsd: number;
  closureConfirmed: boolean;
  closureNotes: string;
  
  // Exchange rate
  exchangeRate: number;
  
  // Additional fields for cuadre
  applyExcessUsd: boolean;
  additionalAmountBs: number;
  additionalAmountUsd: number;
  additionalNotes: string;
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
    pendingPrizes: 0,
    cashAvailable: 0,
    cashAvailableUsd: 0,
    closureConfirmed: false,
    closureNotes: '',
    exchangeRate: 36.00,
    applyExcessUsd: true,
    additionalAmountBs: 0,
    additionalAmountUsd: 0,
    additionalNotes: '',
  });
  
  // Input states for editable fields
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('36.00');
  const [cashAvailableInput, setCashAvailableInput] = useState<string>('0');
  const [cashAvailableUsdInput, setCashAvailableUsdInput] = useState<string>('0');
  const [pendingPrizesInput, setPendingPrizesInput] = useState<string>('0');
  const [closureNotesInput, setClosureNotesInput] = useState<string>('');
  const [additionalAmountBsInput, setAdditionalAmountBsInput] = useState<string>('0');
  const [additionalAmountUsdInput, setAdditionalAmountUsdInput] = useState<string>('0');
  const [additionalNotesInput, setAdditionalNotesInput] = useState<string>('');
  const [applyExcessUsdSwitch, setApplyExcessUsdSwitch] = useState<boolean>(true);
  
  // Track if user has manually edited fields
  const [fieldsEditedByUser, setFieldsEditedByUser] = useState({
    exchangeRate: false,
    cashAvailable: false,
    cashAvailableUsd: false,
  });

  // State for collapsible dropdowns
  const [gastosOpen, setGastosOpen] = useState(false);
  const [deudasOpen, setDeudasOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Reset state when agency/date changes
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
      pendingPrizes: 0,
      cashAvailable: 0,
      cashAvailableUsd: 0,
      closureConfirmed: false,
      closureNotes: '',
      exchangeRate: 36.00,
      applyExcessUsd: true,
      additionalAmountBs: 0,
      additionalAmountUsd: 0,
      additionalNotes: '',
    });
    setExchangeRateInput('36.00');
    setCashAvailableInput('0');
    setCashAvailableUsdInput('0');
    setClosureNotesInput('');
    setAdditionalAmountBsInput('0');
    setAdditionalAmountUsdInput('0');
    setAdditionalNotesInput('');
    setApplyExcessUsdSwitch(true);
    setPendingPrizesInput('0');
    setFieldsEditedByUser({
      exchangeRate: false,
      cashAvailable: false,
      cashAvailableUsd: false,
    });
    
    if (user && selectedAgency && selectedDate) {
      fetchCuadreData();
    }
  }, [user, selectedAgency, selectedDate, refreshKey]);

  const fetchCuadreData = async () => {
    if (!user || !selectedAgency || !selectedDate) return;

    try {
      setLoading(true);
      const dateStr = formatDateForDB(selectedDate);

      console.log('📊 CuadreGeneralEncargada - Consultando datos de encargada para:', {
        agency: selectedAgency,
        date: dateStr
      });

      // 1. FUENTE PRINCIPAL: encargada_cuadre_details (datos de ventas/premios)
      const { data: detailsData, error: detailsError } = await supabase
        .from('encargada_cuadre_details')
        .select('sales_bs, sales_usd, prizes_bs, prizes_usd')
        .eq('agency_id', selectedAgency)
        .eq('session_date', dateStr);

      if (detailsError) throw detailsError;

      console.log('📊 Detalles de encargada encontrados:', detailsData?.length || 0);

      // 2. DATOS COMPLEMENTARIOS (por agencia + fecha)
      const [expensesResult, mobileResult, posResult, summaryResult] = await Promise.all([
        supabase
          .from('expenses')
          .select('amount_bs, amount_usd, category, description, created_at')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        supabase
          .from('mobile_payments')
          .select('amount_bs, reference_number, description')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        supabase
          .from('point_of_sale')
          .select('amount_bs')
          .eq('agency_id', selectedAgency)
          .eq('transaction_date', dateStr),
        supabase
          .from('daily_cuadres_summary')
          .select('cash_available_bs, cash_available_usd, exchange_rate, closure_notes, daily_closure_confirmed, notes, pending_prizes, excess_usd, diferencia_final')
          .eq('agency_id', selectedAgency)
          .eq('session_date', dateStr)
          .is('session_id', null)
          .maybeSingle()
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (mobileResult.error) throw mobileResult.error;
      if (posResult.error) throw posResult.error;

      // 3. CALCULAR TOTALES DE VENTAS Y PREMIOS
      const totalSales = {
        bs: (detailsData || []).reduce((sum, d) => sum + Number(d.sales_bs || 0), 0),
        usd: (detailsData || []).reduce((sum, d) => sum + Number(d.sales_usd || 0), 0)
      };

      const totalPrizes = {
        bs: (detailsData || []).reduce((sum, d) => sum + Number(d.prizes_bs || 0), 0),
        usd: (detailsData || []).reduce((sum, d) => sum + Number(d.prizes_usd || 0), 0)
      };

      // 4. PROCESAR GASTOS Y DEUDAS
      const expensesList = expensesResult.data || [];
      const gastosList = expensesList.filter(e => e.category === 'gasto_operativo');
      const deudasList = expensesList.filter(e => e.category === 'deuda');

      const totalGastos = {
        bs: gastosList.reduce((sum, g) => sum + Number(g.amount_bs || 0), 0),
        usd: gastosList.reduce((sum, g) => sum + Number(g.amount_usd || 0), 0)
      };

      const totalDeudas = {
        bs: deudasList.reduce((sum, d) => sum + Number(d.amount_bs || 0), 0),
        usd: deudasList.reduce((sum, d) => sum + Number(d.amount_usd || 0), 0)
      };

      // 5. PROCESAR PAGOS MÓVILES
      const mobileList = mobileResult.data || [];
      const pagoMovilRecibidos = mobileList
        .filter(m => Number(m.amount_bs || 0) > 0)
        .reduce((sum, m) => sum + Number(m.amount_bs), 0);
      const pagoMovilPagados = Math.abs(
        mobileList
          .filter(m => Number(m.amount_bs || 0) < 0)
          .reduce((sum, m) => sum + Number(m.amount_bs), 0)
      );

      // 6. PROCESAR PUNTO DE VENTA
      const totalPointOfSale = (posResult.data || [])
        .reduce((sum, p) => sum + Number(p.amount_bs || 0), 0);

      // 7. CAMPOS EDITABLES DEL RESUMEN
      const summaryData = summaryResult.data;
      const exchangeRate = summaryData?.exchange_rate || 36.00;
      const cashAvailable = summaryData?.cash_available_bs || 0;
      const cashAvailableUsd = summaryData?.cash_available_usd || 0;
      const closureNotes = summaryData?.closure_notes || '';
      const closureConfirmed = summaryData?.daily_closure_confirmed || false;
      const pendingPrizesFromSummary = Number(summaryData?.pending_prizes || 0);
      setPendingPrizesInput(pendingPrizesFromSummary.toString());
      
      console.log('📖 Leyendo valores guardados de BD:', {
        agency: selectedAgency,
        date: dateStr,
        excess_usd: summaryData?.excess_usd,
        diferencia_final: summaryData?.diferencia_final,
        pending_prizes: summaryData?.pending_prizes,
        cash_bs: summaryData?.cash_available_bs
      });
      
      // Parse notes field for additional data
      let additionalAmountBs = 0;
      let additionalAmountUsd = 0;
      let additionalNotes = '';
      let applyExcessUsd = true;
      
      if (summaryData?.notes) {
        try {
          const notesData = JSON.parse(summaryData.notes);
          additionalAmountBs = Number(notesData.additionalAmountBs || 0);
          additionalAmountUsd = Number(notesData.additionalAmountUsd || 0);
          additionalNotes = notesData.additionalNotes || '';
          applyExcessUsd = notesData.applyExcessUsd !== undefined ? notesData.applyExcessUsd : true;
        } catch {
          // If notes is not JSON, treat as legacy text
          additionalNotes = summaryData.notes;
        }
      }

      console.log('✅ Totales calculados (SOLO datos de encargada):', {
        ventas: totalSales,
        premios: totalPrizes,
        gastos: totalGastos,
        pendingPrizesFromSummary
      });

      // 8. ACTUALIZAR ESTADO
      setCuadre({
        totalSales,
        totalPrizes,
        totalGastos,
        totalDeudas,
        gastosDetails: gastosList as any,
        deudasDetails: deudasList as any,
        pagoMovilRecibidos,
        pagoMovilPagados,
        totalPointOfSale,
        pendingPrizes: pendingPrizesFromSummary,
        cashAvailable,
        cashAvailableUsd,
        exchangeRate,
        closureConfirmed,
        closureNotes,
        applyExcessUsd,
        additionalAmountBs,
        additionalAmountUsd,
        additionalNotes
      });

      // Update input fields only if user hasn't edited them
      if (!fieldsEditedByUser.exchangeRate) {
        setExchangeRateInput(exchangeRate.toString());
      }
      if (!fieldsEditedByUser.cashAvailable) {
        setCashAvailableInput(cashAvailable.toString());
      }
      if (!fieldsEditedByUser.cashAvailableUsd) {
        setCashAvailableUsdInput(cashAvailableUsd.toString());
      }
      setClosureNotesInput(closureNotes);
      setAdditionalAmountBsInput(additionalAmountBs.toString());
      setAdditionalAmountUsdInput(additionalAmountUsd.toString());
      setAdditionalNotesInput(additionalNotes);
      setApplyExcessUsdSwitch(applyExcessUsd);

    } catch (error: any) {
      console.error('❌ Error en CuadreGeneralEncargada:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al cargar el cuadre',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

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
      setSaving(true);
      const dateStr = formatDateForDB(selectedDate);
      
      const inputExchangeRate = parseFloat(exchangeRateInput) || 36.00;
      const inputCashAvailableBs = parseFloat(cashAvailableInput) || 0;
      const inputCashAvailableUsd = parseFloat(cashAvailableUsdInput) || 0;
      const inputAdditionalAmountBs = parseFloat(additionalAmountBsInput) || 0;
      const inputAdditionalAmountUsd = parseFloat(additionalAmountUsdInput) || 0;

      // Calculate balance
      const balance_bs = 
        cuadre.totalSales.bs 
        - cuadre.totalPrizes.bs 
        - cuadre.totalGastos.bs 
        - cuadre.totalDeudas.bs
        + cuadre.pagoMovilRecibidos 
        - cuadre.pagoMovilPagados
        + cuadre.totalPointOfSale;

      // Calculate total en banco
      const totalBancoBs = cuadre.pagoMovilRecibidos + cuadre.totalPointOfSale - cuadre.pagoMovilPagados;

      // Store additional data in notes field as JSON
      const notesData = {
        additionalAmountBs: inputAdditionalAmountBs,
        additionalAmountUsd: inputAdditionalAmountUsd,
        additionalNotes: additionalNotesInput,
        applyExcessUsd: applyExcessUsdSwitch
      };

      // Calculate cierre values similar to UI
      const cuadreVentasPremiosBs = cuadre.totalSales.bs - cuadre.totalPrizes.bs;
      const cuadreVentasPremiosUsd = cuadre.totalSales.usd - cuadre.totalPrizes.usd;
      const inputPendingPrizes = parseFloat(pendingPrizesInput) || 0;
      const excessUsd = Math.abs(cuadreVentasPremiosUsd - inputCashAvailableUsd) - inputAdditionalAmountUsd;
      const sumatoriaBolivares = 
        inputCashAvailableBs + 
        totalBancoBs + 
        cuadre.totalDeudas.bs + 
        cuadre.totalGastos.bs + 
        (applyExcessUsdSwitch ? (excessUsd * inputExchangeRate) : 0) +
        inputAdditionalAmountBs;
      const diferenciaCierre = sumatoriaBolivares - cuadreVentasPremiosBs;
      const diferenciaFinal = diferenciaCierre - inputPendingPrizes;

      const summaryData = {
        user_id: user.id,
        agency_id: selectedAgency,
        session_date: dateStr,
        session_id: null, // Indica que es nivel agencia (encargada)
        total_sales_bs: cuadre.totalSales.bs,
        total_sales_usd: cuadre.totalSales.usd,
        total_prizes_bs: cuadre.totalPrizes.bs,
        total_prizes_usd: cuadre.totalPrizes.usd,
        total_expenses_bs: cuadre.totalGastos.bs + cuadre.totalDeudas.bs,
        total_expenses_usd: cuadre.totalGastos.usd + cuadre.totalDeudas.usd,
        total_debt_bs: cuadre.totalDeudas.bs,
        total_debt_usd: cuadre.totalDeudas.usd,
        total_mobile_payments_bs: cuadre.pagoMovilRecibidos - cuadre.pagoMovilPagados,
        total_pos_bs: cuadre.totalPointOfSale,
        total_banco_bs: totalBancoBs,
        pending_prizes: inputPendingPrizes,
        balance_before_pending_prizes_bs: diferenciaCierre,
        diferencia_final: diferenciaFinal,
        balance_bs: diferenciaFinal, // mantener compatibilidad
        excess_usd: excessUsd, // Guardar excedente USD
        exchange_rate: inputExchangeRate,
        cash_available_bs: inputCashAvailableBs,
        cash_available_usd: inputCashAvailableUsd,
        closure_notes: closureNotesInput,
        notes: JSON.stringify(notesData),
        daily_closure_confirmed: true,
        is_closed: true
      };

      console.log('💾 Guardando cuadre con valores calculados:', {
        agency: selectedAgency,
        date: dateStr,
        diferencia_final: diferenciaFinal,
        excess_usd: excessUsd,
        pending_prizes: inputPendingPrizes,
        sumatoriaBolivares,
        cuadreVentasPremiosBs
      });

      // Deterministic merge to avoid ON CONFLICT affecting row twice
      const { data: existingSummary, error: findSummaryError } = await supabase
        .from('daily_cuadres_summary')
        .select('id')
        .eq('user_id', user.id)
        .eq('agency_id', selectedAgency)
        .eq('session_date', dateStr)
        .is('session_id', null)
        .maybeSingle();

      if (findSummaryError) throw findSummaryError;

      let error = null as any;
      if (existingSummary?.id) {
        const { error: updateErr } = await supabase
          .from('daily_cuadres_summary')
          .update(summaryData)
          .eq('id', existingSummary.id);
        error = updateErr || null;
      } else {
        const { error: insertErr } = await supabase
          .from('daily_cuadres_summary')
          .insert(summaryData);
        error = insertErr || null;
      }

      if (error) throw error;

      console.log('✅ Cuadre guardado exitosamente. Ahora refrescando datos...');

      toast({
        title: 'Éxito',
        description: 'Cierre diario guardado correctamente'
      });

      // Reload data
      await fetchCuadreData();

    } catch (error: any) {
      console.error('Error saving closure:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al guardar el cierre',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
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

  // Check if there's any data
  const hasData = cuadre.totalSales.bs > 0 || cuadre.totalSales.usd > 0 || 
                  cuadre.totalPrizes.bs > 0 || cuadre.totalPrizes.usd > 0 ||
                  cuadre.totalGastos.bs > 0 || cuadre.totalGastos.usd > 0 ||
                  cuadre.pagoMovilRecibidos > 0 || cuadre.pagoMovilPagados > 0 ||
                  cuadre.totalPointOfSale > 0;

  if (!hasData) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="pt-8 pb-8">
          <div className="text-center text-muted-foreground space-y-2">
            <Calculator className="h-12 w-12 mx-auto opacity-50" />
            <p className="text-lg font-medium">No hay datos registrados</p>
            <p className="text-sm">
              No se encontraron ventas, premios ni gastos para esta agencia y fecha.
            </p>
            <p className="text-xs mt-4">
              Los datos deben ser registrados en la pestaña "Ventas/Premios" primero.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate main cuadre (Sales - Prizes)
  const cuadreVentasPremios = {
    bs: cuadre.totalSales.bs - cuadre.totalPrizes.bs,
    usd: cuadre.totalSales.usd - cuadre.totalPrizes.usd,
  };

  // Calculate bank total (Mobile received + POS - Mobile paid)
  const totalBanco = cuadre.pagoMovilRecibidos + cuadre.totalPointOfSale - cuadre.pagoMovilPagados;

  // Additional amounts from notes
  const additionalAmountBs = parseFloat(additionalAmountBsInput) || 0;
  const additionalAmountUsd = parseFloat(additionalAmountUsdInput) || 0;
  
  // Calculate USD sumatoria (without additional amount)
  const sumatoriaUsd = cuadre.cashAvailableUsd + cuadre.totalDeudas.usd + cuadre.totalGastos.usd;
  const diferenciaInicialUsd = sumatoriaUsd - cuadreVentasPremios.usd;
  const diferenciaFinalUsd = diferenciaInicialUsd - additionalAmountUsd;
  
  // USD excess is the final difference in USD
  const excessUsd = diferenciaFinalUsd;
  
  // Bolivares Closure Formula - additional BS sums to BS, additional USD excess converts to BS
  const sumatoriaBolivares = 
    cuadre.cashAvailable + 
    totalBanco + 
    cuadre.totalDeudas.bs + 
    cuadre.totalGastos.bs + 
    (applyExcessUsdSwitch ? (excessUsd * cuadre.exchangeRate) : 0) +
    additionalAmountBs;

  const diferenciaCierre = sumatoriaBolivares - cuadreVentasPremios.bs;
  const diferenciaFinal = diferenciaCierre - cuadre.pendingPrizes; // Subtract pending prizes AFTER closure difference
  const isCuadreBalanced = Math.abs(diferenciaFinal) <= 100; // Allow 100 Bs tolerance

  return (
    <div className="space-y-6">
      {/* Title and Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Resumen General (Encargada)</h2>
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
              Tasa del día: <span className="font-bold">{cuadre.exchangeRate.toFixed(2)} Bs por USD</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Editable Fields */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-primary flex items-center gap-2">
            <Save className="h-5 w-5" />
            Configuración del Cuadre
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exchange-rate" className="font-semibold">Tasa BCV (Bs/$)</Label>
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
                className="text-center font-mono text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cash-bs" className="font-semibold">Efectivo Disponible (Bs)</Label>
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
                className="text-center font-mono text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cash-usd" className="font-semibold">Efectivo Disponible (USD)</Label>
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
                className="text-center font-mono text-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pending-prizes" className="font-semibold">Premios por Pagar (Bs)</Label>
            <Input
              id="pending-prizes"
              type="number"
              step="0.01"
              value={pendingPrizesInput}
              onChange={(e) => {
                setPendingPrizesInput(e.target.value);
                const amount = parseFloat(e.target.value) || 0;
                setCuadre(prev => ({ ...prev, pendingPrizes: amount }));
              }}
              className="text-center font-mono text-lg"
            />
          </div>

          <div className="space-y-2">
            <Textarea
              id="closure-notes"
              value={closureNotesInput}
              onChange={(e) => setClosureNotesInput(e.target.value)}
              placeholder="Observaciones del día..."
              className="min-h-[80px]"
            />
          </div>

          <Separator className="my-4" />

          {/* Additional Adjustments Section */}
          <div className="space-y-4 p-4 rounded-lg bg-card border border-border">
            <h4 className="font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Ajustes Adicionales del Cuadre
            </h4>
            
            {/* Apply Excess USD Switch */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/20 border border-accent/40">
              <div className="space-y-1">
                <Label htmlFor="apply-excess-usd" className="font-medium cursor-pointer">
                  Aplicar excedente USD a bolívares
                </Label>
                <p className="text-xs text-muted-foreground">
                  Incluir la diferencia de USD convertida en el cálculo de Bs
                </p>
              </div>
              <Switch
                id="apply-excess-usd"
                checked={applyExcessUsdSwitch}
                onCheckedChange={(checked) => {
                  setApplyExcessUsdSwitch(checked);
                  setCuadre(prev => ({ ...prev, applyExcessUsd: checked }));
                }}
              />
            </div>

            {/* Additional Amounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="additional-amount-bs" className="font-medium">Monto Adicional (Bs)</Label>
                <Input
                  id="additional-amount-bs"
                  type="number"
                  step="0.01"
                  value={additionalAmountBsInput}
                  onChange={(e) => {
                    setAdditionalAmountBsInput(e.target.value);
                    const amount = parseFloat(e.target.value) || 0;
                    setCuadre(prev => ({ ...prev, additionalAmountBs: amount }));
                  }}
                  placeholder="Ej: dinero que se debía"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-amount-usd" className="font-medium">Monto Adicional (USD)</Label>
                <Input
                  id="additional-amount-usd"
                  type="number"
                  step="0.01"
                  value={additionalAmountUsdInput}
                  onChange={(e) => {
                    setAdditionalAmountUsdInput(e.target.value);
                    const amount = parseFloat(e.target.value) || 0;
                    setCuadre(prev => ({ ...prev, additionalAmountUsd: amount }));
                  }}
                  placeholder="Ej: dinero que se debía"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-notes" className="font-medium">Descripción del Monto Adicional</Label>
              <Textarea
                id="additional-notes"
                value={additionalNotesInput}
                onChange={(e) => {
                  setAdditionalNotesInput(e.target.value);
                  setCuadre(prev => ({ ...prev, additionalNotes: e.target.value }));
                }}
                placeholder="Ej: Dinero que se debía de días anteriores..."
                className="min-h-[60px]"
              />
            </div>
          </div>
          
          <Button onClick={saveDailyClosure} disabled={saving} className="w-full mt-4" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar todo el cuadre'}
          </Button>
        </CardContent>
      </Card>

      {/* Resumen Consolidado */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Resumen General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Bolívares */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Bolívares (Bs)</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <p className="text-xs text-muted-foreground">Ventas</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(cuadre.totalSales.bs, 'VES')}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  <p className="text-xs text-muted-foreground">Premios</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(cuadre.totalPrizes.bs, 'VES')}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                  <p className="text-xs text-muted-foreground">P. Móvil Recibido</p>
                  <p className="text-sm font-semibold">{formatCurrency(cuadre.pagoMovilRecibidos, 'VES')}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                  <p className="text-xs text-muted-foreground">P. Móvil Pagado</p>
                  <p className="text-sm font-semibold text-destructive">{formatCurrency(cuadre.pagoMovilPagados, 'VES')}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <p className="text-xs text-muted-foreground">Punto de Venta</p>
                  <p className="text-sm font-semibold">{formatCurrency(cuadre.totalPointOfSale, 'VES')}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
                  <p className="text-xs text-muted-foreground">Premios por Pagar</p>
                  <p className="text-sm font-semibold text-amber-600">{formatCurrency(cuadre.pendingPrizes, 'VES')}</p>
                </div>
              </div>
            </div>
            
            {/* Dólares */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Dólares (USD)</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <p className="text-xs text-muted-foreground">Ventas</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(cuadre.totalSales.usd, 'USD')}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  <p className="text-xs text-muted-foreground">Premios</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(cuadre.totalPrizes.usd, 'USD')}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded col-span-2">
                  <p className="text-xs text-muted-foreground">Cuadre (V-P)</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(cuadreVentasPremios.usd, 'USD')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closure Formula Card - Bolivares */}
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
                    <span className="font-medium">
                      {applyExcessUsdSwitch 
                        ? formatCurrency(excessUsd * cuadre.exchangeRate, 'VES')
                        : formatCurrency(0, 'VES')
                      }
                    </span>
                  </div>
                  {additionalAmountBs > 0 && (
                    <div className="flex justify-between">
                      <span>Monto adicional (Bs):</span>
                      <span className="font-medium">{formatCurrency(additionalAmountBs, 'VES')}</span>
                    </div>
                  )}
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
                    <span className="font-medium">-{formatCurrency(cuadre.pendingPrizes, 'VES')}</span>
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
      <Card className="border-2 border-purple-200 border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="text-purple-700">Resumen en Dólares (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Sumatoria:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Efectivo disponible:</span>
                    <span className="font-medium">{formatCurrency(cuadre.cashAvailableUsd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deudas:</span>
                    <span className="font-medium">{formatCurrency(cuadre.totalDeudas.usd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos:</span>
                    <span className="font-medium">{formatCurrency(cuadre.totalGastos.usd, 'USD')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total Sumatoria:</span>
                    <span>{formatCurrency(sumatoriaUsd, 'USD')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-sm h-5 flex items-center">Comparación:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sumatoria:</span>
                    <span className="font-medium">{formatCurrency(sumatoriaUsd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cuadre (V-P):</span>
                    <span className="font-medium">{formatCurrency(cuadreVentasPremios.usd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Diferencia inicial:</span>
                    <span className="font-medium">{formatCurrency(diferenciaInicialUsd, 'USD')}</span>
                  </div>
                  {additionalAmountUsd > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Menos: Monto adicional:</span>
                      <span className="font-medium">-{formatCurrency(additionalAmountUsd, 'USD')}</span>
                    </div>
                  )}
                  <Separator className="my-3" />
                  <div className="flex justify-between font-bold text-xl mb-4">
                    <span>Diferencia Final:</span>
                    <span className={`${Math.abs(diferenciaFinalUsd) <= 5 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(diferenciaFinalUsd, 'USD')}
                    </span>
                  </div>
                  {applyExcessUsdSwitch && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        El exceso USD se convierte a Bs y se suma al cuadre de Bolívares
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closure Notes Display */}
      {cuadre.closureNotes && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-sm text-blue-700">Notas del Cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{cuadre.closureNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
