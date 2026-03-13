import { useState, useMemo } from 'react';
import { useClients, Client } from '@/hooks/useClients';
import { useActivities } from '@/hooks/useActivities';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Plus, Wrench, Image, Upload, User, Loader2, Trash2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ACTIVITY_STATUS_CONFIG, ACTIVITY_PRIORITY_CONFIG, Activity } from '@/types/activity';
import { toast } from 'sonner';

interface AssistanceFormData {
  clientId: string;
  product: string;
  defect: string;
  description: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  dueDate: string;
  assignedToEmail: string;
  watcherEmails: string[];
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string | null;
  created_at: string;
}

export function AssistanceManager() {
  const { clients } = useClients();
  const { activities, addActivity, updateActivity } = useActivities();
  const { repNames, nameToEmail } = useRepresentatives();
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const teamMembers = useMemo(() => {
    const members: { name: string; email: string }[] = [];
    repNames.forEach((name) => {
      const email = nameToEmail[name.toUpperCase().trim()];
      if (email && !members.some((m) => m.email === email)) {
        members.push({ name, email });
      }
    });

    const backoffice = [
      { email: 'joice@lsarepresentacoes.com.br', name: 'Joice' },
      { email: 'posicao@lsarepresentacoes.com.br', name: 'Maíra' },
      { email: 'assistencia@lsarepresentacoes.com.br', name: 'Marcia (Assistência)' },
      { email: 'pedidos2@lsarepresentacoes.com.br', name: 'Isabella' },
      { email: 'pedidos@lsarepresentacoes.com.br', name: 'Nilva' },
    ];

    backoffice.forEach((item) => {
      if (!members.some((m) => m.email === item.email)) {
        members.push(item);
      }
    });

    return members;
  }, [repNames, nameToEmail]);
  const [form, setForm] = useState<AssistanceFormData>({
    clientId: '',
    product: '',
    defect: '',
    description: '',
    priority: 'media',
    dueDate: new Date().toISOString().split('T')[0],
    assignedToEmail: '',
    watcherEmails: [],
  });


  const filteredClients = clients.filter(c =>
    c.company.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === form.clientId);

  const assistanceActivities = activities.filter(a => a.type === 'assistencia')
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  const loadAttachments = async (activityId: string) => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from('activity_attachments' as any)
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setAttachments(data as any[]);
      }
    } catch (e) {
      console.error('Error loading attachments:', e);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleOpenDetail = async (activity: Activity) => {
    setSelectedActivity(activity);
    setShowDetail(true);
    await loadAttachments(activity.id);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedActivity || !e.target.files?.length) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop();
      const path = `${selectedActivity.id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('assistance-attachments')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('assistance-attachments')
        .getPublicUrl(path);

      await supabase.from('activity_attachments' as any).insert({
        activity_id: selectedActivity.id,
        file_url: urlData.publicUrl,
        file_name: file.name,
      });

      await loadAttachments(selectedActivity.id);
      toast.success('Imagem anexada');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao anexar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (att: Attachment) => {
    try {
      await supabase.from('activity_attachments' as any).delete().eq('id', att.id);
      setAttachments(prev => prev.filter(a => a.id !== att.id));
      toast.success('Anexo removido');
    } catch (e) {
      toast.error('Erro ao remover anexo');
    }
  };

  const handleAssign = async (email: string) => {
    if (!selectedActivity) return;
    await updateActivity(selectedActivity.id, { assigned_to_email: email || undefined });
    setSelectedActivity({ ...selectedActivity, assigned_to_email: email || undefined });
    toast.success('Responsável atualizado');
  };

  const handleToggleWatcher = async (email: string, checked: boolean) => {
    if (!selectedActivity) return;
    const current = selectedActivity.watcher_emails || [];
    const next = checked
      ? (current.includes(email) ? current : [...current, email])
      : current.filter((item) => item !== email);

    await updateActivity(selectedActivity.id, { watcher_emails: next });
    setSelectedActivity({ ...selectedActivity, watcher_emails: next });
  };

  const handleToggleFormWatcher = (email: string, checked: boolean) => {
    setForm((prev) => {
      const next = checked
        ? (prev.watcherEmails.includes(email) ? prev.watcherEmails : [...prev.watcherEmails, email])
        : prev.watcherEmails.filter((item) => item !== email);
      return { ...prev, watcherEmails: next };
    });
  };

  const handleSubmit = async () => {
    if (!form.clientId) { toast.error('Selecione um cliente'); return; }
    if (!form.product) { toast.error('Informe o produto'); return; }
    if (!form.defect) { toast.error('Descreva o defeito'); return; }

    const clientName = selectedClient?.company || '';
    await addActivity({
      activity_category: 'tarefa',
      type: 'assistencia',
      title: `Assistência - ${clientName} - ${form.product}`,
      description: `Produto: ${form.product}\nDefeito: ${form.defect}\n${form.description ? `Detalhes: ${form.description}` : ''}`,
      due_date: form.dueDate,
      priority: form.priority,
      client_id: form.clientId,
      assigned_to_email: form.assignedToEmail || undefined,
      watcher_emails: form.watcherEmails,
    });

    toast.success('Solicitação de assistência criada');
    setShowForm(false);
    setForm({
      clientId: '',
      product: '',
      defect: '',
      description: '',
      priority: 'media',
      dueDate: new Date().toISOString().split('T')[0],
      assignedToEmail: '',
      watcherEmails: [],
    });
  };

  const getStatusColor = (status: string) => {
    const config = ACTIVITY_STATUS_CONFIG[status as keyof typeof ACTIVITY_STATUS_CONFIG];
    if (!config) return '';
    const colors: Record<string, string> = { gray: 'bg-muted text-muted-foreground', blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', red: 'bg-destructive/10 text-destructive' };
    return colors[config.color] || '';
  };

  const getPriorityColor = (priority: string) => {
    const config = ACTIVITY_PRIORITY_CONFIG[priority as keyof typeof ACTIVITY_PRIORITY_CONFIG];
    if (!config) return '';
    const colors: Record<string, string> = { green: 'border-green-500 text-green-700 dark:text-green-400', yellow: 'border-yellow-500 text-yellow-700 dark:text-yellow-400', orange: 'border-orange-500 text-orange-700 dark:text-orange-400', red: 'border-destructive text-destructive' };
    return colors[config.color] || '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Solicitações de Assistência</h3>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Assistência
        </Button>
      </div>

      {/* List */}
      {assistanceActivities.length > 0 ? (
        <div className="space-y-2">
          {assistanceActivities.map(a => {
            const statusConfig = ACTIVITY_STATUS_CONFIG[a.status as keyof typeof ACTIVITY_STATUS_CONFIG];
            const priorityConfig = ACTIVITY_PRIORITY_CONFIG[a.priority as keyof typeof ACTIVITY_PRIORITY_CONFIG];
            return (
              <Card
                key={a.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleOpenDetail(a)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="font-medium truncate">{a.title}</p>
                        {statusConfig && (
                          <Badge variant="secondary" className={`text-[10px] ${getStatusColor(a.status)}`}>
                            {statusConfig.label}
                          </Badge>
                        )}
                        {priorityConfig && (
                          <Badge variant="outline" className={`text-[10px] ${getPriorityColor(a.priority)}`}>
                            {priorityConfig.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.client?.company && `${a.client.company} • `}
                        {new Date(a.due_date).toLocaleDateString('pt-BR')}
                        {a.assigned_to_email && ` • ${a.assigned_to_email}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma solicitação de assistência</p>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={(open) => { if (!open) { setShowDetail(false); setSelectedActivity(null); setAttachments([]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {selectedActivity?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedActivity.client?.company || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="font-medium">{ACTIVITY_STATUS_CONFIG[selectedActivity.status as keyof typeof ACTIVITY_STATUS_CONFIG]?.label || selectedActivity.status}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <p className="font-medium">{ACTIVITY_PRIORITY_CONFIG[selectedActivity.priority as keyof typeof ACTIVITY_PRIORITY_CONFIG]?.label || selectedActivity.priority}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prazo</Label>
                  <p className="font-medium">{new Date(selectedActivity.due_date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {selectedActivity.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <p className="text-sm whitespace-pre-line mt-1">{selectedActivity.description}</p>
                </div>
              )}

              {/* Responsible */}
              <div className="space-y-2 border-t pt-3">
                <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" /> Responsável
                </Label>
                <Select
                  value={selectedActivity.assigned_to_email || ''}
                  onValueChange={handleAssign}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Designar responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(m => (
                      <SelectItem key={m.email} value={m.email}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Acompanhamento */}
              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs text-muted-foreground">Acompanhamento</Label>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-2">
                  {teamMembers.map((member) => {
                    const checked = (selectedActivity.watcher_emails || []).includes(member.email);
                    return (
                      <label key={`detail-watcher-${member.email}`} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => handleToggleWatcher(member.email, value === true)}
                        />
                        <span>{member.name}</span>
                        <span className="text-xs text-muted-foreground">({member.email})</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(selectedActivity.watcher_emails || []).length} usuário(s) acompanhando
                </p>
              </div>

              {/* Attachments */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Image className="h-3 w-3" /> Anexos ({attachments.length})
                  </Label>
                  <label>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} disabled={uploading} />
                    <Button variant="outline" size="sm" asChild disabled={uploading}>
                      <span>
                        {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                        Anexar
                      </span>
                    </Button>
                  </label>
                </div>

                {loadingAttachments ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : attachments.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {attachments.map(att => (
                      <div key={att.id} className="relative group rounded-md border overflow-hidden">
                        <img src={att.file_url} alt={att.file_name || 'Anexo'} className="w-full h-24 object-cover" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att); }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        {att.file_name && (
                          <p className="text-[10px] text-muted-foreground truncate px-1 py-0.5">{att.file_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum anexo</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Assistência</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Client */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              {selectedClient ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                  <span className="flex-1">{selectedClient.company}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, clientId: '' })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setShowClientSearch(true); }}
                      onFocus={() => setShowClientSearch(true)}
                      placeholder="Buscar cliente..."
                      className="pl-9"
                    />
                  </div>
                  {showClientSearch && clientSearch && (
                    <ScrollArea className="h-32 border rounded-md">
                      {filteredClients.slice(0, 10).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                          onClick={() => { setForm({ ...form, clientId: c.id }); setClientSearch(''); setShowClientSearch(false); }}
                        >
                          <p className="font-medium">{c.company}</p>
                          {c.name && <p className="text-xs text-muted-foreground">{c.name}</p>}
                        </button>
                      ))}
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Produto *</Label>
              <Input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="Nome/modelo do produto" />
            </div>

            <div className="space-y-2">
              <Label>Defeito *</Label>
              <Input value={form.defect} onChange={e => setForm({ ...form, defect: e.target.value })} placeholder="Descrição breve do defeito" />
            </div>

            <div className="space-y-2">
              <Label>Detalhes adicionais</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Observações, fotos solicitadas, etc." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as AssistanceFormData['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.assignedToEmail} onValueChange={v => setForm({ ...form, assignedToEmail: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.email} value={m.email}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Acompanhamento</Label>
              <div className="border rounded-md p-2 max-h-36 overflow-y-auto space-y-2">
                {teamMembers.map((member) => {
                  const checked = form.watcherEmails.includes(member.email);
                  return (
                    <label key={`form-watcher-${member.email}`} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => handleToggleFormWatcher(member.email, value === true)}
                      />
                      <span>{member.name}</span>
                      <span className="text-xs text-muted-foreground">({member.email})</span>
                    </label>
                  );
                })}
              </div>
              {form.watcherEmails.length > 0 && (
                <p className="text-xs text-muted-foreground">{form.watcherEmails.length} usuário(s) no acompanhamento</p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>Criar Assistência</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
