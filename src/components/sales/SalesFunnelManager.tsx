import { useState, useMemo } from 'react';
import { useSalesOpportunities, SalesOpportunity, FUNNEL_STAGES, OpportunityFormData } from '@/hooks/useSalesOpportunities';
import { useClients, Client } from '@/hooks/useClients';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, GripVertical, Trash2, Edit2, DollarSign, User, Calendar, Store, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const ACTIVE_STAGES = FUNNEL_STAGES.filter(s => !['ganho', 'perdido'].includes(s.key));

const STAGE_COLORS: Record<string, string> = {
  prospeccao: 'bg-blue-100 border-blue-300 text-blue-800',
  qualificacao: 'bg-purple-100 border-purple-300 text-purple-800',
  proposta: 'bg-amber-100 border-amber-300 text-amber-800',
  negociacao: 'bg-orange-100 border-orange-300 text-orange-800',
  fechamento: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  ganho: 'bg-green-100 border-green-300 text-green-800',
  perdido: 'bg-red-100 border-red-300 text-red-800',
};

function OpportunityCard({
  opp,
  clients,
  onMove,
  onEdit,
  onDelete,
}: {
  opp: SalesOpportunity;
  clients: Client[];
  onMove: (id: string, stage: string) => void;
  onEdit: (opp: SalesOpportunity) => void;
  onDelete: (id: string) => void;
}) {
  const client = opp.clientId ? clients.find(c => c.id === opp.clientId) : null;
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="bg-card border rounded-lg p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{opp.title}</p>
          {client && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {client.company}
            </p>
          )}
          {opp.contactName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> {opp.contactName}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(opp)}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(opp.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {opp.value > 0 && (
        <p className="text-xs font-semibold text-primary flex items-center gap-1">
          <DollarSign className="h-3 w-3" /> {formatCurrency(opp.value)}
        </p>
      )}
      {opp.expectedCloseDate && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" /> {new Date(opp.expectedCloseDate).toLocaleDateString('pt-BR')}
        </p>
      )}
      {opp.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{opp.description}</p>
      )}
      <div className="flex gap-1 pt-1">
        {opp.stage !== 'ganho' && (
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => onMove(opp.id, 'ganho')}>
            ✅ Ganho
          </Button>
        )}
        {opp.stage !== 'perdido' && (
          <Button variant="outline" size="sm" className="h-6 text-xs text-destructive" onClick={() => onMove(opp.id, 'perdido')}>
            ❌ Perdido
          </Button>
        )}
      </div>
    </div>
  );
}

