import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  ActivityCategory,
  ActivityType, 
  ActivityPriority,
  ActivityResult,
  CRM_TYPE_CONFIG,
  TAREFA_TYPE_CONFIG,
  ACTIVITY_PRIORITY_CONFIG,
  ACTIVITY_RESULT_CONFIG,
  CRM_STATUS_OPTIONS,
  TAREFA_STATUS_OPTIONS,
  REMINDER_OPTIONS,
  CreateActivityInput,
  ActivityStatus,
} from '@/types/activity';
import { useClients } from '@/hooks/useClients';
import { useActivityTemplates } from '@/hooks/useActivityTemplates';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { Search, X, Briefcase, ListTodo } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addMinutes } from 'date-fns';

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity;
  onSubmit: (data: CreateActivityInput) => Promise<void>;
  defaultClientId?: string;
  defaultQuoteId?: string;
  defaultDate?: string;
  defaultCategory?: ActivityCategory;
}

export function ActivityForm({
  open,
  onOpenChange,
  activity,
  onSubmit,
  defaultClientId,
  defaultQuoteId,
  defaultDate,
  defaultCategory,
}: ActivityFormProps) {
  const { clients } = useClients();
  const { templates, applyTemplate } = useActivityTemplates();
  const { orders } = useOrders();
  
  const [category, setCategory] = useState<ActivityCategory>('tarefa');
  const [type, setType] = useState<ActivityType>('tarefa');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<ActivityPriority>('media');
  const [status, setStatus] = useState<ActivityStatus>('pendente');
  const [clientId, setClientId] = useState<string>('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedToEmail, setAssignedToEmail] = useState('');
  const [watcherEmails, setWatcherEmails] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ email: string; name: string }[]>([]);
  // CRM fields
  const [result, setResult] = useState<ActivityResult | ''>('');
  const [nextStep, setNextStep] = useState('');
  const [nextContactDate, setNextContactDate] = useState('');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const loadTeam = async () => {
      const { data: reps } = await supabase.from('representatives_map' as any).select('email, representative_name');
      const members: { email: string; name: string }[] = [];
      if (reps) {
        (reps as any[]).forEach((r: any) => members.push({ email: r.email, name: r.representative_name }));
      }
      const backoffice = [
        { email: 'joice@lsarepresentacoes.com.br', name: 'Joice' },
        { email: 'posicao@lsarepresentacoes.com.br', name: 'Maíra' },
        { email: 'assistencia@lsarepresentacoes.com.br', name: 'Marcia (Assistência)' },
        { email: 'pedidos2@lsarepresentacoes.com.br', name: 'Isabella' },
        { email: 'pedidos@lsarepresentacoes.com.br', name: 'Nilva' },
      ];
      for (const bo of backoffice) {
        if (!members.find(m => m.email === bo.email)) members.push(bo);
      }
      setTeamMembers(members);
    };
    loadTeam();
  }, []);

  useEffect(() => {
    if (open) {
      if (activity) {
        setCategory(activity.activity_category || 'tarefa');
        setType(activity.type);
        setTitle(activity.title);
        setDescription(activity.description || '');
        setDueDate(activity.due_date);
        setDueTime(activity.due_time || '');
        setPriority(activity.priority);
        setStatus(activity.status);
        setClientId(activity.client_id || '');
        setReminderMinutes(null);
        setAssignedToEmail(activity.assigned_to_email || '');
        setWatcherEmails(activity.watcher_emails || []);
        setResult((activity.result as ActivityResult) || '');
        setNextStep(activity.next_step || '');
        setNextContactDate(activity.next_contact_date || '');
        setOrderId(activity.order_id || '');
      } else {
        const cat = defaultCategory || 'tarefa';
        setCategory(cat);
        setType(cat === 'crm' ? 'visita' : 'tarefa');
        setTitle('');
        setDescription('');
        setDueDate(defaultDate || new Date().toISOString().split('T')[0]);
        setDueTime('');
        setPriority('media');
        setStatus(cat === 'crm' ? 'agendada' : 'pendente');
        setClientId(defaultClientId || '');
        setReminderMinutes(null);
        setAssignedToEmail('');
        setWatcherEmails([]);
        setResult('');
        setNextStep('');
        setNextContactDate('');
        setOrderId('');
      }
      setClientSearch('');
      setShowClientSearch(false);
    }
  }, [open, activity, defaultClientId, defaultDate, defaultCategory]);

  const handleCategoryChange = (cat: ActivityCategory) => {
    setCategory(cat);
    setType(cat === 'crm' ? 'visita' : 'tarefa');
    setStatus(cat === 'crm' ? 'agendada' : 'pendente');
    if (cat === 'tarefa') {
      setResult('');
      setNextStep('');
      setNextContactDate('');
      setOrderId('');
    }
  };

  const filteredClients = clients.filter(c =>
    c.company.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.name || '').toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === clientId);

  const toggleWatcher = (email: string, checked: boolean) => {
    setWatcherEmails((prev) => checked ? (prev.includes(email) ? prev : [...prev, email]) : prev.filter(e => e !== email));
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const clientName = selectedClient?.company || selectedClient?.name;
      const applied = applyTemplate(template, clientName);
      setType(applied.type);
      setTitle(applied.title);
      setDescription(applied.description || '');
      setDueDate(applied.due_date);
      setDueTime(applied.due_time || '');
      setPriority(applied.priority);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (category === 'crm' && !clientId) return;
    if (!title.trim() && category === 'tarefa') return;
    if (category === 'crm' && !dueDate) return;

    setIsSubmitting(true);
    try {
      let reminderAt: string | undefined;
      if (reminderMinutes !== null && dueDate) {
        const dueDateTime = new Date(`${dueDate}T${dueTime || '09:00'}`);
        const reminderDateTime = addMinutes(dueDateTime, -reminderMinutes);
        reminderAt = reminderDateTime.toISOString();
      }

      const autoTitle = category === 'crm' && !title.trim()
        ? `${CRM_TYPE_CONFIG[type as keyof typeof CRM_TYPE_CONFIG]?.label || type} - ${selectedClient?.company || ''}`
        : title.trim();

      const submitData: any = {
        activity_category: category,
        type,
        title: autoTitle,
        description: description.trim() || undefined,
        due_date: dueDate,
        due_time: dueTime || undefined,
        priority,
        client_id: clientId || undefined,
        quote_id: defaultQuoteId || undefined,
        reminder_at: reminderAt,
        assigned_to_email: assignedToEmail || undefined,
        watcher_emails: watcherEmails,
        result: result || undefined,
        next_step: nextStep.trim() || undefined,
        next_contact_date: nextContactDate || undefined,
        order_id: orderId || undefined,
      };
      if (activity) {
        submitData.status = status;
      }
      await onSubmit(submitData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConfig = category === 'crm' ? CRM_TYPE_CONFIG : TAREFA_TYPE_CONFIG;
  const statusOptions = category === 'crm' ? CRM_STATUS_OPTIONS : TAREFA_STATUS_OPTIONS;

  const renderClientSelector = () => (
    <div className="space-y-2">
      <Label>{category === 'crm' ? 'Cliente *' : 'Cliente'}</Label>
      {selectedClient ? (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
          <span className="flex-1">{selectedClient.company}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setClientId('')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setShowClientSearch(true); }}
              onFocus={() => setShowClientSearch(true)}
              placeholder="Buscar cliente..."
              className="pl-9"
            />
          </div>
          {showClientSearch && clientSearch && (
            <ScrollArea className="h-32 border rounded-md">
              {filteredClients.length > 0 ? (
                filteredClients.slice(0, 10).map(client => (
                  <button key={client.id} type="button" className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                    onClick={() => { setClientId(client.id); setClientSearch(''); setShowClientSearch(false); }}>
                    <p className="font-medium">{client.company}</p>
                    {client.name && <p className="text-xs text-muted-foreground">{client.name}</p>}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</p>
              )}
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
        </DialogHeader>

        {/* Category selector (only for new activities) */}
        {!activity && (
          <Tabs value={category} onValueChange={(v) => handleCategoryChange(v as ActivityCategory)} className="mb-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="crm" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                CRM de Vendas
              </TabsTrigger>
              <TabsTrigger value="tarefa" className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Tarefa Interna
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template selector */}
          {!activity && templates.length > 0 && category === 'tarefa' && (
            <div className="space-y-2">
              <Label>Usar Template</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger><SelectValue placeholder="Selecionar template (opcional)" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} (+{t.days_offset} dias)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type */}
          <div className="space-y-2">
            <Label>Tipo de Atividade *</Label>
            <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CRM: Client is required and shown first */}
          {category === 'crm' && renderClientSelector()}

          {/* Title */}
          <div className="space-y-2">
            <Label>{category === 'crm' ? 'Título' : 'Título da Tarefa *'}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={category === 'crm' ? 'Auto-gerado se vazio' : 'Ex: Preparar relatório mensal'}
              required={category === 'tarefa'}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label>{category === 'crm' ? 'Representante Responsável *' : 'Responsável'}</Label>
            <Select value={assignedToEmail || 'none'} onValueChange={(v) => setAssignedToEmail(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {teamMembers.map(m => (
                  <SelectItem key={m.email} value={m.email}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CRM: Order link */}
          {category === 'crm' && (
            <div className="space-y-2">
              <Label>Pedido Relacionado</Label>
              <Select value={orderId || 'none'} onValueChange={(v) => setOrderId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum pedido vinculado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {orders.filter(o => !clientId || o.clientId === clientId).slice(0, 50).map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.orderNumber || 'S/N'} - {o.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>{category === 'crm' ? 'Descrição / Resumo da Interação' : 'Descrição'}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={category === 'crm' ? 'Resumo da interação com o cliente...' : 'Detalhes da tarefa...'}
              rows={2}
            />
          </div>

          {/* CRM: Result */}
          {category === 'crm' && (
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select value={result || 'none'} onValueChange={(v) => setResult(v === 'none' ? '' : v as ActivityResult)}>
                <SelectTrigger><SelectValue placeholder="Selecionar resultado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não definido</SelectItem>
                  {Object.entries(ACTIVITY_RESULT_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* CRM: Next step + next contact date */}
          {category === 'crm' && (
            <>
              <div className="space-y-2">
                <Label>Próximo Passo</Label>
                <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="O que fazer a seguir..." />
              </div>
              <div className="space-y-2">
                <Label>Data do Próximo Contato</Label>
                <Input type="date" value={nextContactDate} onChange={(e) => setNextContactDate(e.target.value)} />
              </div>
            </>
          )}

          {/* Priority (more relevant for tarefas but available for both) */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ActivityPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACTIVITY_PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status (for editing) */}
          {activity && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ActivityStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client (for tarefa - optional) */}
          {category === 'tarefa' && renderClientSelector()}

          {/* Acompanhamento */}
          <div className="space-y-2">
            <Label>Acompanhamento</Label>
            <div className="border rounded-md p-2 max-h-36 overflow-y-auto space-y-2">
              {teamMembers.map((member) => (
                <label key={`watcher-${member.email}`} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={watcherEmails.includes(member.email)} onCheckedChange={(value) => toggleWatcher(member.email, value === true)} />
                  <span>{member.name}</span>
                  <span className="text-xs text-muted-foreground">({member.email})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label>Lembrete</Label>
            <Select value={reminderMinutes?.toString() || 'none'} onValueChange={(v) => setReminderMinutes(v === 'none' ? null : parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Sem lembrete" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem lembrete</SelectItem>
                {REMINDER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observação de conclusão (editing completed) */}
          {activity && (activity.status === 'concluida' || activity.status === 'realizada') && (
            <div className="space-y-2">
              <Label>Observação de Conclusão</Label>
              <Textarea
                value={activity.completed_notes || ''}
                readOnly
                rows={2}
                className="bg-muted"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || (category === 'crm' && !clientId) || (category === 'tarefa' && !title.trim())}>
              {isSubmitting ? 'Salvando...' : activity ? 'Salvar' : 'Criar Atividade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
