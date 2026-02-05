import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  ActivityType, 
  ActivityPriority, 
  ACTIVITY_TYPE_CONFIG, 
  ACTIVITY_PRIORITY_CONFIG,
  REMINDER_OPTIONS,
  CreateActivityInput,
} from '@/types/activity';
import { useClients, Client } from '@/hooks/useClients';
import { useActivityTemplates } from '@/hooks/useActivityTemplates';
import { Search, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addMinutes, format } from 'date-fns';

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity;
  onSubmit: (data: CreateActivityInput) => Promise<void>;
  defaultClientId?: string;
  defaultQuoteId?: string;
}

export function ActivityForm({
  open,
  onOpenChange,
  activity,
  onSubmit,
  defaultClientId,
  defaultQuoteId,
}: ActivityFormProps) {
  const { clients } = useClients();
  const { templates, applyTemplate } = useActivityTemplates();
  
  const [type, setType] = useState<ActivityType>('tarefa');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<ActivityPriority>('media');
  const [clientId, setClientId] = useState<string>('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (activity) {
        setType(activity.type);
        setTitle(activity.title);
        setDescription(activity.description || '');
        setDueDate(activity.due_date);
        setDueTime(activity.due_time || '');
        setPriority(activity.priority);
        setClientId(activity.client_id || '');
        setReminderMinutes(null);
      } else {
        setType('tarefa');
        setTitle('');
        setDescription('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setDueTime('');
        setPriority('media');
        setClientId(defaultClientId || '');
        setReminderMinutes(null);
      }
      setClientSearch('');
      setShowClientSearch(false);
    }
  }, [open, activity, defaultClientId]);

  const filteredClients = clients.filter(c =>
    c.company.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === clientId);

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
    if (!title.trim() || !dueDate) return;

    setIsSubmitting(true);
    try {
      let reminderAt: string | undefined;
      if (reminderMinutes !== null && dueDate) {
        const dueDateTime = new Date(`${dueDate}T${dueTime || '09:00'}`);
        const reminderDateTime = addMinutes(dueDateTime, -reminderMinutes);
        reminderAt = reminderDateTime.toISOString();
      }

      await onSubmit({
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate,
        due_time: dueTime || undefined,
        priority,
        client_id: clientId || undefined,
        quote_id: defaultQuoteId || undefined,
        reminder_at: reminderAt,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {activity ? 'Editar Atividade' : 'Nova Atividade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template selector */}
          {!activity && templates.length > 0 && (
            <div className="space-y-2">
              <Label>Usar Template</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar template (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} (+{t.days_offset} dias)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type */}
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ligar para cliente sobre orçamento"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes da atividade..."
              rows={2}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ActivityPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTIVITY_PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            {selectedClient ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                <span className="flex-1">{selectedClient.company}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setClientId('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientSearch(true);
                    }}
                    onFocus={() => setShowClientSearch(true)}
                    placeholder="Buscar cliente..."
                    className="pl-9"
                  />
                </div>
                {showClientSearch && clientSearch && (
                  <ScrollArea className="h-32 border rounded-md">
                    {filteredClients.length > 0 ? (
                      filteredClients.slice(0, 10).map(client => (
                        <button
                          key={client.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                          onClick={() => {
                            setClientId(client.id);
                            setClientSearch('');
                            setShowClientSearch(false);
                          }}
                        >
                          <p className="font-medium">{client.company}</p>
                          {client.name && (
                            <p className="text-xs text-muted-foreground">{client.name}</p>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum cliente encontrado
                      </p>
                    )}
                  </ScrollArea>
                )}
              </div>
            )}
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label>Lembrete</Label>
            <Select 
              value={reminderMinutes?.toString() || ''} 
              onValueChange={(v) => setReminderMinutes(v ? parseInt(v) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem lembrete" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem lembrete</SelectItem>
                {REMINDER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Salvando...' : activity ? 'Salvar' : 'Criar Atividade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
