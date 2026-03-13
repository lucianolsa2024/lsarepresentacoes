import { Activity } from '@/types/activity';
import { ActivityCard } from './ActivityCard';
import { isToday, isTomorrow, isPast, parseISO, isThisWeek, startOfDay } from 'date-fns';
import { AlertTriangle, Calendar, Sun, CalendarDays, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface ActivityListProps {
  activities: Activity[];
  onComplete: (id: string, notes?: string) => void;
  onCancel: (id: string) => void;
  onStart: (id: string) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onCreateQuote?: (clientId: string) => void;
  onOpenChecklist?: (activity: Activity) => void;
  onViewQuote?: (quoteId: string) => void;
  showCompleted?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (ids: string[]) => void;
  selectionMode?: boolean;
}

interface GroupedActivities {
  overdue: Activity[];
  today: Activity[];
  tomorrow: Activity[];
  thisWeek: Activity[];
  later: Activity[];
  completed: Activity[];
}

export function ActivityList({
  activities,
  onComplete,
  onCancel,
  onStart,
  onEdit,
  onDelete,
  onCreateQuote,
  onOpenChecklist,
  onViewQuote,
  showCompleted = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  selectionMode = false,
}: ActivityListProps) {
  const today = startOfDay(new Date());

  const grouped = activities.reduce<GroupedActivities>(
    (acc, activity) => {
      if (activity.status === 'concluida' || activity.status === 'cancelada' || activity.status === 'realizada') {
        if (showCompleted) {
          acc.completed.push(activity);
        }
        return acc;
      }

      const dueDate = parseISO(activity.due_date);
      
      if (isPast(dueDate) && !isToday(dueDate)) {
        acc.overdue.push(activity);
      } else if (isToday(dueDate)) {
        acc.today.push(activity);
      } else if (isTomorrow(dueDate)) {
        acc.tomorrow.push(activity);
      } else if (isThisWeek(dueDate, { weekStartsOn: 0 })) {
        acc.thisWeek.push(activity);
      } else {
        acc.later.push(activity);
      }
      
      return acc;
    },
    { overdue: [], today: [], tomorrow: [], thisWeek: [], later: [], completed: [] }
  );

  const renderGroup = (
    title: string,
    groupActivities: Activity[],
    icon: React.ReactNode,
    variant: 'destructive' | 'warning' | 'default' | 'muted' = 'default'
  ) => {
    if (groupActivities.length === 0) return null;

    const variants = {
      destructive: 'text-destructive',
      warning: 'text-orange-600 dark:text-orange-400',
      default: 'text-foreground',
      muted: 'text-muted-foreground',
    };

    const groupIds = groupActivities.map(a => a.id);
    const allSelected = selectionMode && selectedIds && groupIds.every(id => selectedIds.has(id));

    return (
      <div className="space-y-3">
        <div className={`flex items-center gap-2 ${variants[variant]}`}>
          {selectionMode && onToggleSelectAll && (
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => onToggleSelectAll(groupIds)}
              className="mr-1"
            />
          )}
          {icon}
          <h3 className="font-semibold">
            {title} ({groupActivities.length})
          </h3>
        </div>
        <div className="space-y-2">
          {groupActivities.map(activity => (
            <div key={activity.id} className="flex items-start gap-2">
              {selectionMode && onToggleSelect && (
                <div className="pt-3">
                  <Checkbox
                    checked={selectedIds?.has(activity.id) ?? false}
                    onCheckedChange={() => onToggleSelect(activity.id)}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <ActivityCard
                  activity={activity}
                  onComplete={onComplete}
                  onCancel={onCancel}
                  onStart={onStart}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCreateQuote={onCreateQuote}
                  onOpenChecklist={onOpenChecklist}
                  onViewQuote={onViewQuote}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasAnyActivity = 
    grouped.overdue.length > 0 ||
    grouped.today.length > 0 ||
    grouped.tomorrow.length > 0 ||
    grouped.thisWeek.length > 0 ||
    grouped.later.length > 0 ||
    grouped.completed.length > 0;

  if (!hasAnyActivity) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma atividade encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(
        'Atrasadas',
        grouped.overdue,
        <AlertTriangle className="h-5 w-5" />,
        'destructive'
      )}
      
      {renderGroup(
        'Hoje',
        grouped.today,
        <Sun className="h-5 w-5" />,
        'warning'
      )}
      
      {renderGroup(
        'Amanhã',
        grouped.tomorrow,
        <Calendar className="h-5 w-5" />
      )}
      
      {renderGroup(
        'Esta Semana',
        grouped.thisWeek,
        <CalendarDays className="h-5 w-5" />
      )}
      
      {renderGroup(
        'Próximas',
        grouped.later,
        <CalendarDays className="h-5 w-5" />,
        'muted'
      )}
      
      {showCompleted && renderGroup(
        'Concluídas',
        grouped.completed,
        <CheckCircle className="h-5 w-5" />,
        'muted'
      )}
    </div>
  );
}
