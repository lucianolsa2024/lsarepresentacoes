import { useState, useMemo } from 'react';
import { Activity, ACTIVITY_TYPE_CONFIG, ACTIVITY_STATUS_CONFIG } from '@/types/activity';
import { SalesOpportunity } from '@/hooks/useSalesOpportunities';
import { Order } from '@/types/order';
import { Quote, CLIENT_TYPE_OPTIONS } from '@/types/quote';
import { Client } from '@/hooks/useClients';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Phone, Mail, RefreshCcw, MapPin, Users, ClipboardList, Plus, CheckCircle, Clock, XCircle,
  GraduationCap, Wrench, Heart, MoreHorizontal, ClipboardCheck, Building2,
  TrendingUp, ShoppingCart, DollarSign, Calendar, FileText, UserCheck, FileSpreadsheet,
  Eye
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { ClientShareWidget } from './ClientShareWidget';

interface ClientDetailPanelProps {
  clientId: string;
  client?: Client | null;
  activities: Activity[];
  opportunities: SalesOpportunity[];
  orders: Order[];
  quotes?: Quote[];
  onNewActivity: () => void;
  onActivityClick?: (activity: Activity) => void;
  onOpportunityClick?: (opp: SalesOpportunity) => void;
  onQuoteClick?: (quote: Quote) => void;
  onOpenChecklist?: (activity: Activity) => void;
  // Legacy prop kept for backward compat
  clientName?: string;
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

const statusColors: Record<string, string> = {
  pendente: 'text-muted-foreground',
  em_andamento: 'text-blue-500',
  concluida: 'text-green-500',
  cancelada: 'text-red-500',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pendente: Clock,
  em_andamento: Clock,
  concluida: CheckCircle,
  cancelada: XCircle,
};

export function ClientDetailPanel({
  clientId,
  client,
  activities,
  opportunities,
  orders,
  quotes = [],
  onNewActivity,
  onActivityClick,
  onOpportunityClick,
  onQuoteClick,
  onOpenChecklist,
}: ClientDetailPanelProps) {
  const [tab, setTab] = useState('info');
  const { emailToName } = useRepresentatives();

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

  const clientQuotes = useMemo(() => {
    return quotes.filter(q => {
      // Match by client_id from DB or by company name
      if ((q as any).clientId === clientId) return true;
      if (client && q.client?.company?.toUpperCase().trim() === client.company.toUpperCase().trim()) return true;
      return false;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotes, clientId, client]);

  // Checklists from activities of type checklist_loja
  const checklists = useMemo(() => {
    return clientActivities.filter(a => a.type === 'checklist_loja' && a.description);
  }, [clientActivities]);

  // Upcoming activities (pending/in-progress, future or today)
  const upcomingActivities = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return clientActivities
      .filter(a => (a.status === 'pendente' || a.status === 'em_andamento') && a.due_date >= today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 5);
  }, [clientActivities]);

  const activityStats = useMemo(() => {
    const total = clientActivities.length;
    const completed = clientActivities.filter(a => a.status === 'concluida').length;
    const pending = clientActivities.filter(a => a.status === 'pendente' || a.status === 'em_andamento').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, rate };
  }, [clientActivities]);

  const oppStats = useMemo(() => {
    const active = clientOpportunities.filter(o => !['ganho', 'perdido'].includes(o.stage));
    const won = clientOpportunities.filter(o => o.stage === 'ganho');
    const totalValue = active.reduce((s, o) => s + o.value, 0);
    const wonValue = won.reduce((s, o) => s + o.value, 0);
    return { active: active.length, won: won.length, totalValue, wonValue };
  }, [clientOpportunities]);

