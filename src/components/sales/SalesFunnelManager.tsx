import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSalesOpportunities, SalesOpportunity, FUNNEL_STAGES_LOJISTA, FUNNEL_STAGES_CORPORATIVO, LOST_REASONS, OpportunityFormData } from '@/hooks/useSalesOpportunities';
import { useClients, Client } from '@/hooks/useClients';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Edit2, DollarSign, User, Calendar, Store, Building2, Clock, AlertTriangle, ChevronDown, ChevronRight, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { CorporateOpportunityForm } from './CorporateOpportunityForm';
import { LostReasonModal } from './LostReasonModal';

const STAGE_COLORS: Record<string, string> = {
  prospeccao: 'bg-blue-100 border-blue-300 text-blue-800',
  qualificacao: 'bg-purple-100 border-purple-300 text-purple-800',
  elaboracao_proposta: 'bg-cyan-100 border-cyan-300 text-cyan-800',
  proposta: 'bg-amber-100 border-amber-300 text-amber-800',
  proposta_enviada: 'bg-amber-100 border-amber-300 text-amber-800',
  negociacao: 'bg-orange-100 border-orange-300 text-orange-800',
  fechamento: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  ganho: 'bg-green-100 border-green-300 text-green-800',
  perdido: 'bg-red-100 border-red-300 text-red-800',
};

function getDaysInStage(stageChangedAt: string): number {
  const changed = new Date(stageChangedAt);
  const now = new Date();
  return Math.floor((now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24));
}

function CorporateOpportunityCard({
  opp, clients, representatives, onEdit, onDelete,
}: {
  opp: SalesOpportunity; clients: Client[];
  representatives: { email: string; name: string }[];
  onEdit: (opp: SalesOpportunity) => void; onDelete: (id: string) => void;
}) {
  const client = opp.clientId ? clients.find(c => c.id === opp.clientId) : null;
  const rep = opp.ownerEmail ? representatives.find(r => r.email === opp.ownerEmail) : null;
  const daysInStage = getDaysInStage(opp.stageChangedAt);
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="bg-card border rounded-lg p-3 space-y-1.5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {client && (
            <p className="text-xs font-semibold text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 shrink-0" /> {client.company}
            </p>
          )}
          <p className="text-xs text-muted-foreground truncate mt-0.5">{opp.title}</p>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(opp); }}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(opp.id); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {opp.value > 0 && (
        <p className="text-xs font-semibold text-primary flex items-center gap-1">
          <DollarSign className="h-3 w-3" /> {formatCurrency(opp.value)}
        </p>
      )}
      {rep && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3" /> {rep.name}
        </p>
      )}
      {opp.nextFollowupDate && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Follow-up: {new Date(opp.nextFollowupDate + 'T00:00:00').toLocaleDateString('pt-BR')}
        </p>
      )}
      <div className="flex items-center gap-1">
        <Badge variant={daysInStage > 15 ? 'destructive' : 'secondary'} className="text-[10px] h-4 px-1.5">
          {daysInStage > 15 && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
          <Clock className="h-2.5 w-2.5 mr-0.5" />
          {daysInStage}d
        </Badge>
      </div>
    </div>
  );
}

function LojistaOpportunityCard({
  opp, clients, onEdit, onDelete,
}: {
  opp: SalesOpportunity; clients: Client[];
  onEdit: (opp: SalesOpportunity) => void; onDelete: (id: string) => void;
}) {
  const client = opp.clientId ? clients.find(c => c.id === opp.clientId) : null;
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <div className="bg-card border rounded-lg p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{opp.title}</p>
          {client && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> {client.company}</p>}
          {opp.contactName && <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {opp.contactName}</p>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(opp); }}><Edit2 className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(opp.id); }}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
      {opp.value > 0 && <p className="text-xs font-semibold text-primary flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatCurrency(opp.value)}</p>}
      {opp.expectedCloseDate && <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(opp.expectedCloseDate).toLocaleDateString('pt-BR')}</p>}
      {opp.description && <p className="text-xs text-muted-foreground line-clamp-2">{opp.description}</p>}
    </div>
  );
}

