import { useState, useMemo } from 'react';
import { Activity, ACTIVITY_TYPE_CONFIG, ACTIVITY_PRIORITY_CONFIG } from '@/types/activity';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityCalendarViewProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onComplete: (id: string) => void;
}

export function ActivityCalendarView({ activities, onEdit, onComplete }: ActivityCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const activitiesByDate = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    activities.forEach(a => {
      const key = a.due_date;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [activities]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getPriorityDot = (priority: string) => {
    const colors: Record<string, string> = {
      baixa: 'bg-green-500',
      media: 'bg-yellow-500',
      alta: 'bg-orange-500',
      urgente: 'bg-red-500',
    };
    return colors[priority] || 'bg-muted-foreground';
  };

  const getStatusStyle = (status: string) => {
    if (status === 'concluida') return 'line-through opacity-60';
    if (status === 'cancelada') return 'line-through opacity-40';
    return '';
  };

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
        {/* Header */}
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 bg-muted border-b">
            {d}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayActivities = activitiesByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={idx}
              className={`min-h-[100px] border-b border-r p-1 ${
                !isCurrentMonth ? 'bg-muted/30' : 'bg-background'
              } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
            >
              <div className={`text-xs font-medium mb-1 ${
                !isCurrentMonth ? 'text-muted-foreground/50' : isToday ? 'text-primary font-bold' : 'text-muted-foreground'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayActivities.slice(0, 3).map(activity => (
                  <Tooltip key={activity.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onEdit(activity)}
                        className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate flex items-center gap-1 hover:bg-accent transition-colors ${getStatusStyle(activity.status)}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPriorityDot(activity.priority)}`} />
                        <span className="truncate">{activity.title}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[250px]">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{activity.title}</p>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {ACTIVITY_TYPE_CONFIG[activity.type]?.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {ACTIVITY_PRIORITY_CONFIG[activity.priority]?.label}
                          </Badge>
                        </div>
                        {activity.client && (
                          <p className="text-xs text-muted-foreground">{activity.client.company}</p>
                        )}
                        {activity.due_time && (
                          <p className="text-xs text-muted-foreground">🕐 {activity.due_time.slice(0, 5)}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {dayActivities.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{dayActivities.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Baixa</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Média</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Alta</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Urgente</span>
      </div>
    </div>
  );
}