  const orderStats = useMemo(() => {
    const totalRevenue = clientOrders.reduce((s, o) => s + (o.price || 0), 0);
    return { count: clientOrders.length, totalRevenue };
  }, [clientOrders]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const clientTypeLabel = client?.clientType
    ? CLIENT_TYPE_OPTIONS.find(o => o.value === client.clientType)?.label || client.clientType
    : null;

  return (
    <div className="space-y-4">
      {/* Client Header Info */}
      {client && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">{client.company}</h2>
              {client.name && <p className="text-sm text-muted-foreground">{client.name}</p>}
              <div className="flex flex-wrap gap-2 mt-1">
                {clientTypeLabel && (
                  <Badge variant="secondary" className="text-xs">{clientTypeLabel}</Badge>
                )}
                {client.ownerEmail && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    {emailToName[client.ownerEmail] || client.ownerEmail}
                  </Badge>
                )}
                {client.isNewClient && (
                  <Badge className="text-xs bg-green-100 text-green-800">Novo</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Contact & Address row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              {client.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                </p>
              )}
              {client.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`mailto:${client.email}`} className="hover:underline truncate">{client.email}</a>
                </p>
              )}
              {client.document && (
                <p className="flex items-center gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                  {client.document}
                </p>
              )}
            </div>
            <div className="space-y-1">
              {(client.address.street || client.address.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    {client.address.street && (
                      <p>{client.address.street}{client.address.number ? `, ${client.address.number}` : ''}{client.address.complement ? ` - ${client.address.complement}` : ''}</p>
                    )}
                    {(client.address.neighborhood || client.address.city) && (
                      <p className="text-muted-foreground">
                        {[client.address.neighborhood, client.address.city, client.address.state].filter(Boolean).join(' - ')}
                        {client.address.zipCode ? ` | ${client.address.zipCode}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-2.5 text-center">
            <p className="text-lg font-bold">{activityStats.total}</p>
            <p className="text-[10px] text-muted-foreground">Atividades</p>
            {activityStats.total > 0 && (
              <p className="text-[10px] text-green-600">{activityStats.rate}% concluídas</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 text-center">
            <p className="text-lg font-bold">{oppStats.active + oppStats.won}</p>
            <p className="text-[10px] text-muted-foreground">Negociações</p>
            {oppStats.won > 0 && (
              <p className="text-[10px] text-green-600">{oppStats.won} ganhas</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 text-center">
            <p className="text-lg font-bold">{orderStats.count}</p>
            <p className="text-[10px] text-muted-foreground">Pedidos</p>
            {orderStats.totalRevenue > 0 && (
              <p className="text-[10px] text-primary truncate">{formatCurrency(orderStats.totalRevenue)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 text-center">
            <p className="text-lg font-bold text-primary truncate">{formatCurrency(oppStats.totalValue)}</p>
            <p className="text-[10px] text-muted-foreground">Pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-2">
          <TabsList className="flex-wrap h-auto">
            {client && (
              <TabsTrigger value="info" className="text-xs">
                <Building2 className="h-3.5 w-3.5 mr-1" /> Info
              </TabsTrigger>
            )}
            <TabsTrigger value="activities" className="text-xs">
              <ClipboardList className="h-3.5 w-3.5 mr-1" /> Atividades ({clientActivities.length})
            </TabsTrigger>
            <TabsTrigger value="checklists" className="text-xs">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Checklists ({checklists.length})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="text-xs">
              <TrendingUp className="h-3.5 w-3.5 mr-1" /> Negociações ({clientOpportunities.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">
              <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Pedidos ({clientOrders.length})
            </TabsTrigger>
            <TabsTrigger value="quotes" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1" /> Orçamentos ({clientQuotes.length})
            </TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={onNewActivity} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Atividade
          </Button>
        </div>

        {/* Info Tab */}
        {client && (
          <TabsContent value="info" className="mt-3">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Resumo do Relacionamento</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border">
                    <p className="text-muted-foreground text-xs">Total Pedidos (valor)</p>
                    <p className="font-bold">{formatCurrency(orderStats.totalRevenue)}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-muted-foreground text-xs">Pipeline ativo</p>
                    <p className="font-bold">{formatCurrency(oppStats.totalValue)}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-muted-foreground text-xs">Negociações ganhas</p>
                    <p className="font-bold text-green-600">{oppStats.won} ({formatCurrency(oppStats.wonValue)})</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-muted-foreground text-xs">Taxa conclusão atividades</p>
                    <p className="font-bold">{activityStats.rate}%</p>
                  </div>
                </div>
              </div>

              {/* Upcoming activities */}
              {upcomingActivities.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Próximas Atividades</h4>
                  <div className="space-y-2">
                    {upcomingActivities.map(act => {
                      const TypeIcon = typeIcons[act.type] || MoreHorizontal;
                      return (
                        <button
                          key={act.id}
                          onClick={() => onActivityClick?.(act)}
                          className="w-full text-left p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-sm flex-1 truncate">{act.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(act.due_date), "dd/MM", { locale: ptBR })}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {clientActivities.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Última Atividade</h4>
                  <div className="p-3 rounded-lg border">
                    <p className="font-medium">{clientActivities[0].title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(clientActivities[0].due_date), "dd/MM/yyyy", { locale: ptBR })} • {ACTIVITY_STATUS_CONFIG[clientActivities[0].status]?.label}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Activities */}
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
                            <span className="font-medium text-sm truncate">{activity.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{typeConfig?.label}</Badge>
                          </div>
                          {activity.description && activity.type !== 'checklist_loja' && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{activity.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <StatusIcon className={cn("h-3 w-3", statusColors[activity.status])} />
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(activity.due_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            {activity.completed_notes && (
                              <span className="text-xs text-muted-foreground italic truncate">• {activity.completed_notes}</span>
                            )}
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

        {/* Opportunities */}
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
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{opp.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{opp.stage}</Badge>
                          <Badge variant="outline" className="text-xs">{opp.funnelType}</Badge>
                        </div>
                      </div>
                      {opp.value > 0 && (
                        <p className="text-sm font-semibold text-primary flex items-center gap-1 shrink-0">
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

        {/* Orders */}
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
                          {order.supplier && `${order.supplier} • `}
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

        {/* Quotes */}
        <TabsContent value="quotes" className="mt-3">
          <ScrollArea className="h-[350px]">
            {clientQuotes.length > 0 ? (
              <div className="space-y-2">
                {clientQuotes.map(quote => (
                  <button
                    key={quote.id}
                    onClick={() => onQuoteClick?.(quote)}
                    className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          Orç. #{quote.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(quote.createdAt), 'dd/MM/yyyy')} • {quote.items?.length || 0} itens
                        </p>
                        {quote.status && (
                          <Badge variant="outline" className={cn("text-xs mt-1", {
                            'border-green-500 text-green-700': quote.status === 'pedido',
                            'border-red-500 text-red-700': quote.status === 'cancelado',
                          })}>
                            {quote.status === 'pedido' ? 'Pedido' : quote.status === 'cancelado' ? 'Cancelado' : 'Orçamento'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-primary">{formatCurrency(quote.total)}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum orçamento registrado</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Checklists */}
        <TabsContent value="checklists" className="mt-3">
          <ScrollArea className="h-[350px]">
            {checklists.length > 0 ? (
              <div className="space-y-3">
                {checklists.map(activity => {
                  let checklistData: Record<string, any> | null = null;
                  try {
                    checklistData = JSON.parse(activity.description);
                  } catch {}

                  const checkDate = checklistData?.dataVisita || activity.due_date;
                  const shareNosso = checklistData?.qtdProdutosNossos != null && checklistData?.qtdProdutosConcorrentes != null
                    ? Math.round((checklistData.qtdProdutosNossos / (checklistData.qtdProdutosNossos + checklistData.qtdProdutosConcorrentes)) * 100)
                    : null;

                  return (
                    <button
                      key={activity.id}
                      onClick={() => onOpenChecklist?.(activity)}
                      className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{activity.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(checkDate), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      {checklistData && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {checklistData.qtdProdutosNossos != null && (
                            <div className="p-1.5 rounded bg-muted">
                              <span className="text-muted-foreground">Nossos:</span>{' '}
                              <span className="font-medium">{checklistData.qtdProdutosNossos}</span>
                            </div>
                          )}
                          {shareNosso != null && (
                            <div className="p-1.5 rounded bg-muted">
                              <span className="text-muted-foreground">Share:</span>{' '}
                              <span className="font-bold">{shareNosso}%</span>
                            </div>
                          )}
                          {checklistData.scoreLoja && (
                            <div className="p-1.5 rounded bg-muted">
                              <span className="text-muted-foreground">Score:</span>{' '}
                              <span className="font-bold">{checklistData.scoreLoja}</span>
                            </div>
                          )}
                          {checklistData.fluxoLoja && (
                            <div className="p-1.5 rounded bg-muted">
                              <span className="text-muted-foreground">Fluxo:</span>{' '}
                              <span className="font-medium">{checklistData.fluxoLoja}</span>
                            </div>
                          )}
                          {checklistData.humorLojista && (
                            <div className="p-1.5 rounded bg-muted">
                              <span className="text-muted-foreground">Humor:</span>{' '}
                              <span className="font-medium">{checklistData.humorLojista}</span>
                            </div>
                          )}
                          {checklistData.ticketMedio && (
                            <div className="p-1.5 rounded bg-muted">
                              <span className="text-muted-foreground">Ticket:</span>{' '}
                              <span className="font-medium">{checklistData.ticketMedio}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {checklistData?.oportunidadeIdentificada && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          💡 {checklistData.oportunidadeIdentificada}
                        </p>
                      )}
                      {checklistData?.proximoPasso && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          ➡️ {checklistData.proximoPasso}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum checklist registrado</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
