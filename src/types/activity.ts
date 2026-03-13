export type ActivityCategory = 'crm' | 'tarefa';
export type CrmActivityType = 'visita' | 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'proposta_enviada' | 'followup' | 'treinamento' | 'checklist_loja' | 'outro_crm';
export type TarefaActivityType = 'tarefa' | 'assistencia' | 'outros';
export type ActivityType = CrmActivityType | TarefaActivityType;
export type ActivityPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type ActivityStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada' | 'realizada' | 'agendada';
export type ActivityResult = 'positivo' | 'neutro' | 'negativo';
export type ReminderType = 'email' | 'push' | 'both';
export type ReminderStatus = 'pending' | 'sent' | 'failed';

export interface Activity {
  id: string;
  activity_category: ActivityCategory;
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
  assigned_to_email?: string;
  watcher_emails?: string[];
  created_at: string;
  updated_at: string;
  // CRM-specific fields
  result?: ActivityResult;
  next_step?: string;
  next_contact_date?: string;
  order_id?: string;
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
  activity_category: ActivityCategory;
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
  assigned_to_email?: string;
  watcher_emails?: string[];
  // CRM-specific
  result?: ActivityResult;
  next_step?: string;
  next_contact_date?: string;
  order_id?: string;
}

export interface UpdateActivityInput {
  activity_category?: ActivityCategory;
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
  assigned_to_email?: string;
  watcher_emails?: string[];
  result?: ActivityResult;
  next_step?: string;
  next_contact_date?: string;
  order_id?: string;
}

export const CRM_TYPE_CONFIG: Record<CrmActivityType, { label: string; icon: string; color: string }> = {
  visita: { label: 'Visita', icon: 'MapPin', color: 'orange' },
  ligacao: { label: 'Ligação', icon: 'Phone', color: 'green' },
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle', color: 'emerald' },
  email: { label: 'Email', icon: 'Mail', color: 'purple' },
  reuniao: { label: 'Reunião', icon: 'Users', color: 'indigo' },
  proposta_enviada: { label: 'Proposta Enviada', icon: 'FileText', color: 'blue' },
  followup: { label: 'Follow-up', icon: 'RefreshCcw', color: 'cyan' },
  outro_crm: { label: 'Outro', icon: 'MoreHorizontal', color: 'slate' },
};

export const TAREFA_TYPE_CONFIG: Record<TarefaActivityType, { label: string; icon: string; color: string }> = {
  tarefa: { label: 'Tarefa', icon: 'ClipboardList', color: 'gray' },
  treinamento: { label: 'Treinamento', icon: 'GraduationCap', color: 'cyan' },
  assistencia: { label: 'Assistência', icon: 'Wrench', color: 'amber' },
  checklist_loja: { label: 'Checklist Loja', icon: 'ClipboardCheck', color: 'teal' },
  outros: { label: 'Outros', icon: 'MoreHorizontal', color: 'slate' },
};

export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; icon: string; color: string }> = {
  ...CRM_TYPE_CONFIG,
  ...TAREFA_TYPE_CONFIG,
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
  realizada: { label: 'Realizada', color: 'green' },
  agendada: { label: 'Agendada', color: 'blue' },
};

export const CRM_STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'agendada', label: 'Agendada' },
  { value: 'realizada', label: 'Realizada' },
  { value: 'cancelada', label: 'Cancelada' },
];

export const TAREFA_STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

export const ACTIVITY_RESULT_CONFIG: Record<ActivityResult, { label: string; color: string }> = {
  positivo: { label: 'Positivo', color: 'green' },
  neutro: { label: 'Neutro', color: 'yellow' },
  negativo: { label: 'Negativo', color: 'red' },
};

export const REMINDER_OPTIONS = [
  { value: 0, label: 'No horário' },
  { value: 15, label: '15 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 dia antes' },
];
