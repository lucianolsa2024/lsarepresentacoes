import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOkrGoals, STRATEGIC_OBJECTIVES, OkrGoal, getBusinessDays, fetchRealized, StrategicObjective, MetricType } from '@/hooks/useOkrGoals';
import { useAuth } from '@/hooks/useAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Target, Users, UserPlus, Store } from 'lucide-react';
import { format } from 'date-fns';

const OBJ_ICONS: Record<StrategicObjective, any> = {
  share_loja: Store,
  reativar_clientes: Users,
  novos_clientes: UserPlus,
};

const OBJ_LABELS: Record<StrategicObjective, string> = Object.fromEntries(
  STRATEGIC_OBJECTIVES.map(o => [o.value, o.label])
) as any;

function formatMetric(value: number, type: MetricType) {
  if (type === 'currency') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (type === 'percentage') return `${value}%`;
  return String(Math.round(value * 100) / 100);
}

export function MyOkrGoals() {
  const { user } = useAuth();
  const { goals, loading } = useOkrGoals();
  const [realized, setRealized] = useState<Map<string, number>>(new Map());
  const [expandedObj, setExpandedObj] = useState<string | null>(null);

  const currentMonth = format(new Date(), 'yyyy-MM');

  const myGoals = useMemo(() => {
    if (!user?.email) return [];
    return goals.filter(g => g.owner_email === user.email && g.month_start.startsWith(currentMonth));
  }, [goals, user?.email, currentMonth]);

  useEffect(() => {
    if (myGoals.length === 0) return;
    fetchRealized(myGoals, currentMonth).then(setRealized);
  }, [myGoals, currentMonth]);

  const groupedByObj = useMemo(() => {
    const groups: Record<StrategicObjective, OkrGoal[]> = {
      share_loja: [],
      reativar_clientes: [],
      novos_clientes: [],
    };
    for (const g of myGoals) {
      groups[g.strategic_objective].push(g);
    }
    return groups;
  }, [myGoals]);

  if (loading) return null;
  if (myGoals.length === 0) return null;

  const [y, m] = currentMonth.split('-').map(Number);
  const bd = getBusinessDays(y, m - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Minhas Metas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {STRATEGIC_OBJECTIVES.map(obj => {
          const objGoals = groupedByObj[obj.value];
          if (objGoals.length === 0) return null;
          const Icon = OBJ_ICONS[obj.value];
          const isOpen = expandedObj === obj.value;

          // Aggregate for this objective
          const totalTarget = objGoals.reduce((s, g) => s + g.monthly_target, 0);
          const totalRealized = objGoals.reduce((s, g) => s + (realized.get(g.id) || 0), 0);
          const pct = totalTarget > 0 ? Math.round((totalRealized / totalTarget) * 100) : 0;

          return (
            <Collapsible key={obj.value} open={isOpen} onOpenChange={() => setExpandedObj(isOpen ? null : obj.value)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{obj.label}</p>
                    <p className="text-xs text-muted-foreground">{objGoals.length} meta(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(pct, 100)} className="w-20 h-2" />
                    <span className="text-sm font-semibold min-w-[40px] text-right">{pct}%</span>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 ml-8 space-y-3">
                  {objGoals.map(g => {
                    const real = realized.get(g.id) || 0;
                    const goalPct = g.monthly_target > 0 ? Math.round((real / g.monthly_target) * 100) : 0;
                    const weekly = Math.round((g.monthly_target / bd.weeks) * 100) / 100;
                    const daily = Math.round((g.monthly_target / bd.total) * 100) / 100;

                    // Status
                    const expectedProportion = bd.total > 0 ? bd.elapsed / bd.total : 0;
                    const expected = g.monthly_target * expectedProportion;
                    const ratio = expected > 0 ? real / expected : 1;
                    const statusEmoji = ratio >= 0.8 ? '🟢' : ratio >= 0.5 ? '🟡' : '🔴';

                    return (
                      <div key={g.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">{g.key_result}</p>
                            <Badge variant="outline" className="text-xs mt-1">{statusEmoji} {formatMetric(real, g.metric_type)} de {formatMetric(g.monthly_target, g.metric_type)}</Badge>
                          </div>
                          <span className="text-lg font-bold">{goalPct}%</span>
                        </div>
                        <Progress value={Math.min(goalPct, 100)} className="h-2" />
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <p className="font-semibold text-foreground">{formatMetric(daily, g.metric_type)}</p>
                            <p>Meta hoje</p>
                          </div>
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <p className="font-semibold text-foreground">{formatMetric(weekly, g.metric_type)}</p>
                            <p>Meta semana</p>
                          </div>
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <p className="font-semibold text-foreground">{formatMetric(g.monthly_target, g.metric_type)}</p>
                            <p>Meta mês</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
