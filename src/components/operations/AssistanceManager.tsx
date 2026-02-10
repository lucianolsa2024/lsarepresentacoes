import { useState } from 'react';
import { useClients, Client } from '@/hooks/useClients';
import { useActivities } from '@/hooks/useActivities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Plus, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AssistanceFormData {
  clientId: string;
  product: string;
  defect: string;
  description: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  dueDate: string;
}

export function AssistanceManager() {
  const { clients } = useClients();
  const { activities, addActivity } = useActivities();
  const [showForm, setShowForm] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [form, setForm] = useState<AssistanceFormData>({
    clientId: '',
    product: '',
    defect: '',
    description: '',
    priority: 'media',
    dueDate: new Date().toISOString().split('T')[0],
  });

  const filteredClients = clients.filter(c =>
    c.company.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === form.clientId);

  const assistanceActivities = activities.filter(a => a.type === 'assistencia')
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  const handleSubmit = async () => {
    if (!form.clientId) {
      toast.error('Selecione um cliente');
      return;
    }
    if (!form.product) {
      toast.error('Informe o produto');
      return;
    }
    if (!form.defect) {
      toast.error('Descreva o defeito');
      return;
    }

    const clientName = selectedClient?.company || '';

    await addActivity({
      type: 'assistencia',
      title: `Assistência - ${clientName} - ${form.product}`,
      description: `Produto: ${form.product}\nDefeito: ${form.defect}\n${form.description ? `Detalhes: ${form.description}` : ''}`,
      due_date: form.dueDate,
      priority: form.priority,
      client_id: form.clientId,
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
    });
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
          {assistanceActivities.map(a => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{a.title}</p>
                    </div>
                    {a.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{a.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.client?.company && `${a.client.company} • `}
                      {new Date(a.due_date).toLocaleDateString('pt-BR')} • {a.status}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma solicitação de assistência</p>
          </CardContent>
        </Card>
      )}

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
                          onClick={() => {
                            setForm({ ...form, clientId: c.id });
                            setClientSearch('');
                            setShowClientSearch(false);
                          }}
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
