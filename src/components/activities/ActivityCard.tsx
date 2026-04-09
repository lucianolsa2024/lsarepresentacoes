import { Activity, ACTIVITY_TYPE_CONFIG, ACTIVITY_PRIORITY_CONFIG, ACTIVITY_STATUS_CONFIG, ACTIVITY_RESULT_CONFIG } from '@/types/activity';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, Mail, RefreshCcw, MapPin, Users, ClipboardList, 
  Check, X, MessageCircle, Calendar, MoreHorizontal, Clock,
  Building2, Play, GraduationCap, Wrench, Heart, ClipboardCheck, FileText, Briefcase, ListTodo, ArrowRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { openWhatsAppForActivity } from '@/utils/activityWhatsApp';
import { openActivityInOutlook } from '@/utils/activityCalendar';
import { cn } from '@/lib/utils';

interface ActivityCardProps {
  activity: Activity;
  onComplete: (id: string, notes?: string) => void;
  onCancel: (id: string) => void;
  onStart: (id: string) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onCreateQuote?: (clientId: string) => void;
  onOpenChecklist?: (activity: Activity) => void;
  onViewQuote?: (quoteId: string) => void;
  compact?: boolean;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  followup: RefreshCcw,
  ligacao: Phone,
  email: Mail,
  visita: MapPin,
  reuniao: Users,
  tarefa: ClipboardList,
  treinamento: GraduationCap,
  assistencia: Wrench,
  relacionamento: Heart,
  checklist_loja: ClipboardCheck,
  outros: MoreHorizontal,
  whatsapp: MessageCircle,
  proposta_enviada: FileText,
  outro_crm: MoreHorizontal,
};

