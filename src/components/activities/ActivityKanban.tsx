import { Activity, ActivityStatus, ACTIVITY_STATUS_CONFIG } from '@/types/activity';
import { ActivityCard } from './ActivityCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ActivityKanbanProps {
  activities: Activity[];
  onComplete: (id: string, notes?: string) => void;
  onCancel: (id: string) => void;
  onStart: (id: string) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onCreateQuote?: (clientId: string) => void;
  onOpenChecklist?: (activity: Activity) => void;
  onViewQuote?: (quoteId: string) => void;
  onStatusChange?: (id: string, status: ActivityStatus) => void;
}

const columns: ActivityStatus[] = ['pendente', 'agendada', 'em_andamento', 'concluida', 'realizada', 'cancelada'];

export function ActivityKanban({
  activities,
  onComplete,
  onCancel,
  onStart,
  onEdit,
  onDelete,
  onCreateQuote,
  onOpenChecklist,
  onViewQuote,
}: ActivityKanbanProps) {
  const getActivitiesByStatus = (status: ActivityStatus) => {
    return activities.filter(a => a.status === status);
  };

  const columnColors: Record<ActivityStatus, string> = {
    pendente: 'border-t-gray-400',
    agendada: 'border-t-blue-400',
    em_andamento: 'border-t-blue-500',
    concluida: 'border-t-green-500',
    realizada: 'border-t-green-500',
    cancelada: 'border-t-red-500',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-300px)]">
      {columns.map(status => {
        const statusConfig = ACTIVITY_STATUS_CONFIG[status];
        const columnActivities = getActivitiesByStatus(status);
        
        return (
          <div
            key={status}
            className={cn(
              "flex flex-col bg-muted/30 rounded-lg border-t-4",
              columnColors[status]
            )}
          >
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center justify-between">
                {statusConfig.label}
                <span className="text-sm font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                  {columnActivities.length}
                </span>
              </h3>
            </div>
            
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {columnActivities.length > 0 ? (
                  columnActivities.map(activity => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onComplete={onComplete}
                      onCancel={onCancel}
                      onStart={onStart}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onCreateQuote={onCreateQuote}
                      onOpenChecklist={onOpenChecklist}
                      onViewQuote={onViewQuote}
                      compact
                    />
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma atividade
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
