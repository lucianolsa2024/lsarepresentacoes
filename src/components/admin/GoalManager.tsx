import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Rep {
  email: string;
  representative_name: string;
}

interface Goal {
  owner_email: string;
  month_start: string;
  goal_value: number;
  supplier: string | null;
}

const FACTORY_OPTIONS = ['SOHOME', 'SOHOME WOOD', 'TAPETE SAO CARLOS'] as const;
const TOTAL_VALUE = '__total__';

export function GoalManager() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEmail, setSelectedEmail] = useState('');
  const [supplier, setSupplier] = useState<string>(TOTAL_VALUE);
  const [monthStart, setMonthStart] = useState(format(new Date(), 'yyyy-MM'));
  const [goalValue, setGoalValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [repsRes, goalsRes] = await Promise.all([
      supabase.from('representatives_map').select('email, representative_name').order('representative_name'),
      supabase.from('rep_goals').select('*').order('month_start', { ascending: false }),
    ]);
    if (repsRes.data) setReps(repsRes.data);
    if (goalsRes.data) setGoals(goalsRes.data as Goal[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!selectedEmail || !monthStart || !goalValue) {
      toast.error('Preencha todos os campos');
      return;
    }
    const ms = `${monthStart}-01`;
    const gv = parseFloat(goalValue);
    if (isNaN(gv) || gv <= 0) { toast.error('Valor inválido'); return; }

    const supplierValue = supplier === TOTAL_VALUE ? null : supplier;

    // Upsert manual: deleta existente + insere
    await supabase
      .from('rep_goals')
      .delete()
      .eq('owner_email', selectedEmail)
      .eq('month_start', ms)
      .is('supplier', supplierValue as any);
    if (supplierValue) {
      await supabase
        .from('rep_goals')
        .delete()
        .eq('owner_email', selectedEmail)
        .eq('month_start', ms)
        .eq('supplier', supplierValue);
    }

    const { error } = await supabase.from('rep_goals').insert({
      owner_email: selectedEmail,
      month_start: ms,
      goal_value: gv,
      supplier: supplierValue,
    });
    if (error) { toast.error('Erro ao salvar meta'); console.error(error); return; }
    toast.success('Meta salva');
    setEditingKey(null);
    setGoalValue('');
    setSupplier(TOTAL_VALUE);
    fetchData();
  };

  const handleDelete = async (g: Goal) => {
    let q = supabase.from('rep_goals').delete().eq('owner_email', g.owner_email).eq('month_start', g.month_start);
    q = g.supplier ? q.eq('supplier', g.supplier) : q.is('supplier', null);
    const { error } = await q;
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Meta excluída');
    fetchData();
  };

  const handleEdit = (g: Goal) => {
    setSelectedEmail(g.owner_email);
    setSupplier(g.supplier ?? TOTAL_VALUE);
    setMonthStart(g.month_start.slice(0, 7));
    setGoalValue(String(g.goal_value));
    setEditingKey(`${g.owner_email}_${g.month_start}_${g.supplier ?? 'total'}`);
  };

  const repName = (email: string) => reps.find((r) => r.email === email)?.representative_name || email;

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{editingKey ? 'Editar Meta' : 'Nova Meta'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[200px]">
              <Label>Representante</Label>
              <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {reps.map((r) => (
                    <SelectItem key={r.email} value={r.email}>{r.representative_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mês</Label>
              <Input type="month" value={monthStart} onChange={(e) => setMonthStart(e.target.value)} className="w-44" />
            </div>
            <div>
              <Label>Valor da Meta (R$)</Label>
              <Input type="number" value={goalValue} onChange={(e) => setGoalValue(e.target.value)} className="w-40" placeholder="0,00" />
            </div>
            <Button onClick={handleSave}>
              {editingKey ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingKey ? 'Salvar' : 'Adicionar'}
            </Button>
            {editingKey && (
              <Button variant="ghost" onClick={() => { setEditingKey(null); setGoalValue(''); }}>Cancelar</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Metas Cadastradas</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : goals.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma meta cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Representante</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((g) => (
                  <TableRow key={`${g.owner_email}_${g.month_start}`}>
                    <TableCell>{repName(g.owner_email)}</TableCell>
                    <TableCell>{g.month_start.slice(0, 7)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(g.goal_value)}</TableCell>
                    <TableCell className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(g)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(g.owner_email, g.month_start)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
