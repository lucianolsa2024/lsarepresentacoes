export type ActivityType = 'followup' | 'ligacao' | 'email' | 'visita' | 'reuniao' | 'tarefa' | 'treinamento' | 'assistencia' | 'relacionamento' | 'outros';
export type ActivityPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type ActivityStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type ReminderType = 'email' | 'push' | 'both';
export type ReminderStatus = 'pending' | 'sent' | 'failed';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  priority: ActivityPriority;
  status: ActivityStatus;
  client_id?: string;
  quote_id?: string;
  route_visit_id?: string;
  template_id?: string;
  completed_at?: string;
  completed_notes?: string;
  reminder_at?: string;
  reminder_sent: boolean;
  recurrence_rule?: RecurrenceRule;
  parent_activity_id?: string;
  created_at: string;
  updated_at: string;
  // Populated data
  client?: {
    id: string;
    company: string;
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface ActivityTemplate {
  id: string;
  name: string;
  type: ActivityType;
  title_template: string;
  description_template?: string;
  default_priority: ActivityPriority;
  default_time?: string;
  days_offset: number;
  is_active: boolean;
  created_at: string;
}

export interface ActivityReminder {
  id: string;
  activity_id: string;
  reminder_type: ReminderType;
  scheduled_at: string;
  sent_at?: string;
  status: ReminderStatus;
  error_message?: string;
  created_at: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: string;
  count?: number;
}

export interface CreateActivityInput {
  type: ActivityType;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  priority?: ActivityPriority;
  client_id?: string;
  quote_id?: string;
  route_visit_id?: string;
  template_id?: string;
  reminder_at?: string;
  recurrence_rule?: RecurrenceRule;
}

export interface UpdateActivityInput {
  type?: ActivityType;
  title?: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority?: ActivityPriority;
  status?: ActivityStatus;
  client_id?: string;
  quote_id?: string;
  completed_notes?: string;
  reminder_at?: string;
}

export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; icon: string; color: string }> = {
  followup: { label: 'Followup', icon: 'RefreshCcw', color: 'blue' },
  ligacao: { label: 'Ligação', icon: 'Phone', color: 'green' },
  email: { label: 'Email', icon: 'Mail', color: 'purple' },
  visita: { label: 'Visita', icon: 'MapPin', color: 'orange' },
  reuniao: { label: 'Reunião', icon: 'Users', color: 'indigo' },
  tarefa: { label: 'Tarefa', icon: 'ClipboardList', color: 'gray' },
  treinamento: { label: 'Treinamento', icon: 'GraduationCap', color: 'cyan' },
  assistencia: { label: 'Assistência', icon: 'Wrench', color: 'amber' },
  relacionamento: { label: 'Relacionamento', icon: 'Heart', color: 'pink' },
  outros: { label: 'Outros', icon: 'MoreHorizontal', color: 'slate' },
};

export const ACTIVITY_PRIORITY_CONFIG: Record<ActivityPriority, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'green' },
  media: { label: 'Média', color: 'yellow' },
  alta: { label: 'Alta', color: 'orange' },
  urgente: { label: 'Urgente', color: 'red' },
};

export const ACTIVITY_STATUS_CONFIG: Record<ActivityStatus, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'gray' },
  em_andamento: { label: 'Em Andamento', color: 'blue' },
  concluida: { label: 'Concluída', color: 'green' },
  cancelada: { label: 'Cancelada', color: 'red' },
};

export const REMINDER_OPTIONS = [
  { value: 0, label: 'No horário' },
  { value: 15, label: '15 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 dia antes' },
];
