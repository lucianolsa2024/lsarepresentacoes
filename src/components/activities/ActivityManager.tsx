import { useState, useMemo, useEffect } from 'react';
import { useActivities } from '@/hooks/useActivities';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { useSalesOpportunities } from '@/hooks/useSalesOpportunities';
import { Activity, ActivityCategory, ActivityType, ActivityPriority, ActivityStatus, CreateActivityInput } from '@/types/activity';
import { ActivityList } from './ActivityList';
import { ActivityKanban } from './ActivityKanban';
import { ActivityFilters } from './ActivityFilters';
import { ActivityForm } from './ActivityForm';
import { ActivityReport } from './ActivityReport';
import { ChecklistReport } from './ChecklistReport';
import { ActivityCalendarView } from './ActivityCalendarView';
import { StoreChecklistForm } from './StoreChecklistForm';
import { BulkActionBar } from './BulkActionBar';
import { StoreChecklistData } from '@/types/storeChecklist';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, List, LayoutGrid, BarChart3, CalendarDays, Loader2, ClipboardCheck, CheckSquare, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ActivityManagerProps {
  onCreateQuote?: (clientId: string) => void;
  onViewQuote?: (quoteId: string) => void;
}

export function ActivityManager({ onCreateQuote, onViewQuote }: ActivityManagerProps) {
  const {
    activities,
    loading,
    addActivity,
    updateActivity,
    deleteActivity,
    completeActivity,
    cancelActivity,
    startActivity,
  } = useActivities();

  const isAdmin = useIsAdmin();
  const { user } = useAuth();
  const { activeReps } = useRepresentatives();
  const { addOpportunity } = useSalesOpportunities();
  const currentEmail = user?.email;

  const [view, setView] = useState<'list' | 'kanban' | 'calendar' | 'report' | 'checklist_report'>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [completeDialog, setCompleteDialog] = useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [createDeal, setCreateDeal] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistActivity, setChecklistActivity] = useState<Activity | null>(null);

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ActivityPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all');
  const [repFilter, setRepFilter] = useState<string>('all');

  const filteredActivities = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const isDeliveryActivity = (a: Activity) =>
      a.type === 'tarefa' && a.title.includes('Entrega pedido');
    const isMaira = currentEmail === 'posicao@lsarepresentacoes.com.br';

    return activities.filter(activity => {
      if (hiddenIds.has(activity.id)) return false;

      // Delivery activities: only visible to Maíra
      if (isDeliveryActivity(activity) && !isMaira) {
        return false;
      }

      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          activity.title.toLowerCase().includes(searchLower) ||
          activity.description?.toLowerCase().includes(searchLower) ||
          activity.client?.company.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (categoryFilter !== 'all' && activity.activity_category !== categoryFilter) return false;
      if (typeFilter !== 'all' && activity.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && activity.priority !== priorityFilter) return false;
      if (statusFilter !== 'all' && activity.status !== statusFilter) return false;
      if (repFilter !== 'all' && activity.assigned_to_email !== repFilter) return false;
      return true;
    });
  }, [activities, search, categoryFilter, typeFilter, priorityFilter, statusFilter, repFilter, hiddenIds, isAdmin, currentEmail]);

  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    setRepFilter('all');
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: CreateActivityInput) => {
    if (editingActivity) {
      await updateActivity(editingActivity.id, data);
    } else {
      await addActivity(data);
    }
    setEditingActivity(undefined);
  };

  const handleComplete = (id: string) => {
    setCompleteDialog(id);
    setCompleteNotes('');
    setCreateFollowUp(false);
    setFollowUpDate('');
    setCreateDeal(false);
    setDealTitle('');
    setDealValue('');
  };

  const getNextFollowUpTitle = (title: string): string => {
    // Match trailing " - N" or " N" pattern
    const match = title.match(/^(.*?)(?:\s*-\s*(\d+)|\s+(\d+))$/);
    if (match) {
      const base = match[1];
      const num = parseInt(match[2] || match[3], 10);
      return `${base} - ${num + 1}`;
    }
    return `${title} - 2`;
  };

  const handleConfirmComplete = async () => {
    if (!completeDialog) return;
    const activity = activities.find(a => a.id === completeDialog);
    await completeActivity(completeDialog, completeNotes || undefined);

    if (createFollowUp && followUpDate && activity) {
      const newTitle = getNextFollowUpTitle(activity.title);
      await addActivity({
        activity_category: activity.activity_category,
        type: activity.type,
        title: newTitle,
        description: activity.description,
        due_date: followUpDate,
        due_time: activity.due_time,
        priority: activity.priority,
        client_id: activity.client_id,
        quote_id: activity.quote_id,
      });
    }

    if (createDeal && activity) {
      await addOpportunity({
        clientId: activity.client_id || null,
        title: dealTitle.trim() || `Negociação — ${activity.client?.company || activity.title}`,
        description: `Originada da atividade: ${activity.title}`,
        funnelType: 'corporativo',
        stage: 'prospeccao',
        value: parseFloat(dealValue) || 0,
        ownerEmail: activity.assigned_to_email || currentEmail,
      });
      toast.success('Negociação criada!');
    }

    setCompleteDialog(null);
    setCompleteNotes('');
    setCreateFollowUp(false);
    setFollowUpDate('');
    setCreateDeal(false);
    setDealTitle('');
    setDealValue('');
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteActivity(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleOpenChecklist = (activity: Activity) => {
    setChecklistActivity(activity);
    setChecklistOpen(true);
  };

  const handleSaveChecklist = async (data: StoreChecklistData) => {
    if (!checklistActivity) return;
    // Always update dataVisita to current date when saving
    const dataWithDate = {
      ...data,
      dataVisita: new Date().toISOString().split('T')[0],
    };
    await updateActivity(checklistActivity.id, {
      description: JSON.stringify(dataWithDate),
    });

    // Auto-create assistance card if flagged
    if (data.assistenciaIdentificada && data.assistenciaProduto) {
      const clientName = checklistActivity.client?.company || data.cliente || '';
      await addActivity({
        activity_category: 'tarefa',
        type: 'assistencia',
        title: `Assistência - ${clientName} - ${data.assistenciaProduto}`,
        description: `Produto: ${data.assistenciaProduto}\nDefeito: ${data.assistenciaDefeito}\n${data.assistenciaDescricao ? `Detalhes: ${data.assistenciaDescricao}` : ''}\n\nIdentificado no checklist de visita em ${data.dataVisita}`,
        due_date: new Date().toISOString().split('T')[0],
        priority: 'media',
        client_id: checklistActivity.client_id,
      });
    }

    setChecklistActivity(null);
  };

  // Listen for external checklist open events (from ClientDetailPanel)
  useEffect(() => {
    const handler = (e: Event) => {
      const activity = (e as CustomEvent).detail as Activity;
      if (activity) handleOpenChecklist(activity);
    };
    window.addEventListener('open-checklist', handler);
    return () => window.removeEventListener('open-checklist', handler);
  }, []);

  // Bulk action handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkComplete = async () => {
    const ids = Array.from(selectedIds);
    let count = 0;
    for (const id of ids) {
      const ok = await completeActivity(id);
      if (ok) count++;
    }
    toast.success(`${count} atividade${count > 1 ? 's' : ''} concluída${count > 1 ? 's' : ''}`);
    handleClearSelection();
  };

  const handleBulkCancel = async () => {
    const ids = Array.from(selectedIds);
    let count = 0;
    for (const id of ids) {
      const ok = await cancelActivity(id);
      if (ok) count++;
    }
    toast.success(`${count} atividade${count > 1 ? 's' : ''} cancelada${count > 1 ? 's' : ''}`);
    handleClearSelection();
  };

  const handleBulkStart = async () => {
    const ids = Array.from(selectedIds);
    let count = 0;
    for (const id of ids) {
      const ok = await startActivity(id);
      if (ok) count++;
    }
    toast.success(`${count} atividade${count > 1 ? 's' : ''} iniciada${count > 1 ? 's' : ''}`);
    handleClearSelection();
  };

  const handleBulkAssign = async (email: string) => {
    const ids = Array.from(selectedIds);
    let count = 0;
    for (const id of ids) {
      const ok = await updateActivity(id, { assigned_to_email: email });
      if (ok) count++;
    }
    toast.success(`${count} atividade${count > 1 ? 's' : ''} designada${count > 1 ? 's' : ''}`);
    // Hide assigned activities from current view
    setHiddenIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    handleClearSelection();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold">Atividades</h2>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="list">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarDays className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="report">
                <BarChart3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="checklist_report">
                <ClipboardCheck className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'list' && (
            <Button
              variant={selectionMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) setSelectedIds(new Set());
              }}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Selecionar
            </Button>
          )}
          <Button onClick={() => { setEditingActivity(undefined); setDefaultDate(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Atividade
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onBulkComplete={handleBulkComplete}
          onBulkCancel={handleBulkCancel}
          onBulkStart={handleBulkStart}
          onBulkAssign={handleBulkAssign}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* Filters */}
      {view !== 'report' && view !== 'calendar' && view !== 'checklist_report' && (
        <ActivityFilters
          search={search}
          onSearchChange={setSearch}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onClearFilters={handleClearFilters}
          repFilter={repFilter}
          onRepFilterChange={setRepFilter}
          representatives={activeReps}
          showRepFilter={!!isAdmin}
        />
      )}

      {/* Content */}
      {view === 'list' && (
        <ActivityList
          activities={filteredActivities}
          onComplete={handleComplete}
          onCancel={cancelActivity}
          onStart={startActivity}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteConfirm(id)}
          onCreateQuote={onCreateQuote}
          onOpenChecklist={handleOpenChecklist}
          onViewQuote={onViewQuote}
          showCompleted={statusFilter === 'concluida' || statusFilter === 'all'}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      )}

      {view === 'kanban' && (
        <ActivityKanban
          activities={filteredActivities}
          onComplete={handleComplete}
          onCancel={cancelActivity}
          onStart={startActivity}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteConfirm(id)}
          onCreateQuote={onCreateQuote}
          onOpenChecklist={handleOpenChecklist}
          onViewQuote={onViewQuote}
        />
      )}

      {view === 'calendar' && (
        <ActivityCalendarView
          activities={filteredActivities}
          onEdit={handleEdit}
          onComplete={handleComplete}
          onCreateOnDate={(date) => {
            setEditingActivity(undefined);
            setDefaultDate(date);
            setFormOpen(true);
          }}
        />
      )}

      {view === 'report' && (
        <ActivityReport activities={activities} />
      )}

      {view === 'checklist_report' && (
        <ChecklistReport activities={activities} />
      )}

      {/* Form Dialog */}
      <ActivityForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingActivity(undefined);
            setDefaultDate(undefined);
          }
        }}
        activity={editingActivity}
        onSubmit={handleFormSubmit}
        defaultDate={defaultDate}
      />

      {/* Complete Dialog */}
      <Dialog open={!!completeDialog} onOpenChange={() => setCompleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notas de Conclusão (opcional)</Label>
              <Textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Registre o resultado ou observações..."
                rows={3}
              />
            </div>
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createFollowUp"
                  checked={createFollowUp}
                  onChange={(e) => setCreateFollowUp(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="createFollowUp" className="cursor-pointer text-sm">
                  Gerar nova atividade de follow-up
                </Label>
              </div>
              {createFollowUp && (
                <div className="space-y-2 pl-6">
                  <Label className="text-sm">Data da próxima atividade</Label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {completeDialog && (() => {
                    const act = activities.find(a => a.id === completeDialog);
                    if (!act) return null;
                    return (
                      <p className="text-xs text-muted-foreground">
                        Novo título: <span className="font-medium">{getNextFollowUpTitle(act.title)}</span>
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmComplete} disabled={createFollowUp && !followUpDate}>
              {createFollowUp ? 'Concluir e Criar Follow-up' : 'Concluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atividade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Store Checklist Form */}
      <StoreChecklistForm
        open={checklistOpen}
        onOpenChange={(open) => {
          setChecklistOpen(open);
          if (!open) setChecklistActivity(null);
        }}
        onSave={handleSaveChecklist}
        initialData={
          checklistActivity?.description
            ? (() => { try { return JSON.parse(checklistActivity.description); } catch { return undefined; } })()
            : undefined
        }
        clientName={checklistActivity?.client?.company}
        clientCity={undefined}
        readOnly={checklistActivity?.status === 'concluida' || checklistActivity?.status === 'cancelada'}
      />
    </div>
  );
}
