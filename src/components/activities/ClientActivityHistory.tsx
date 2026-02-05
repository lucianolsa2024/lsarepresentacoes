import { useMemo } from 'react';
import { Activity, ACTIVITY_TYPE_CONFIG, ACTIVITY_STATUS_CONFIG } from '@/types/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Mail, RefreshCcw, MapPin, Users, ClipboardList, Plus, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientActivityHistoryProps {
  clientId: string;
  activities: Activity[];
  onNewActivity: () => void;
  onActivityClick?: (activity: Activity) => void;
}

const typeIcons: Record<Activity['type'], React.ComponentType<{ className?: string }>> = {
  followup: RefreshCcw,
  ligacao: Phone,
  email: Mail,
  visita: MapPin,
  reuniao: Users,
  tarefa: ClipboardList,
};

const statusIcons: Record<Activity['status'], React.ComponentType<{ className?: string }>> = {
  pendente: Clock,
  em_andamento: Clock,
  concluida: CheckCircle,
  cancelada: XCircle,
};

export function ClientActivityHistory({
  clientId,
  activities,
  onNewActivity,
  onActivityClick,
}: ClientActivityHistoryProps) {
  const clientActivities = useMemo(() => {
    return activities
      .filter(a => a.client_id === clientId)
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [activities, clientId]);

  const stats = useMemo(() => {
    const total = clientActivities.length;
    const completed = clientActivities.filter(a => a.status === 'concluida').length;
    const pending = clientActivities.filter(a => a.status === 'pendente').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, pending, completionRate };
  }, [clientActivities]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    
    clientActivities.forEach(activity => {
      const dateKey = activity.due_date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });
    
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [clientActivities]);

  const statusColors: Record<Activity['status'], string> = {
    pendente: 'text-gray-500',
    em_andamento: 'text-blue-500',
    concluida: 'text-green-500',
    cancelada: 'text-red-500',
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-primary">{stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground">Taxa</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Histórico de Atividades</h3>
        <Button size="sm" onClick={onNewActivity}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Atividade
        </Button>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[400px]">
        {groupedByDate.length > 0 ? (
          <div className="space-y-4">
            {groupedByDate.map(([date, activities]) => (
              <div key={date}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                  {format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h4>
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  {activities.map(activity => {
                    const TypeIcon = typeIcons[activity.type];
                    const StatusIcon = statusIcons[activity.status];
                    const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type];
                    const statusConfig = ACTIVITY_STATUS_CONFIG[activity.status];
                    
                    return (
                      <button
                        key={activity.id}
                        onClick={() => onActivityClick?.(activity)}
                        className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors relative"
                      >
                        <div className="absolute -left-[25px] top-4 w-3 h-3 rounded-full bg-background border-2 border-primary" />
                        
                        <div className="flex items-start gap-3">
                          <TypeIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{activity.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {typeConfig.label}
                              </Badge>
                            </div>
                            
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                            
                            {activity.completed_notes && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                Nota: {activity.completed_notes}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2">
                              <StatusIcon className={cn("h-3 w-3", statusColors[activity.status])} />
                              <span className="text-xs text-muted-foreground">
                                {statusConfig.label}
                              </span>
                              {activity.due_time && (
                                <span className="text-xs text-muted-foreground">
                                  • {activity.due_time.slice(0, 5)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma atividade registrada</p>
            <Button variant="link" onClick={onNewActivity} className="mt-2">
              Criar primeira atividade
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