function LojistaOpportunityForm({
  clients, initial, onSave, onCancel,
}: {
  clients: Client[]; initial?: SalesOpportunity | null;
  onSave: (data: OpportunityFormData) => void; onCancel: () => void;
}) {
  const stages = FUNNEL_STAGES_LOJISTA;
  const [form, setForm] = useState<OpportunityFormData>({
    clientId: initial?.clientId || null, title: initial?.title || '', description: initial?.description || '',
    funnelType: 'lojista', stage: initial?.stage || 'prospeccao', value: initial?.value || 0,
    expectedCloseDate: initial?.expectedCloseDate || '', contactName: initial?.contactName || '',
    contactPhone: initial?.contactPhone || '', contactEmail: initial?.contactEmail || '', notes: initial?.notes || '',
  });
  const handleSubmit = () => { if (!form.title.trim()) { toast.error('Preencha o título'); return; } onSave(form); };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2"><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Projeto loja Centro" /></div>
        <div className="space-y-2"><Label>Cliente</Label>
          <Select value={form.clientId || 'none'} onValueChange={v => setForm({ ...form, clientId: v === 'none' ? null : v })}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-2"><Label>Etapa</Label>
          <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-2"><Label>Valor estimado (R$)</Label><Input type="number" value={form.value || ''} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} /></div>
        <div className="space-y-2"><Label>Previsão de fechamento</Label><Input type="date" value={form.expectedCloseDate || ''} onChange={e => setForm({ ...form, expectedCloseDate: e.target.value })} /></div>
        <div className="space-y-2"><Label>Contato</Label><Input value={form.contactName || ''} onChange={e => setForm({ ...form, contactName: e.target.value })} /></div>
        <div className="space-y-2"><Label>Telefone</Label><Input value={form.contactPhone || ''} onChange={e => setForm({ ...form, contactPhone: e.target.value })} /></div>
        <div className="space-y-2 col-span-2"><Label>Descrição</Label><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
      </div>
      <div className="flex gap-2 justify-end"><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={handleSubmit}>{initial ? 'Salvar' : 'Criar'}</Button></div>
    </div>
  );
}

