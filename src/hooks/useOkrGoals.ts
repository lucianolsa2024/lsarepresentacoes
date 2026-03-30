import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const STRATEGIC_OBJECTIVES = [
  { value: 'share_loja', label: 'Aumentar Share de Loja' },
  { value: 'reativar_clientes', label: 'Reativar Clientes Inativos' },
  { value: 'novos_clientes', label: 'Abrir Novos Clientes' },
] as const;

export type StrategicObjective = typeof STRATEGIC_OBJECTIVES[number]['value'];
export type MetricType = 'absolute' | 'percentage' | 'currency';

export interface OkrGoal {
  id: string;
  strategic_objective: StrategicObjective;
  owner_email: string;
  month_start: string;
  key_result: string;
  metric_type: MetricType;
  monthly_target: number;
  created_at: string;
  updated_at: string;
}

export interface OkrGoalWithProgress extends OkrGoal {
  realized: number;
  pct_achieved: number;
  status: 'on_track' | 'attention' | 'at_risk';
  weekly_target: number;
  daily_target: number;
}

/** Count business days (Mon-Fri) in a month */
export function getBusinessDays(year: number, month: number): { total: number; elapsed: number; weeks: number } {
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let total = 0;
  let elapsed = 0;
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      total++;
      if (d <= today) elapsed++;
    }
  }
  const weeks = Math.max(1, Math.ceil(total / 5));
  return { total, elapsed, weeks };
}

export function useOkrGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<OkrGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('okr_goals' as any)
      .select('*')
      .order('month_start', { ascending: false });
    if (error) { console.error(error); }
    setGoals((data as any[] || []) as OkrGoal[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const addGoal = async (goal: Omit<OkrGoal, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('okr_goals' as any).insert(goal as any);
    if (error) { toast.error('Erro ao salvar meta'); console.error(error); return false; }
    toast.success('Meta criada');
    fetchGoals();
    return true;
  };

  const updateGoal = async (id: string, updates: Partial<OkrGoal>) => {
    const { error } = await supabase.from('okr_goals' as any).update(updates as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); console.error(error); return false; }
    toast.success('Meta atualizada');
    fetchGoals();
    return true;
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from('okr_goals' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); console.error(error); return false; }
    toast.success('Meta excluída');
    fetchGoals();
    return true;
  };

  const duplicateToNextMonth = async (monthStart: string) => {
    const current = new Date(monthStart + '-01');
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    const nextMs = next.toISOString().slice(0, 10);
    const monthGoals = goals.filter(g => g.month_start.startsWith(monthStart));
    if (monthGoals.length === 0) { toast.error('Nenhuma meta neste mês'); return; }
    const inserts = monthGoals.map(g => ({
      strategic_objective: g.strategic_objective,
      owner_email: g.owner_email,
      month_start: nextMs,
      key_result: g.key_result,
      metric_type: g.metric_type,
      monthly_target: g.monthly_target,
    }));
    const { error } = await supabase.from('okr_goals' as any).insert(inserts as any);
    if (error) { toast.error('Erro ao copiar metas'); console.error(error); return; }
    toast.success(`${inserts.length} metas copiadas para ${next.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
    fetchGoals();
  };

  return { goals, loading, addGoal, updateGoal, deleteGoal, duplicateToNextMonth, refetch: fetchGoals };
}

/** Fetch realized values for a set of goals using okr_goal_activity_types */
export async function fetchRealized(
  goals: OkrGoal[],
  month: string // yyyy-MM
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (goals.length === 0) return result;

  const monthStart = `${month}-01`;
  const nextMonth = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 1);
  const monthEnd = nextMonth.toISOString().slice(0, 10);

  // Busca os tipos de atividade vinculados a cada meta
  const goalIds = goals.map(g => g.id);
  const { data: activityTypes } = await supabase
    .from('okr_goal_activity_types' as any)
    .select('goal_id, activity_type')
    .in('goal_id', goalIds);

  if (!activityTypes || activityTypes.length === 0) {
    goals.forEach(g => result.set(g.id, 0));
    return result;
  }

  // Busca todas as atividades do mês para os emails dos responsáveis
  const emails = [...new Set(goals.map(g => g.owner_email))];
  const { data: activities } = await supabase
    .from('activities')
    .select('id, type, assigned_to_email')
    .in('assigned_to_email', emails)
    .eq('status', 'concluida')
    .gte('due_date', monthStart)
    .lt('due_date', monthEnd);

  // Para cada meta, conta as atividades do tipo correto
  for (const goal of goals) {
    const allowedTypes = (activityTypes as any[])
      .filter(at => at.goal_id === goal.id)
      .map(at => at.activity_type as string);

    const count = (activities || []).filter(
      a =>
        a.assigned_to_email === goal.owner_email &&
        allowedTypes.includes(a.type)
    ).length;

    result.set(goal.id, count);
  }

  return result;
}
