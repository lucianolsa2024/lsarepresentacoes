import { useState, useMemo, useEffect } from 'react';
import { useActivities } from '@/hooks/useActivities';
import { Activity, ActivityType, ActivityPriority, ActivityStatus, CreateActivityInput } from '@/types/activity';
import { ActivityList } from './ActivityList';
import { ActivityKanban } from './ActivityKanban';
import { ActivityFilters } from './ActivityFilters';
import { ActivityForm } from './ActivityForm';
import { ActivityReport } from './ActivityReport';
import { ChecklistReport } from './ChecklistReport';
import { ActivityCalendarView } from './ActivityCalendarView';
import { StoreChecklistForm } from './StoreChecklistForm';
import { StoreChecklistData } from '@/types/storeChecklist';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, List, LayoutGrid, BarChart3, CalendarDays, Loader2, ClipboardCheck } from 'lucide-react';
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

  const [view, setView] = useState<'list' | 'kanban' | 'calendar' | 'report' | 'checklist_report'>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [completeDialog, setCompleteDialog] = useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistActivity, setChecklistActivity] = useState<Activity | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ActivityPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all');

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Search
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          activity.title.toLowerCase().includes(searchLower) ||
          activity.description?.toLowerCase().includes(searchLower) ||
          activity.client?.company.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type
      if (typeFilter !== 'all' && activity.type !== typeFilter) return false;

      // Priority
      if (priorityFilter !== 'all' && activity.priority !== priorityFilter) return false;

      // Status
      if (statusFilter !== 'all' && activity.status !== statusFilter) return false;

      return true;
    });
  }, [activities, search, typeFilter, priorityFilter, statusFilter]);

  const handleClearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
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
  };

  const handleConfirmComplete = async () => {
    if (completeDialog) {
      await completeActivity(completeDialog, completeNotes || undefined);
      setCompleteDialog(null);
      setCompleteNotes('');
    }
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
          <Button onClick={() => { setEditingActivity(undefined); setDefaultDate(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Atividade
          </Button>
        </div>
      </div>

      {/* Filters */}
      {view !== 'report' && view !== 'calendar' && view !== 'checklist_report' && (
        <ActivityFilters
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onClearFilters={handleClearFilters}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmComplete}>
              Concluir
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
