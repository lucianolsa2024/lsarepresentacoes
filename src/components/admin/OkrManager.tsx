import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, Save, Copy, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useOkrGoals, STRATEGIC_OBJECTIVES, OkrGoal, getBusinessDays, fetchRealized, StrategicObjective, MetricType } from '@/hooks/useOkrGoals';
import { useRepresentatives } from '@/hooks/useRepresentatives';

const METRIC_LABELS: Record<MetricType, string> = {
  absolute: 'Número absoluto',
  percentage: 'Percentual (%)',
  currency: 'Valor em R$',
};

const OBJ_LABELS: Record<StrategicObjective, string> = Object.fromEntries(
  STRATEGIC_OBJECTIVES.map(o => [o.value, o.label])
) as any;

function formatMetric(value: number, type: MetricType) {
  if (type === 'currency') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (type === 'percentage') return `${value}%`;
  return String(value);
}

export function OkrManager() {
  const { goals, loading, addGoal, updateGoal, deleteGoal, duplicateToNextMonth } = useOkrGoals();
  const { representatives } = useRepresentatives();

  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterRep, setFilterRep] = useState('all');
  const [filterObj, setFilterObj] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<OkrGoal | null>(null);

  // Form state
  const [formObj, setFormObj] = useState<StrategicObjective>('share_loja');
  const [formEmail, setFormEmail] = useState('');
  const [formMonth, setFormMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [formKR, setFormKR] = useState('');
  const [formMetric, setFormMetric] = useState<MetricType>('absolute');
  const [formTarget, setFormTarget] = useState('');

  // Realized values
  const [realized, setRealized] = useState<Map<string, number>>(new Map());

  const filteredGoals = useMemo(() => {
    return goals.filter(g => {
      if (!g.month_start.startsWith(filterMonth)) return false;
      if (filterRep !== 'all' && g.owner_email !== filterRep) return false;
      if (filterObj !== 'all' && g.strategic_objective !== filterObj) return false;
      return true;
    });
  }, [goals, filterMonth, filterRep, filterObj]);

  // Fetch realized when filtered goals change
  useEffect(() => {
    if (filteredGoals.length === 0) { setRealized(new Map()); return; }
    fetchRealized(filteredGoals, filterMonth).then(setRealized);
  }, [filteredGoals, filterMonth]);

  const isMonthClosed = useMemo(() => {
    const [y, m] = filterMonth.split('-').map(Number);
    const endOfMonth = new Date(y, m, 0);
    return new Date() > endOfMonth;
  }, [filterMonth]);

  const businessDays = useMemo(() => {
    const [y, m] = filterMonth.split('-').map(Number);
    return getBusinessDays(y, m - 1);
  }, [filterMonth]);

  // Computed targets
  const computedWeekly = useMemo(() => {
    const t = parseFloat(formTarget);
    if (isNaN(t) || t <= 0) return 0;
    return Math.round((t / businessDays.weeks) * 100) / 100;
  }, [formTarget, businessDays.weeks]);

  const computedDaily = useMemo(() => {
    const t = parseFloat(formTarget);
    if (isNaN(t) || t <= 0) return 0;
    return Math.round((t / businessDays.total) * 100) / 100;
  }, [formTarget, businessDays.total]);

  const resetForm = () => {
    setFormObj('share_loja');
    setFormEmail('');
    setFormMonth(format(new Date(), 'yyyy-MM'));
    setFormKR('');
    setFormMetric('absolute');
    setFormTarget('');
    setEditingGoal(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (g: OkrGoal) => {
    setFormObj(g.strategic_objective);
    setFormEmail(g.owner_email);
    setFormMonth(g.month_start.slice(0, 7));
    setFormKR(g.key_result);
    setFormMetric(g.metric_type);
    setFormTarget(String(g.monthly_target));
    setEditingGoal(g);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formEmail || !formKR || !formTarget) return;
    const payload = {
      strategic_objective: formObj,
      owner_email: formEmail,
      month_start: `${formMonth}-01`,
      key_result: formKR,
      metric_type: formMetric,
      monthly_target: parseFloat(formTarget),
    };
    let ok: boolean;
    if (editingGoal) {
      ok = await updateGoal(editingGoal.id, payload);
    } else {
      ok = await addGoal(payload);
    }
    if (ok) { setDialogOpen(false); resetForm(); }
  };

  const repName = (email: string) => representatives.find(r => r.email === email)?.name || email;

  const getStatus = (g: OkrGoal): { label: string; color: string; status: string } => {
    const real = realized.get(g.id) || 0;
    const [y, m] = g.month_start.slice(0, 7).split('-').map(Number);
    const bd = getBusinessDays(y, m - 1);
    const expectedProportion = bd.total > 0 ? bd.elapsed / bd.total : 0;
    const expected = g.monthly_target * expectedProportion;
    if (expected <= 0) return { label: 'Não iniciado', color: 'secondary', status: 'on_track' };
    const ratio = real / expected;
    if (ratio >= 0.8) return { label: 'No caminho', color: 'default', status: 'on_track' };
    if (ratio >= 0.5) return { label: 'Em atenção', color: 'secondary', status: 'attention' };
    return { label: 'Em risco', color: 'destructive', status: 'at_risk' };
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Mês</Label>
              <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-44" />
            </div>
            <div className="min-w-[200px]">
              <Label>Representante</Label>
              <Select value={filterRep} onValueChange={setFilterRep}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {representatives.filter(r => r.active).map(r => (
                    <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px]">
              <Label>Objetivo</Label>
              <Select value={filterObj} onValueChange={setFilterObj}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {STRATEGIC_OBJECTIVES.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Meta</Button>
            {!isMonthClosed && (
              <Button variant="outline" onClick={() => duplicateToNextMonth(filterMonth)}>
                <Copy className="h-4 w-4 mr-2" />Copiar para próximo mês
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goals table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Metas & OKRs — {filterMonth}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : filteredGoals.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma meta encontrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Representante</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Key Result</TableHead>
                    <TableHead className="text-right">Meta Mensal</TableHead>
                    <TableHead className="text-right">Semanal</TableHead>
                    <TableHead className="text-right">Diária</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">% Atingido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGoals.map(g => {
                    const [y, m] = g.month_start.slice(0, 7).split('-').map(Number);
                    const bd = getBusinessDays(y, m - 1);
                    const weekly = Math.round((g.monthly_target / bd.weeks) * 100) / 100;
                    const daily = Math.round((g.monthly_target / bd.total) * 100) / 100;
                    const real = realized.get(g.id) || 0;
                    const pct = g.monthly_target > 0 ? Math.round((real / g.monthly_target) * 100) : 0;
                    const st = getStatus(g);
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{repName(g.owner_email)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{OBJ_LABELS[g.strategic_objective]}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{g.key_result}</TableCell>
                        <TableCell className="text-right">{formatMetric(g.monthly_target, g.metric_type)}</TableCell>
                        <TableCell className="text-right">{formatMetric(weekly, g.metric_type)}</TableCell>
                        <TableCell className="text-right">{formatMetric(daily, g.metric_type)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMetric(real, g.metric_type)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={Math.min(pct, 100)} className="w-16 h-2" />
                            <span className="text-xs">{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.color as any}>
                            {st.status === 'at_risk' ? '🔴' : st.status === 'attention' ? '🟡' : '🟢'} {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!isMonthClosed && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(g)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteGoal(g.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Objetivo Estratégico</Label>
              <Select value={formObj} onValueChange={v => setFormObj(v as StrategicObjective)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STRATEGIC_OBJECTIVES.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Representante</Label>
              <Select value={formEmail} onValueChange={setFormEmail}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {representatives.filter(r => r.active).map(r => (
                    <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mês de Referência</Label>
              <Input type="month" value={formMonth} onChange={e => setFormMonth(e.target.value)} />
            </div>
            <div>
              <Label>Key Result</Label>
              <Input value={formKR} onChange={e => setFormKR(e.target.value)} placeholder="Ex: Realizar visitas com checklist de share" />
            </div>
            <div>
              <Label>Tipo de Métrica</Label>
              <Select value={formMetric} onValueChange={v => setFormMetric(v as MetricType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="absolute">Número absoluto</SelectItem>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="currency">Valor em R$</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meta Mensal</Label>
              <Input type="number" value={formTarget} onChange={e => setFormTarget(e.target.value)} placeholder="0" />
            </div>

            {formTarget && parseFloat(formTarget) > 0 && (
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <p><strong>Meta semanal:</strong> {formatMetric(computedWeekly, formMetric)} ({businessDays.weeks} semanas úteis)</p>
                <p><strong>Meta diária:</strong> {formatMetric(computedDaily, formMetric)} ({businessDays.total} dias úteis)</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>
                {editingGoal ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {editingGoal ? 'Salvar' : 'Criar Meta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
