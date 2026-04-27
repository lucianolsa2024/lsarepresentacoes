import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSalesOpportunities, SalesOpportunity, FUNNEL_STAGES_CORPORATIVO, LOST_REASONS, OpportunityFormData } from '@/hooks/useSalesOpportunities';
import { useClients, Client } from '@/hooks/useClients';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Edit2, DollarSign, User, Calendar, Store, Building2, Clock, AlertTriangle, ChevronDown, ChevronRight, Trophy, XCircle, Eye, Upload, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { CorporateOpportunityForm } from './CorporateOpportunityForm';
import { LostReasonModal } from './LostReasonModal';
import { PortfolioManager } from '@/components/portfolio/PortfolioManager';
import FunilChecklist from '@/components/funil/FunilChecklist';
import type { AtividadeGerada } from '@/components/funil/FunilChecklist';
import type { FaseId } from '@/components/funil/funil-config';
import { useFunilActions } from '@/components/funil/useFunilActions';
import { OpportunityDetailSheet } from './OpportunityDetailSheet';
import { LeadJsonImporter } from './LeadJsonImporter';

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-slate-100 border-slate-300 text-slate-800',
  prospeccao: 'bg-blue-100 border-blue-300 text-blue-800',
  qualificacao: 'bg-purple-100 border-purple-300 text-purple-800',
  elaboracao_proposta: 'bg-cyan-100 border-cyan-300 text-cyan-800',
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
  opp, clients, representatives, onEdit, onDelete, onView, projectNames,
}: {
  opp: SalesOpportunity; clients: Client[];
  representatives: { email: string; name: string }[];
  onEdit: (opp: SalesOpportunity) => void; onDelete: (id: string) => void;
  onView: (opp: SalesOpportunity) => void;
  projectNames?: Record<string, string>;
}) {
  const client = opp.clientId ? clients.find(c => c.id === opp.clientId) : null;
  const rep = opp.ownerEmail ? representatives.find(r => r.email === opp.ownerEmail) : null;
  const daysInStage = getDaysInStage(opp.stageChangedAt);
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="bg-card border rounded-lg p-2 sm:p-3 space-y-1.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(opp)}>
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
      {projectNames?.[opp.clientId || ''] && (
        <p className="text-xs text-muted-foreground truncate">🏗️ {projectNames[opp.clientId || '']}</p>
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

export function SalesFunnelManager() {
  const { opportunities, loading, addOpportunity, updateOpportunity, deleteOpportunity, moveStage, refetch } = useSalesOpportunities();
  const { clients } = useClients();
  const { user } = useAuth();
  const { representatives } = useRepresentatives();
  const isAdmin = useIsAdmin();
  const { avancarFase } = useFunilActions();
  const [funnelType, setFunnelType] = useState<'lojista' | 'corporativo'>('lojista');
  const [showForm, setShowForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState<SalesOpportunity | null>(null);
  const [repFilter, setRepFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lostModal, setLostModal] = useState<{ oppId: string } | null>(null);
  const [wonConfirm, setWonConfirm] = useState<{ oppId: string } | null>(null);
  const [showWon, setShowWon] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [viewingOpp, setViewingOpp] = useState<SalesOpportunity | null>(null);
  const [checklistPending, setChecklistPending] = useState<{
    opp: SalesOpportunity;
    destStage: string;
  } | null>(null);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [showLeadImporter, setShowLeadImporter] = useState(false);
  // Fetch project names from quotes for all client IDs in opportunities
  useEffect(() => {
    const corpOpps = opportunities.filter(o => o.funnelType === 'corporativo' && o.clientId);
    const clientIds = [...new Set(corpOpps.map(o => o.clientId!))];
    if (clientIds.length === 0) return;
    
    supabase
      .from('quotes')
      .select('client_id, payment')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((q: any) => {
          const pn = q.payment?.projectName;
          if (pn && q.client_id && !map[q.client_id]) {
            map[q.client_id] = pn;
          }
        });
        setProjectNames(map);
      });
  }, [opportunities]);

  useEffect(() => {
    const handler = (e: Event) => {
      const opp = (e as CustomEvent).detail as SalesOpportunity;
      if (opp) {
        if (opp.funnelType === 'lojista') setFunnelType('lojista');
        else setFunnelType('corporativo');
        setEditingOpp(opp);
        setShowForm(true);
      }
    };
    window.addEventListener('edit-opportunity', handler);
    return () => window.removeEventListener('edit-opportunity', handler);
  }, []);

  // Show Portfolio for lojistas tab
  if (funnelType === 'lojista') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Tabs value={funnelType} onValueChange={v => setFunnelType(v as any)}>
            <TabsList>
              <TabsTrigger value="lojista"><Store className="h-4 w-4 mr-2" /> Carteira Lojistas</TabsTrigger>
              <TabsTrigger value="corporativo"><Building2 className="h-4 w-4 mr-2" /> Corporativos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <PortfolioManager />
      </div>
    );
  }

  // Corporativo funnel below
  const stages = FUNNEL_STAGES_CORPORATIVO;
  const activeStages = stages.filter(s => !['ganho', 'perdido'].includes(s.key));

  const filteredOpps = opportunities.filter(o => o.funnelType === 'corporativo')
    .filter(o => repFilter === 'all' || o.ownerEmail === repFilter)
    .filter(o => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const client = o.clientId ? clients.find(c => c.id === o.clientId) : null;
      const projName = projectNames[o.clientId || ''] || '';
      return (
        o.title?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        o.contactName?.toLowerCase().includes(q) ||
        o.contactEmail?.toLowerCase().includes(q) ||
        o.contactPhone?.toLowerCase().includes(q) ||
        o.notes?.toLowerCase().includes(q) ||
        client?.company?.toLowerCase().includes(q) ||
        client?.tradeName?.toLowerCase().includes(q) ||
        projName.toLowerCase().includes(q)
      );
    });

  const periodFilteredOpps = (() => {
    if (periodFilter === 'all') return filteredOpps;
    const now = new Date();
    let start: Date;
    if (periodFilter === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (periodFilter === 'quarter') { const q = Math.floor(now.getMonth() / 3) * 3; start = new Date(now.getFullYear(), q, 1); }
    else { start = new Date(now.getFullYear(), 0, 1); }
    return filteredOpps.filter(o => new Date(o.createdAt) >= start);
  })();

  const stageGroups: Record<string, SalesOpportunity[]> = {};
  const firstStageKey = activeStages[0]?.key || 'prospeccao';
  activeStages.forEach(s => { stageGroups[s.key] = []; });
  periodFilteredOpps.forEach(o => {
    if (stageGroups[o.stage]) {
      stageGroups[o.stage].push(o);
    } else if (!['ganho', 'perdido'].includes(o.stage)) {
      stageGroups[firstStageKey].push(o);
    }
  });

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
    if (newStage === 'perdido') { setLostModal({ oppId }); return; }
    if (newStage === 'ganho') { setWonConfirm({ oppId }); return; }

    // Intercept: open checklist before moving
    const opp = periodFilteredOpps.find(o => o.id === oppId);
    if (opp) {
      setChecklistPending({ opp, destStage: newStage });
    } else {
      await moveStage(oppId, newStage);
    }
  };

  const handleChecklistConfirm = async (atividades: AtividadeGerada[]) => {
    if (!checklistPending) return;
    const { opp, destStage } = checklistPending;
    const faseAtual = (opp.fase || opp.stage || 'prospeccao') as FaseId;
    const faseNova = destStage as FaseId;

    // Use useFunilActions to save fase + create activities + history
    const resultado = await avancarFase({
      oportunidadeId: opp.id,
      faseAtual,
      faseNova,
      atividades,
    });

    if (resultado.sucesso) {
      // Also update the kanban stage column
      await moveStage(opp.id, destStage);
      toast.success(`Fase avançada! ${resultado.atividadesCriadas} atividade(s) criada(s).`);
    } else {
      toast.error(resultado.erro || 'Erro ao avançar fase');
    }

    setChecklistPending(null);
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
        <h2 className="text-lg sm:text-2xl font-bold text-foreground">Funil Corporativo</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowLeadImporter(true)}>
            <Upload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Importar Leads</span>
          </Button>
          <Button size="sm" onClick={() => { setEditingOpp(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova Oportunidade</span>
          </Button>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="space-y-2">
        <Tabs value={funnelType} onValueChange={v => setFunnelType(v as any)}>
          <TabsList>
            <TabsTrigger value="lojista" className="text-xs sm:text-sm">
              <Store className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Carteira</span> Lojistas
            </TabsTrigger>
            <TabsTrigger value="corporativo" className="text-xs sm:text-sm">
              <Building2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Corporativos</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {isAdmin && (
            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger className="w-[160px] sm:w-[200px] shrink-0 h-8 text-xs"><SelectValue placeholder="Representante" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {representatives.map(r => <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[130px] sm:w-[150px] shrink-0 h-8 text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
        <span>Pipeline: <strong className="text-foreground">{formatCurrency(totalPipeline)}</strong></span>
        <Badge variant="outline" className="bg-green-50 text-green-800 text-xs">✅ {wonOpps.length} — {formatCurrency(wonValue)}</Badge>
        <Badge variant="outline" className="bg-red-50 text-red-800 text-xs">❌ {lostOpps.length} — {formatCurrency(lostValue)}</Badge>
      </div>

      {/* Lead JSON Importer */}
      <LeadJsonImporter
        open={showLeadImporter}
        onOpenChange={setShowLeadImporter}
        onImported={refetch}
        ownerEmail={user?.email || undefined}
      />

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingOpp ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle></DialogHeader>
          <CorporateOpportunityForm clients={clients} representatives={representatives} initial={editingOpp} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingOpp(null); }} />
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

      {/* Funnel Checklist Modal */}
      {checklistPending && (() => {
        const client = checklistPending.opp.clientId ? clients.find(c => c.id === checklistPending.opp.clientId) : null;
        const empresa = client?.company || checklistPending.opp.title;
        const faseAtual = (checklistPending.opp.fase || checklistPending.opp.stage || 'prospeccao') as FaseId;
        return (
          <FunilChecklist
            oportunidade={{ id: checklistPending.opp.id, empresa, valor: checklistPending.opp.value }}
            faseAtual={faseAtual}
            fasedestino={checklistPending.destStage as FaseId}
            onConfirmar={handleChecklistConfirm}
            onCancelar={() => setChecklistPending(null)}
          />
        );
      })()}

      {/* Kanban - horizontally scrollable on mobile */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto -mx-2 px-2 pb-2 [overscroll-behavior-x:contain]">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(280px, 1fr))`, minWidth: `${activeStages.length * 290}px` }}>
          {activeStages.map(stage => {
            const stageOpps = stageGroups[stage.key] || [];
            const stageValue = stageOpps.reduce((s, o) => s + o.value, 0);
            return (
              <div key={stage.key} className="min-w-[280px]">
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
                              <CorporateOpportunityCard opp={opp} clients={clients} representatives={representatives} onEdit={handleEdit} onDelete={deleteOpportunity} onView={setViewingOpp} projectNames={projectNames} />
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
        </div>
        {/* Drop zones for Ganho / Perdido */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Droppable droppableId="ganho">
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${snapshot.isDraggingOver ? 'border-green-500 bg-green-50' : 'border-green-300 bg-green-50/30'}`}>
                <Trophy className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <p className="text-sm font-semibold text-green-700">Arraste aqui → Ganho ✅</p>
                <div className="hidden">{provided.placeholder}</div>
              </div>
            )}
          </Droppable>
          <Droppable droppableId="perdido">
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${snapshot.isDraggingOver ? 'border-red-500 bg-red-50' : 'border-red-300 bg-red-50/30'}`}>
                <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                <p className="text-sm font-semibold text-red-700">Arraste aqui → Perdido ❌</p>
                <div className="hidden">{provided.placeholder}</div>
              </div>
            )}
          </Droppable>
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
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleEdit(opp)}><Edit2 className="h-3 w-3" /></Button>
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
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleEdit(opp)}><Edit2 className="h-3 w-3" /></Button>
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

      {/* Opportunity Detail Sheet */}
      <OpportunityDetailSheet
        opportunity={viewingOpp}
        clients={clients}
        representatives={representatives}
        open={!!viewingOpp}
        onOpenChange={(open) => !open && setViewingOpp(null)}
      />
    </div>
  );
}
