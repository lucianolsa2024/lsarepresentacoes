import { Activity, ACTIVITY_TYPE_CONFIG } from '@/types/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CalendarDays, ArrowRight, Phone, Mail, RefreshCcw, MapPin, Users, ClipboardList } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityWidgetProps {
  activities: Activity[];
  onViewAll: () => void;
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

export function ActivityWidget({ activities, onViewAll, onActivityClick }: ActivityWidgetProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const overdue = activities.filter(a => 
    a.status === 'pendente' && a.due_date < today
  );
  
  const todayActivities = activities.filter(a => 
    a.status === 'pendente' && a.due_date === today
  );
  
  const upcoming = activities.filter(a => 
    a.status === 'pendente' && a.due_date > today
  ).slice(0, 3);

  const nextThree = [...todayActivities, ...upcoming].slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Atividades Pendentes
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            Ver todas
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className={cn(
            "p-3 rounded-lg text-center",
            overdue.length > 0 ? "bg-destructive/10" : "bg-muted"
          )}>
            <div className={cn(
              "text-2xl font-bold",
              overdue.length > 0 && "text-destructive"
            )}>
              {overdue.length}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Atrasadas
            </div>
          </div>
          
          <div className={cn(
            "p-3 rounded-lg text-center",
            todayActivities.length > 0 ? "bg-orange-100 dark:bg-orange-900/20" : "bg-muted"
          )}>
            <div className={cn(
              "text-2xl font-bold",
              todayActivities.length > 0 && "text-orange-600 dark:text-orange-400"
            )}>
              {todayActivities.length}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Hoje
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-muted text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {upcoming.length}+
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Próximas
            </div>
          </div>
        </div>

        {/* Next Activities */}
        {nextThree.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Próximas atividades</h4>
            {nextThree.map(activity => {
              const TypeIcon = typeIcons[activity.type];
              const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type];
              const isActivityToday = isToday(parseISO(activity.due_date));
              
              return (
                <button
                  key={activity.id}
                  onClick={() => onActivityClick?.(activity)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                >
                  <TypeIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    {activity.client && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.client.company}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={isActivityToday ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {isActivityToday ? (
                        activity.due_time ? activity.due_time.slice(0, 5) : 'Hoje'
                      ) : (
                        format(parseISO(activity.due_date), 'dd/MM', { locale: ptBR })
                      )}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma atividade pendente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