function OpportunityForm({
  clients,
  funnelType,
  initial,
  onSave,
  onCancel,
}: {
  clients: Client[];
  funnelType: 'lojista' | 'corporativo';
  initial?: SalesOpportunity | null;
  onSave: (data: OpportunityFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<OpportunityFormData>({
    clientId: initial?.clientId || null,
    title: initial?.title || '',
    description: initial?.description || '',
    funnelType: initial?.funnelType || funnelType,
    stage: initial?.stage || 'prospeccao',
    value: initial?.value || 0,
    expectedCloseDate: initial?.expectedCloseDate || '',
    contactName: initial?.contactName || '',
    contactPhone: initial?.contactPhone || '',
    contactEmail: initial?.contactEmail || '',
    notes: initial?.notes || '',
  });

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('Preencha o título');
      return;
    }
    onSave(form);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Título *</Label>
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Projeto loja Centro" />
        </div>
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={form.clientId || 'none'} onValueChange={v => setForm({ ...form, clientId: v === 'none' ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Etapa</Label>
          <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FUNNEL_STAGES.map(s => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Valor estimado (R$)</Label>
          <Input type="number" value={form.value || ''} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label>Previsão de fechamento</Label>
          <Input type="date" value={form.expectedCloseDate || ''} onChange={e => setForm({ ...form, expectedCloseDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Contato</Label>
          <Input value={form.contactName || ''} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Nome do contato" />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={form.contactPhone || ''} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Descrição</Label>
          <Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit}>{initial ? 'Salvar' : 'Criar'}</Button>
      </div>
    </div>
  );
}

export function SalesFunnelManager() {
  const { opportunities, loading, addOpportunity, updateOpportunity, deleteOpportunity, moveStage } = useSalesOpportunities();
  const { clients } = useClients();
  const [funnelType, setFunnelType] = useState<'lojista' | 'corporativo'>('lojista');
  const [showForm, setShowForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState<SalesOpportunity | null>(null);

  const filteredOpps = useMemo(
    () => opportunities.filter(o => o.funnelType === funnelType),
    [opportunities, funnelType]
  );

  const stageGroups = useMemo(() => {
    const groups: Record<string, SalesOpportunity[]> = {};
    ACTIVE_STAGES.forEach(s => { groups[s.key] = []; });
    filteredOpps.forEach(o => {
      if (groups[o.stage]) groups[o.stage].push(o);
    });
    return groups;
  }, [filteredOpps]);

  const wonCount = filteredOpps.filter(o => o.stage === 'ganho').length;
  const lostCount = filteredOpps.filter(o => o.stage === 'perdido').length;
  const totalValue = filteredOpps
    .filter(o => !['ganho', 'perdido'].includes(o.stage))
    .reduce((s, o) => s + o.value, 0);

  const handleSave = async (data: OpportunityFormData) => {
    if (editingOpp) {
      await updateOpportunity(editingOpp.id, data);
    } else {
      await addOpportunity(data);
    }
    setShowForm(false);
    setEditingOpp(null);
  };

  const handleEdit = (opp: SalesOpportunity) => {
    setEditingOpp(opp);
    setShowForm(true);
  };

  const handleMoveNext = (id: string, currentStage: string) => {
    const idx = ACTIVE_STAGES.findIndex(s => s.key === currentStage);
    if (idx >= 0 && idx < ACTIVE_STAGES.length - 1) {
      moveStage(id, ACTIVE_STAGES[idx + 1].key);
    }
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Funis de Venda</h2>
        <Button onClick={() => { setEditingOpp(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Oportunidade
        </Button>
      </div>

      {/* Funnel type selector */}
      <div className="flex items-center gap-4">
        <Tabs value={funnelType} onValueChange={v => setFunnelType(v as 'lojista' | 'corporativo')}>
          <TabsList>
            <TabsTrigger value="lojista">
              <Store className="h-4 w-4 mr-2" /> Lojistas
            </TabsTrigger>
            <TabsTrigger value="corporativo">
              <Building2 className="h-4 w-4 mr-2" /> Corporativos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-4 text-sm text-muted-foreground ml-auto">
          <span>Pipeline: <strong className="text-foreground">{formatCurrency(totalValue)}</strong></span>
          <Badge variant="outline" className="bg-green-50">✅ {wonCount} ganho(s)</Badge>
          <Badge variant="outline" className="bg-red-50">❌ {lostCount} perdido(s)</Badge>
        </div>
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingOpp ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle>
          </DialogHeader>
          <OpportunityForm
            clients={clients}
            funnelType={funnelType}
            initial={editingOpp}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingOpp(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Kanban board */}
      <div className="grid grid-cols-5 gap-3 overflow-x-auto">
        {ACTIVE_STAGES.map(stage => {
          const stageOpps = stageGroups[stage.key] || [];
          const stageValue = stageOpps.reduce((s, o) => s + o.value, 0);
          return (
            <div key={stage.key} className="min-w-[200px]">
              <div className={`rounded-t-lg p-2 border ${STAGE_COLORS[stage.key] || 'bg-muted'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{stage.label}</span>
                  <Badge variant="secondary" className="text-xs h-5">{stageOpps.length}</Badge>
                </div>
                {stageValue > 0 && (
                  <p className="text-xs mt-0.5 opacity-75">{formatCurrency(stageValue)}</p>
                )}
              </div>
              <div className="border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[200px] bg-muted/30">
                {stageOpps.map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    clients={clients}
                    onMove={moveStage}
                    onEdit={handleEdit}
                    onDelete={deleteOpportunity}
                  />
                ))}
                {stageOpps.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma oportunidade</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
