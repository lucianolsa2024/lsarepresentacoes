import { useState, useMemo } from 'react';
import { Activity, ACTIVITY_TYPE_CONFIG } from '@/types/activity';
import { SalesOpportunity } from '@/hooks/useSalesOpportunities';
import { Order } from '@/types/order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone, Mail, RefreshCcw, MapPin, Users, ClipboardList, Plus, CheckCircle, Clock, XCircle,
  GraduationCap, Wrench, Heart, MoreHorizontal, ClipboardCheck, Building2,
  TrendingUp, ShoppingCart, DollarSign, Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientDetailPanelProps {
  clientId: string;
  clientName: string;
  activities: Activity[];
  opportunities: SalesOpportunity[];
  orders: Order[];
  onNewActivity: () => void;
  onActivityClick?: (activity: Activity) => void;
  onOpportunityClick?: (opp: SalesOpportunity) => void;
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
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pendente: Clock,
  em_andamento: Clock,
  concluida: CheckCircle,
  cancelada: XCircle,
};

const statusColors: Record<string, string> = {
  pendente: 'text-muted-foreground',
  em_andamento: 'text-blue-500',
  concluida: 'text-green-500',
  cancelada: 'text-red-500',
};

export function ClientDetailPanel({
  clientId,
  clientName,
  activities,
  opportunities,
  orders,
  onNewActivity,
  onActivityClick,
  onOpportunityClick,
}: ClientDetailPanelProps) {
  const [tab, setTab] = useState('activities');

  const clientActivities = useMemo(() => {
    return activities
      .filter(a => a.client_id === clientId)
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [activities, clientId]);

  const clientOpportunities = useMemo(() => {
    return opportunities
      .filter(o => o.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [opportunities, clientId]);

  const clientOrders = useMemo(() => {
    return orders.filter(o => o.clientId === clientId);
  }, [orders, clientId]);

  const activityStats = useMemo(() => {
    const total = clientActivities.length;
    const completed = clientActivities.filter(a => a.status === 'concluida').length;
    const pending = clientActivities.filter(a => a.status === 'pendente' || a.status === 'em_andamento').length;
    return { total, completed, pending };
  }, [clientActivities]);

  const oppStats = useMemo(() => {
    const active = clientOpportunities.filter(o => !['ganho', 'perdido'].includes(o.stage));
    const won = clientOpportunities.filter(o => o.stage === 'ganho');
    const totalValue = active.reduce((s, o) => s + o.value, 0);
    return { active: active.length, won: won.length, totalValue };
  }, [clientOpportunities]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{activityStats.total}</p>
            <p className="text-xs text-muted-foreground">Atividades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{activityStats.completed}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{oppStats.active}</p>
            <p className="text-xs text-muted-foreground">Oport. ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-primary">{formatCurrency(oppStats.totalValue)}</p>
            <p className="text-xs text-muted-foreground">Pipeline</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="activities">
              <ClipboardList className="h-4 w-4 mr-1" /> Atividades ({clientActivities.length})
            </TabsTrigger>
            <TabsTrigger value="opportunities">
              <TrendingUp className="h-4 w-4 mr-1" /> Negociações ({clientOpportunities.length})
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingCart className="h-4 w-4 mr-1" /> Pedidos ({clientOrders.length})
            </TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={onNewActivity}>
            <Plus className="h-4 w-4 mr-1" /> Nova Atividade
          </Button>
        </div>

        <TabsContent value="activities" className="mt-3">
          <ScrollArea className="h-[350px]">
            {clientActivities.length > 0 ? (
              <div className="space-y-2">
                {clientActivities.map(activity => {
                  const TypeIcon = typeIcons[activity.type] || MoreHorizontal;
                  const StatusIcon = statusIcons[activity.status] || Clock;
                  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type];

                  return (
                    <button
                      key={activity.id}
                      onClick={() => onActivityClick?.(activity)}
                      className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <TypeIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{activity.title}</span>
                            <Badge variant="outline" className="text-xs">{typeConfig?.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusIcon className={cn("h-3 w-3", statusColors[activity.status])} />
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(activity.due_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma atividade registrada</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-3">
          <ScrollArea className="h-[350px]">
            {clientOpportunities.length > 0 ? (
              <div className="space-y-2">
                {clientOpportunities.map(opp => (
                  <button
                    key={opp.id}
                    onClick={() => onOpportunityClick?.(opp)}
                    className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{opp.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{opp.stage}</Badge>
                          <Badge variant="outline" className="text-xs">{opp.funnelType}</Badge>
                        </div>
                      </div>
                      {opp.value > 0 && (
                        <p className="text-sm font-semibold text-primary flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> {formatCurrency(opp.value)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma negociação registrada</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="orders" className="mt-3">
          <ScrollArea className="h-[350px]">
            {clientOrders.length > 0 ? (
              <div className="space-y-2">
                {clientOrders.map(order => (
                  <div key={order.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{order.product || 'Pedido'}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.orderNumber && `#${order.orderNumber} • `}
                          {format(parseISO(order.issueDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      {order.price > 0 && (
                        <p className="text-sm font-semibold">{formatCurrency(order.price)}</p>
                      )}
                    </div>
                    {order.deliveryDate && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Entrega: {format(parseISO(order.deliveryDate), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum pedido registrado</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