export function ActivityCard({
  activity,
  onComplete,
  onCancel,
  onStart,
  onEdit,
  onDelete,
  onCreateQuote,
  onOpenChecklist,
  onViewQuote,
  compact = false,
}: ActivityCardProps) {
  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type] || { label: activity.type, color: 'gray' };
  const priorityConfig = ACTIVITY_PRIORITY_CONFIG[activity.priority];
  const statusConfig = ACTIVITY_STATUS_CONFIG[activity.status];
  const TypeIcon = typeIcons[activity.type] || MoreHorizontal;
  const isCrm = activity.activity_category === 'crm';
  
  const dueDate = parseISO(activity.due_date);
  const isOverdue = (activity.status === 'pendente' || activity.status === 'agendada') && isPast(dueDate) && !isToday(dueDate);
  const isCompleted = activity.status === 'concluida' || activity.status === 'realizada';
  const isCancelled = activity.status === 'cancelada';
  const isActive = activity.status === 'pendente' || activity.status === 'em_andamento' || activity.status === 'agendada';
  
  const formatDueDate = () => {
    if (isToday(dueDate)) return 'Hoje';
    if (isTomorrow(dueDate)) return 'Amanhã';
    return format(dueDate, "dd/MM", { locale: ptBR });
  };

  const handleWhatsApp = () => {
    if (activity.client) openWhatsAppForActivity(activity, activity.client);
  };

  const handleOutlook = () => openActivityInOutlook(activity);

  const priorityColors: Record<string, string> = {
    baixa: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgente: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const typeColors: Record<string, string> = {
    followup: 'text-blue-600 dark:text-blue-400',
    ligacao: 'text-green-600 dark:text-green-400',
    email: 'text-purple-600 dark:text-purple-400',
    visita: 'text-orange-600 dark:text-orange-400',
    reuniao: 'text-indigo-600 dark:text-indigo-400',
    tarefa: 'text-gray-600 dark:text-gray-400',
    treinamento: 'text-cyan-600 dark:text-cyan-400',
    assistencia: 'text-amber-600 dark:text-amber-400',
    relacionamento: 'text-pink-600 dark:text-pink-400',
    checklist_loja: 'text-teal-600 dark:text-teal-400',
    outros: 'text-slate-600 dark:text-slate-400',
    whatsapp: 'text-emerald-600 dark:text-emerald-400',
    proposta_enviada: 'text-blue-600 dark:text-blue-400',
    outro_crm: 'text-slate-600 dark:text-slate-400',
  };

  const resultColors: Record<string, string> = {
    positivo: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    neutro: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    negativo: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-2 rounded-lg border bg-card",
        isOverdue && "border-destructive/50 bg-destructive/5",
        isCompleted && "opacity-60",
        isCancelled && "opacity-40 line-through"
      )}>
        <TypeIcon className={cn("h-4 w-4", typeColors[activity.type])} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activity.title}</p>
          {activity.client && <p className="text-xs text-muted-foreground truncate">{activity.client.company}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">{isCrm ? 'CRM' : 'Tarefa'}</Badge>
          {activity.due_time && <span>{activity.due_time.slice(0, 5)}</span>}
          <Badge variant="outline" className={priorityColors[activity.priority]}>{priorityConfig.label}</Badge>
        </div>
        {isActive && (
          <Button size="sm" variant="ghost" onClick={() => onComplete(activity.id)}>
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      "transition-all",
      isOverdue && "border-destructive/50 bg-destructive/5",
      isCompleted && "opacity-70",
      isCancelled && "opacity-50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("p-2 rounded-lg bg-muted", typeColors[activity.type])}>
              <TypeIcon className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={cn("font-medium", isCancelled && "line-through")}>{activity.title}</h4>
                <Badge variant="outline" className="text-[10px]">
                  {isCrm ? <><Briefcase className="h-3 w-3 mr-1 inline" />CRM</> : <><ListTodo className="h-3 w-3 mr-1 inline" />Tarefa</>}
                </Badge>
                <Badge variant="outline" className={priorityColors[activity.priority]}>{priorityConfig.label}</Badge>
                {isOverdue && <Badge variant="destructive">Atrasada</Badge>}
                {activity.result && (
                  <Badge variant="outline" className={resultColors[activity.result]}>
                    {ACTIVITY_RESULT_CONFIG[activity.result]?.label}
                  </Badge>
                )}
              </div>
              
              {activity.client && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Building2 className="h-3 w-3" />
                  <span>{activity.client.company}</span>
                </div>
              )}
              
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
              )}

              {/* CRM next step */}
              {activity.next_step && (
                <div className="flex items-center gap-1 text-sm mt-1 text-primary">
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium">Próx:</span> {activity.next_step}
                </div>
              )}
              
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                <span className={cn(isOverdue && "text-destructive font-medium")}>{formatDueDate()}</span>
                {activity.due_time && (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{activity.due_time.slice(0, 5)}</span>
                )}
                <Badge variant="secondary" className="text-xs">{statusConfig.label}</Badge>
                {activity.next_contact_date && (
                  <span className="text-xs">Próx. contato: {format(parseISO(activity.next_contact_date), "dd/MM", { locale: ptBR })}</span>
                )}
              </div>
              
              {activity.completed_notes && (
                <p className="text-sm text-muted-foreground mt-2 italic">Nota: {activity.completed_notes}</p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isActive && (
                <>
                  {activity.status !== 'agendada' && (
                    <DropdownMenuItem onClick={() => onStart(activity.id)}>
                      <Play className="h-4 w-4 mr-2" />Iniciar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onComplete(activity.id)}>
                    <Check className="h-4 w-4 mr-2" />{isCrm ? 'Marcar Realizada' : 'Concluir'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {activity.client?.phone && (
                <DropdownMenuItem onClick={handleWhatsApp}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleOutlook}><Calendar className="h-4 w-4 mr-2" />Outlook</DropdownMenuItem>
              {activity.client && onCreateQuote && (
                <DropdownMenuItem onClick={() => onCreateQuote(activity.client!.id)}><ClipboardList className="h-4 w-4 mr-2" />Novo Orçamento</DropdownMenuItem>
              )}
              {activity.quote_id && onViewQuote && (
                <DropdownMenuItem onClick={() => onViewQuote(activity.quote_id!)}><FileText className="h-4 w-4 mr-2" />Ver Orçamento</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(activity)}>Editar</DropdownMenuItem>
              {isActive && (
                <DropdownMenuItem onClick={() => onCancel(activity.id)} className="text-destructive"><X className="h-4 w-4 mr-2" />Cancelar</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(activity.id)} className="text-destructive">Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Quick Actions */}
        {isActive && (
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 mt-3 pt-3 border-t">
            <Button size="sm" className="w-full sm:w-auto" onClick={() => onComplete(activity.id)}>
              <Check className="h-4 w-4 mr-1" />{isCrm ? 'Realizada' : 'Concluir'}
            </Button>
            {activity.client?.phone && (
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={handleWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-1" />WhatsApp
              </Button>
            )}
            {activity.type === 'checklist_loja' && onOpenChecklist && (
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChecklist(activity)}>
                <ClipboardCheck className="h-4 w-4 mr-1" />Checklist
              </Button>
            )}
            {activity.quote_id && onViewQuote && (
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => onViewQuote(activity.quote_id!)}>
                <FileText className="h-4 w-4 mr-1" />Orçamento
              </Button>
            )}
            <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={handleOutlook}>
              <Calendar className="h-4 w-4 mr-1" />Outlook
            </Button>
          </div>
        )}
        {activity.type === 'checklist_loja' && isCompleted && onOpenChecklist && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button size="sm" variant="outline" onClick={() => onOpenChecklist(activity)}>
              <ClipboardCheck className="h-4 w-4 mr-1" />Ver Checklist
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
