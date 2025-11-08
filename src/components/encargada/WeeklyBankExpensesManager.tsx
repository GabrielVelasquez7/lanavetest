import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, Edit2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface WeeklyExpense {
  id: string;
  agency_id: string | null;
  agency_name: string;
  category: string;
  description: string;
  amount_bs: number;
  created_at: string;
}

interface WeeklyBankExpensesManagerProps {
  weekStart: Date;
  weekEnd: Date;
  agencies: Array<{ id: string; name: string }>;
  onExpensesChange: () => void;
}

export function WeeklyBankExpensesManager({ weekStart, weekEnd, agencies, onExpensesChange }: WeeklyBankExpensesManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<WeeklyExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<WeeklyExpense | null>(null);

  const [formData, setFormData] = useState({
    agency_id: '',
    category: 'gasto_operativo' as const,
    description: '',
    amount_bs: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, [weekStart, weekEnd]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekEnd, 'yyyy-MM-dd');

      const { data: expensesData, error } = await supabase
        .from('weekly_bank_expenses')
        .select('*, agencies(name)')
        .eq('week_start_date', startStr)
        .eq('week_end_date', endStr)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (expensesData || []).map(exp => ({
        id: exp.id,
        agency_id: exp.agency_id,
        agency_name: exp.agency_id ? (exp.agencies as any)?.name || 'Agencia desconocida' : 'GLOBAL - Todas las agencias',
        category: exp.category,
        description: exp.description,
        amount_bs: Number(exp.amount_bs),
        created_at: exp.created_at,
      }));

      setExpenses(formatted);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar gastos semanales',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim() || !formData.amount_bs) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos',
        variant: 'destructive',
      });
      return;
    }

    try {
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekEnd, 'yyyy-MM-dd');

      const expenseData = {
        agency_id: formData.agency_id === 'global' || !formData.agency_id ? null : formData.agency_id,
        week_start_date: startStr,
        week_end_date: endStr,
        category: formData.category,
        description: formData.description,
        amount_bs: Number(formData.amount_bs),
        created_by: user?.id,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('weekly_bank_expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Gasto actualizado correctamente',
        });
      } else {
        const { error } = await supabase
          .from('weekly_bank_expenses')
          .insert([expenseData]);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Gasto registrado correctamente',
        });
      }

      setFormData({ agency_id: '', category: 'gasto_operativo', description: '', amount_bs: '' });
      setEditingExpense(null);
      setDialogOpen(false);
      fetchExpenses();
      onExpensesChange();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar el gasto',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

    try {
      const { error } = await supabase
        .from('weekly_bank_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Gasto eliminado correctamente',
      });

      fetchExpenses();
      onExpensesChange();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el gasto',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (expense: WeeklyExpense) => {
    setEditingExpense(expense);
    setFormData({
      agency_id: expense.agency_id || 'global',
      category: expense.category as any,
      description: expense.description,
      amount_bs: expense.amount_bs.toString(),
    });
    setDialogOpen(true);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount_bs, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Gastos Fijos Semanales
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingExpense(null);
              setFormData({ agency_id: '', category: 'gasto_operativo', description: '', amount_bs: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Editar Gasto' : 'Agregar Gasto Semanal'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Agencia</Label>
                  <Select value={formData.agency_id} onValueChange={(val) => setFormData({ ...formData, agency_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar agencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">GLOBAL - Todas las agencias</SelectItem>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Categoría</Label>
                  <Select value={formData.category} onValueChange={(val: any) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasto_operativo">Gastos Operativos</SelectItem>
                      <SelectItem value="deuda">Deudas</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe el gasto..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Monto (Bs)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount_bs}
                    onChange={(e) => setFormData({ ...formData, amount_bs: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingExpense ? 'Actualizar' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Cargando gastos...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay gastos registrados para esta semana
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.agency_name}</TableCell>
                    <TableCell className="text-sm">
                      {expense.category === 'gasto_operativo' ? 'Gastos Operativos' : expense.category === 'deuda' ? 'Deudas' : 'Otros'}
                    </TableCell>
                    <TableCell className="text-sm">{expense.description}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {formatCurrency(expense.amount_bs, 'VES')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(expense)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Total Gastos Semanales</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses, 'VES')}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}