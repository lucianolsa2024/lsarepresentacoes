import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Activity,
  ActivityCategory,
  ActivityStatus,
  ActivityResult,
  CreateActivityInput,
  UpdateActivityInput,
  RecurrenceRule,
} from '@/types/activity';

interface DbActivity {
  id: string;
  activity_category: string;
  type: string;
  title: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  priority: string;
  status: string;
  client_id: string | null;
  quote_id: string | null;
  route_visit_id: string | null;
  template_id: string | null;
  completed_at: string | null;
  completed_notes: string | null;
  reminder_at: string | null;
  reminder_sent: boolean;
  recurrence_rule: unknown;
  parent_activity_id: string | null;
  assigned_to_email: string | null;
  watcher_emails: string[] | null;
  created_at: string;
  updated_at: string;
  result: string | null;
  next_step: string | null;
  next_contact_date: string | null;
  order_id: string | null;
}

interface DbClient {
  id: string;
  company: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

const dbToActivity = (row: DbActivity, client?: DbClient | null): Activity => ({
  id: row.id,
  activity_category: (row.activity_category || 'tarefa') as ActivityCategory,
  type: row.type as Activity['type'],
  title: row.title,
  description: row.description || undefined,
  due_date: row.due_date,
  due_time: row.due_time || undefined,
  priority: row.priority as Activity['priority'],
  status: row.status as Activity['status'],
  client_id: row.client_id || undefined,
  quote_id: row.quote_id || undefined,
  route_visit_id: row.route_visit_id || undefined,
  template_id: row.template_id || undefined,
  completed_at: row.completed_at || undefined,
  completed_notes: row.completed_notes || undefined,
  reminder_at: row.reminder_at || undefined,
  reminder_sent: row.reminder_sent,
  recurrence_rule: row.recurrence_rule as RecurrenceRule | undefined,
  parent_activity_id: row.parent_activity_id || undefined,
  assigned_to_email: row.assigned_to_email || undefined,
  watcher_emails: row.watcher_emails || [],
  created_at: row.created_at,
  updated_at: row.updated_at,
  result: (row.result as ActivityResult) || undefined,
  next_step: row.next_step || undefined,
  next_contact_date: row.next_contact_date || undefined,
  order_id: row.order_id || undefined,
  client: client ? {
    id: client.id,
    company: client.company,
    name: client.name || undefined,
    phone: client.phone || undefined,
    email: client.email || undefined,
  } : undefined,
});

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch active activities (not completed/cancelled) - avoids hitting the 1000 row default limit
      const { data: activeData, error: activeError } = await supabase
        .from('activities')
        .select('*')
        .not('status', 'in', '("concluida","cancelada","realizada")')
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true, nullsFirst: false })
        .limit(5000);

      if (activeError) throw activeError;

      // Fetch recently completed activities (last 30 days) for display when filter is set
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: completedData, error: completedError } = await supabase
        .from('activities')
        .select('*')
        .in('status', ['concluida', 'cancelada', 'realizada'])
        .gte('completed_at', cutoff)
        .order('completed_at', { ascending: false })
        .limit(500);

      if (completedError) throw completedError;

      const activitiesData = [...(activeData || []), ...(completedData || [])];

      // 🔍 DIAGNÓSTICO TEMPORÁRIO — atividades futuras
      const today = new Date().toISOString().split('T')[0];
      const ativasFuturas = (activeData || []).filter(a => a.due_date >= today);
      const kaza = (activeData || []).find(a => a.id === 'feb41595-4f4f-4317-8191-85745c478736');
      console.log('[useActivities] DIAG', {
        totalActive: activeData?.length ?? 0,
        totalCompleted: completedData?.length ?? 0,
        ativasHojeOuFuturo: ativasFuturas.length,
        hojeISO: today,
        kazaPresente: !!kaza,
        kaza,
      });

      // errors already handled above

      const clientIds = [...new Set((activitiesData || []).map(a => a.client_id).filter(Boolean))];
      let clientsMap: Record<string, DbClient> = {};
      
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, company, name, phone, email')
          .in('id', clientIds);

        if (clientsError) throw clientsError;
        
        clientsMap = (clientsData || []).reduce((acc, client) => {
          acc[client.id] = client;
          return acc;
        }, {} as Record<string, DbClient>);
      }

      const mappedActivities = (activitiesData || []).map(row => 
        dbToActivity(row as unknown as DbActivity, row.client_id ? clientsMap[row.client_id] : null)
      );

      setActivities(mappedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Erro ao carregar atividades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const addActivity = async (input: CreateActivityInput): Promise<Activity | null> => {
    try {
      const insertData: Record<string, any> = {
        activity_category: input.activity_category || 'tarefa',
        type: input.type,
        title: input.title,
        description: input.description || null,
        due_date: input.due_date,
        due_time: input.due_time || null,
        priority: input.priority || 'media',
        client_id: input.client_id || null,
        quote_id: input.quote_id || null,
        route_visit_id: input.route_visit_id || null,
        template_id: input.template_id || null,
        reminder_at: input.reminder_at || null,
        recurrence_rule: input.recurrence_rule ? JSON.stringify(input.recurrence_rule) : null,
        assigned_to_email: input.assigned_to_email || null,
        watcher_emails: input.watcher_emails ?? [],
        result: input.result || null,
        next_step: input.next_step || null,
        next_contact_date: input.next_contact_date || null,
        order_id: input.order_id || null,
      };
      if ((input as any).status) insertData.status = (input as any).status;
      
      const { data, error } = await supabase
        .from('activities')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      
      await fetchActivities();
      toast.success('Atividade criada com sucesso!');
      return dbToActivity(data as unknown as DbActivity);
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error('Erro ao criar atividade');
      return null;
    }
  };

  const updateActivity = async (id: string, updates: UpdateActivityInput): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.activity_category !== undefined) updateData.activity_category = updates.activity_category;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
      if (updates.due_time !== undefined) updateData.due_time = updates.due_time || null;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.client_id !== undefined) updateData.client_id = updates.client_id || null;
      if (updates.quote_id !== undefined) updateData.quote_id = updates.quote_id || null;
      if (updates.completed_notes !== undefined) updateData.completed_notes = updates.completed_notes || null;
      if (updates.reminder_at !== undefined) updateData.reminder_at = updates.reminder_at || null;
      if (updates.assigned_to_email !== undefined) updateData.assigned_to_email = updates.assigned_to_email || null;
      if (updates.watcher_emails !== undefined) updateData.watcher_emails = updates.watcher_emails;
      if (updates.result !== undefined) updateData.result = updates.result || null;
      if (updates.next_step !== undefined) updateData.next_step = updates.next_step || null;
      if (updates.next_contact_date !== undefined) updateData.next_contact_date = updates.next_contact_date || null;
      if (updates.order_id !== undefined) updateData.order_id = updates.order_id || null;

      const { error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      await fetchActivities();
      toast.success('Atividade atualizada!');
      return true;
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Erro ao atualizar atividade');
      return false;
    }
  };

  const deleteActivity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      await fetchActivities();
      toast.success('Atividade excluída!');
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Erro ao excluir atividade');
      return false;
    }
  };

  const completeActivity = async (id: string, notes?: string): Promise<boolean> => {
    const activity = activities.find(a => a.id === id);
    const newStatus = activity?.activity_category === 'crm' ? 'realizada' : 'concluida';
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        completed_at: new Date().toISOString(),
      };
      if (notes) updateData.completed_notes = notes;

      const { error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchActivities();
      toast.success('Atividade concluída!');
      return true;
    } catch (error) {
      console.error('Error completing activity:', error);
      toast.error('Erro ao concluir atividade');
      return false;
    }
  };

  const cancelActivity = async (id: string): Promise<boolean> => {
    return updateActivity(id, { status: 'cancelada' });
  };

  const startActivity = async (id: string): Promise<boolean> => {
    return updateActivity(id, { status: 'em_andamento' });
  };

  const getActivitiesByStatus = (status: ActivityStatus): Activity[] => {
    return activities.filter(a => a.status === status);
  };

  const getActivitiesByClient = (clientId: string): Activity[] => {
    return activities.filter(a => a.client_id === clientId);
  };

  const getOverdueActivities = (): Activity[] => {
    const today = new Date().toISOString().split('T')[0];
    return activities.filter(a => 
      (a.status === 'pendente' || a.status === 'agendada') && a.due_date < today
    );
  };

  const getTodayActivities = (): Activity[] => {
    const today = new Date().toISOString().split('T')[0];
    return activities.filter(a => a.due_date === today);
  };

  const getUpcomingActivities = (days: number = 7): Activity[] => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];
    return activities.filter(a => 
      (a.status === 'pendente' || a.status === 'agendada') && 
      a.due_date >= todayStr && 
      a.due_date <= futureStr
    );
  };

  return {
    activities,
    loading,
    refetch: fetchActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    completeActivity,
    cancelActivity,
    startActivity,
    getActivitiesByStatus,
    getActivitiesByClient,
    getOverdueActivities,
    getTodayActivities,
    getUpcomingActivities,
  };
}