export function SalesFunnelManager() {
  const { opportunities, loading, addOpportunity, updateOpportunity, deleteOpportunity, moveStage } = useSalesOpportunities();
  const { clients } = useClients();
  const { user } = useAuth();
  const { representatives } = useRepresentatives();
  const isAdmin = useIsAdmin();
  const [funnelType, setFunnelType] = useState<'lojista' | 'corporativo'>('lojista');
  const [showForm, setShowForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState<SalesOpportunity | null>(null);
  const [repFilter, setRepFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [lostModal, setLostModal] = useState<{ oppId: string } | null>(null);
  const [wonConfirm, setWonConfirm] = useState<{ oppId: string } | null>(null);
  const [showWon, setShowWon] = useState(false);
  const [showLost, setShowLost] = useState(false);

  const isCorporativo = funnelType === 'corporativo';
  const stages = isCorporativo ? FUNNEL_STAGES_CORPORATIVO : FUNNEL_STAGES_LOJISTA;
  const activeStages = stages.filter(s => !['ganho', 'perdido'].includes(s.key));

  const filteredOpps = useMemo(() => {
    let opps = opportunities.filter(o => o.funnelType === funnelType);
    if (repFilter !== 'all') opps = opps.filter(o => o.ownerEmail === repFilter);
    return opps;
  }, [opportunities, funnelType, repFilter]);

  const periodFilteredOpps = useMemo(() => {
    if (periodFilter === 'all') return filteredOpps;
    const now = new Date();
    let start: Date;
    if (periodFilter === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (periodFilter === 'quarter') { const q = Math.floor(now.getMonth() / 3) * 3; start = new Date(now.getFullYear(), q, 1); }
    else { start = new Date(now.getFullYear(), 0, 1); }
    return filteredOpps.filter(o => new Date(o.createdAt) >= start);
  }, [filteredOpps, periodFilter]);

  const stageGroups = useMemo(() => {
    const groups: Record<string, SalesOpportunity[]> = {};
    const firstStageKey = activeStages[0]?.key || 'prospeccao';
    activeStages.forEach(s => { groups[s.key] = []; });
    periodFilteredOpps.forEach(o => {
      if (groups[o.stage]) {
        groups[o.stage].push(o);
      } else if (!['ganho', 'perdido'].includes(o.stage)) {
        // Opportunities with unrecognized stages go to the first column
        groups[firstStageKey].push(o);
      }
    });
    return groups;
  }, [periodFilteredOpps, activeStages]);

  const wonOpps = periodFilteredOpps.filter(o => o.stage === 'ganho');
  const lostOpps = periodFilteredOpps.filter(o => o.stage === 'perdido');
  const totalPipeline = periodFilteredOpps.filter(o => !['ganho', 'perdido'].includes(o.stage)).reduce((s, o) => s + o.value, 0);
  const wonValue = wonOpps.reduce((s, o) => s + o.value, 0);
  const lostValue = lostOpps.reduce((s, o) => s + o.value, 0);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = async (data: OpportunityFormData) => {
    if (editingOpp) {
      await updateOpportunity(editingOpp.id, data);
    } else {
      const linkedClient = data.clientId ? clients.find(c => c.id === data.clientId) : null;
      await addOpportunity({ ...data, ownerEmail: data.ownerEmail || linkedClient?.ownerEmail || user?.email || undefined });
    }
    setShowForm(false);
    setEditingOpp(null);
  };

  const handleEdit = (opp: SalesOpportunity) => { setEditingOpp(opp); setShowForm(true); };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const oppId = result.draggableId;
    const newStage = result.destination.droppableId;
    const currentStage = result.source.droppableId;
    if (newStage === currentStage) return;
    if (newStage === 'perdido') {
      setLostModal({ oppId });
      return;
    }
    if (newStage === 'ganho') {
      setWonConfirm({ oppId });
      return;
    }
    await moveStage(oppId, newStage);
  };

  const handleWonConfirm = async () => {
    if (!wonConfirm) return;
    await moveStage(wonConfirm.oppId, 'ganho');
    setWonConfirm(null);
    toast.success('Oportunidade marcada como ganha! 🎉');
  };

  const handleLostConfirm = async (reason: string, notes: string) => {
    if (!lostModal) return;
    const fullReason = notes ? `${reason}: ${notes}` : reason;
    await moveStage(lostModal.oppId, 'perdido', fullReason);
    setLostModal(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground">Funis de Venda</h2>
        <Button onClick={() => { setEditingOpp(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Nova Oportunidade</Button>
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={funnelType} onValueChange={v => setFunnelType(v as any)}>
          <TabsList>
            <TabsTrigger value="lojista"><Store className="h-4 w-4 mr-2" /> Lojistas</TabsTrigger>
            <TabsTrigger value="corporativo"><Building2 className="h-4 w-4 mr-2" /> Corporativos</TabsTrigger>
          </TabsList>
        </Tabs>
        {isAdmin && (
          <Select value={repFilter} onValueChange={setRepFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Representante" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {representatives.map(r => <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="month">Mês atual</SelectItem>
            <SelectItem value="quarter">Trimestre</SelectItem>
            <SelectItem value="year">Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
        <span>Pipeline: <strong className="text-foreground">{formatCurrency(totalPipeline)}</strong></span>
        <Badge variant="outline" className="bg-green-50 text-green-800">✅ {wonOpps.length} ganho(s) — {formatCurrency(wonValue)}</Badge>
        <Badge variant="outline" className="bg-red-50 text-red-800">❌ {lostOpps.length} perdido(s) — {formatCurrency(lostValue)}</Badge>
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingOpp ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle></DialogHeader>
          {isCorporativo ? (
            <CorporateOpportunityForm clients={clients} representatives={representatives} initial={editingOpp} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingOpp(null); }} />
          ) : (
            <LojistaOpportunityForm clients={clients} initial={editingOpp} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingOpp(null); }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Won confirmation dialog */}
      <Dialog open={!!wonConfirm} onOpenChange={(open) => !open && setWonConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar como Ganho?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja marcar esta oportunidade como <strong>Fechado — Ganho ✅</strong>?</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setWonConfirm(null)}>Cancelar</Button>
            <Button onClick={handleWonConfirm} className="bg-green-600 hover:bg-green-700 text-white">Confirmar Ganho</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lost reason modal */}
      <LostReasonModal open={!!lostModal} onClose={() => setLostModal(null)} onConfirm={handleLostConfirm} />

      {/* Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={`grid gap-3 overflow-x-auto`} style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(180px, 1fr))` }}>
          {activeStages.map(stage => {
            const stageOpps = stageGroups[stage.key] || [];
            const stageValue = stageOpps.reduce((s, o) => s + o.value, 0);
            return (
              <div key={stage.key} className="min-w-[180px]">
                <div className={`rounded-t-lg p-2 border ${STAGE_COLORS[stage.key] || 'bg-muted'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{stage.label}</span>
                    <Badge variant="secondary" className="text-xs h-5">{stageOpps.length}</Badge>
                  </div>
                  {stageValue > 0 && <p className="text-xs mt-0.5 opacity-75">{formatCurrency(stageValue)}</p>}
                </div>
                <Droppable droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[200px] transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-muted/30'}`}>
                      {stageOpps.map((opp, index) => (
                        <Draggable key={opp.id} draggableId={opp.id} index={index}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              {isCorporativo ? (
                                <CorporateOpportunityCard opp={opp} clients={clients} representatives={representatives} onEdit={handleEdit} onDelete={deleteOpportunity} />
                              ) : (
                                <LojistaOpportunityCard opp={opp} clients={clients} onEdit={handleEdit} onDelete={deleteOpportunity} />
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {stageOpps.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma oportunidade</p>}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Won & Lost sections */}
      {(wonOpps.length > 0 || lostOpps.length > 0) && (
        <div className="space-y-3 mt-4">
          {wonOpps.length > 0 && (
            <Collapsible open={showWon} onOpenChange={setShowWon}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between border-green-300 hover:bg-green-50">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-800">Fechado — Ganho ✅</span>
                    <Badge variant="secondary">{wonOpps.length}</Badge>
                    <span className="text-sm text-muted-foreground">{formatCurrency(wonValue)}</span>
                  </span>
                  {showWon ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {wonOpps.map(opp => {
                    const client = opp.clientId ? clients.find(c => c.id === opp.clientId) : null;
                    const rep = opp.ownerEmail ? representatives.find(r => r.email === opp.ownerEmail) : null;
                    return (
                      <div key={opp.id} className="bg-card border border-green-200 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {client && <p className="text-xs font-semibold flex items-center gap-1 truncate"><Building2 className="h-3 w-3 shrink-0" /> {client.company}</p>}
                            <p className="text-sm font-medium truncate">{opp.title}</p>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(opp)}><Edit2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        {opp.value > 0 && <p className="text-xs font-semibold text-green-700 flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatCurrency(opp.value)}</p>}
                        {rep && <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {rep.name}</p>}
                        {opp.wonAt && <p className="text-xs text-muted-foreground">Ganho em: {new Date(opp.wonAt).toLocaleDateString('pt-BR')}</p>}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {lostOpps.length > 0 && (
            <Collapsible open={showLost} onOpenChange={setShowLost}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between border-red-300 hover:bg-red-50">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-red-800">Fechado — Perdido ❌</span>
                    <Badge variant="secondary">{lostOpps.length}</Badge>
                    <span className="text-sm text-muted-foreground">{formatCurrency(lostValue)}</span>
                  </span>
                  {showLost ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lostOpps.map(opp => {
                    const client = opp.clientId ? clients.find(c => c.id === opp.clientId) : null;
                    const rep = opp.ownerEmail ? representatives.find(r => r.email === opp.ownerEmail) : null;
                    return (
                      <div key={opp.id} className="bg-card border border-red-200 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {client && <p className="text-xs font-semibold flex items-center gap-1 truncate"><Building2 className="h-3 w-3 shrink-0" /> {client.company}</p>}
                            <p className="text-sm font-medium truncate">{opp.title}</p>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(opp)}><Edit2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        {opp.value > 0 && <p className="text-xs font-semibold text-red-700 flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatCurrency(opp.value)}</p>}
                        {rep && <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {rep.name}</p>}
                        {opp.lostReason && <p className="text-xs text-red-600"><strong>Motivo:</strong> {opp.lostReason}</p>}
                        {opp.lostAt && <p className="text-xs text-muted-foreground">Perdido em: {new Date(opp.lostAt).toLocaleDateString('pt-BR')}</p>}
                        {opp.notes && <p className="text-xs text-muted-foreground line-clamp-2">{opp.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
