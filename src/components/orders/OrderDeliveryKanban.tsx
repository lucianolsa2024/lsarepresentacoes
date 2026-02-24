import { useState, useMemo, useEffect } from 'react';
import { Order, OrderFormData } from '@/types/order';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Package, Truck, AlertTriangle, CheckCircle2, Clock, Search, Bell, CalendarIcon, X, History } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, isBefore, isWithinInterval, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type DeliveryStatus = 'embarque_semana' | 'embarque_proxima' | 'embarque_futuro' | 'atrasado' | 'faturado';

interface OrderDeliveryKanbanProps {
  orders: Order[];
  onUpdate: (id: string, order: OrderFormData, clientId?: string | null) => Promise<boolean>;
}

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; icon: React.ReactNode; color: string }> = {
  atrasado: {
    label: 'Atrasado',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'bg-destructive/10 border-destructive/30 text-destructive',
  },
  embarque_semana: {
    label: 'Embarque na Semana',
    icon: <Truck className="h-4 w-4" />,
    color: 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400',
  },
  embarque_proxima: {
    label: 'Embarque Próxima Semana',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
  },
  embarque_futuro: {
    label: 'Embarque Futuro',
    icon: <Calendar className="h-4 w-4" />,
    color: 'bg-muted border-border text-muted-foreground',
  },
  faturado: {
    label: 'Faturado',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
  },
};

const COLUMN_ORDER: DeliveryStatus[] = ['atrasado', 'embarque_semana', 'embarque_proxima', 'embarque_futuro', 'faturado'];

function getDeliveryStatus(order: Order): DeliveryStatus {
  if (order.orderType === 'PRONTA ENTREGA') return 'faturado';
  const deliveryDateStr = order.rescheduleDate || order.deliveryDate;
  if (!deliveryDateStr) return 'embarque_futuro';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = parseISO(deliveryDateStr);

  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const nextWeekStart = addWeeks(thisWeekStart, 1);
  const nextWeekEnd = addWeeks(thisWeekEnd, 1);

  if (isBefore(deliveryDate, today)) return 'atrasado';
  if (isWithinInterval(deliveryDate, { start: thisWeekStart, end: thisWeekEnd })) return 'embarque_semana';
  if (isWithinInterval(deliveryDate, { start: nextWeekStart, end: nextWeekEnd })) return 'embarque_proxima';
  return 'embarque_futuro';
}

export function OrderDeliveryKanban({ orders, onUpdate }: OrderDeliveryKanbanProps) {
  const [search, setSearch] = useState('');
  const [repFilter, setRepFilter] = useState('all');
  const { repNames } = useRepresentatives();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [fabricArrivalDate, setFabricArrivalDate] = useState('');
  const [rescheduleHistory, setRescheduleHistory] = useState<string[]>([]);
  const [issueDateFrom, setIssueDateFrom] = useState<Date | undefined>();
  const [issueDateTo, setIssueDateTo] = useState<Date | undefined>();
  const [deliveryDateFrom, setDeliveryDateFrom] = useState<Date | undefined>();
  const [deliveryDateTo, setDeliveryDateTo] = useState<Date | undefined>();

  useEffect(() => {
    const overdueCount = orders.filter(o => getDeliveryStatus(o) === 'atrasado').length;
    if (overdueCount > 0) {
      toast.warning(`⚠️ ${overdueCount} pedido(s) com entrega atrasada!`, { duration: 6000, id: 'overdue-alert' });
    }
  }, [orders]);

  const hasDateFilters = issueDateFrom || issueDateTo || deliveryDateFrom || deliveryDateTo;
  const clearDateFilters = () => { setIssueDateFrom(undefined); setIssueDateTo(undefined); setDeliveryDateFrom(undefined); setDeliveryDateTo(undefined); };

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (repFilter !== 'all') result = result.filter(o => o.representative === repFilter);
    if (issueDateFrom) result = result.filter(o => o.issueDate && !isBefore(parseISO(o.issueDate), issueDateFrom));
    if (issueDateTo) result = result.filter(o => o.issueDate && !isAfter(parseISO(o.issueDate), issueDateTo));
    if (deliveryDateFrom) result = result.filter(o => { const d = o.rescheduleDate || o.deliveryDate; return d && !isBefore(parseISO(d), deliveryDateFrom); });
    if (deliveryDateTo) result = result.filter(o => { const d = o.rescheduleDate || o.deliveryDate; return d && !isAfter(parseISO(d), deliveryDateTo); });
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(o => o.clientName.toLowerCase().includes(q) || o.product.toLowerCase().includes(q) || o.orderNumber.toLowerCase().includes(q) || o.oc.toLowerCase().includes(q));
  }, [orders, search, repFilter, issueDateFrom, issueDateTo, deliveryDateFrom, deliveryDateTo]);

  const columns = useMemo(() => {
    const result: Record<DeliveryStatus, Order[]> = { atrasado: [], embarque_semana: [], embarque_proxima: [], embarque_futuro: [], faturado: [] };
    filteredOrders.forEach(order => { result[getDeliveryStatus(order)].push(order); });
    return result;
  }, [filteredOrders]);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const handleOpenCard = async (order: Order) => {
    setSelectedOrder(order);
    setRescheduleDate(order.rescheduleDate || '');
    setFabricArrivalDate((order as any).fabricArrivalDate || '');
    // Load reschedule history from DB
    try {
      const { data } = await supabase.from('orders').select('reschedule_history, fabric_arrival_date').eq('id', order.id).single();
      if (data) {
        const history = Array.isArray(data.reschedule_history) ? data.reschedule_history as string[] : [];
        setRescheduleHistory(history);
        setFabricArrivalDate(data.fabric_arrival_date || '');
      }
    } catch { setRescheduleHistory([]); }
  };

  const handleSaveReschedule = async () => {
    if (!selectedOrder) return;

    // Build new history: append previous reschedule date if it exists and is different
    const newHistory = [...rescheduleHistory];
    const currentReschedule = selectedOrder.rescheduleDate;
    if (currentReschedule && currentReschedule !== rescheduleDate && !newHistory.includes(currentReschedule)) {
      newHistory.push(currentReschedule);
    }
    // Also add original delivery date to history on first reschedule
    if (newHistory.length === 0 && selectedOrder.deliveryDate && rescheduleDate && selectedOrder.deliveryDate !== rescheduleDate) {
      newHistory.push(selectedOrder.deliveryDate);
    }

    const { error } = await supabase
      .from('orders')
      .update({
        reschedule_date: rescheduleDate || null,
        reschedule_history: newHistory,
        fabric_arrival_date: fabricArrivalDate || null,
      })
      .eq('id', selectedOrder.id);

    if (error) { toast.error('Erro ao salvar'); return; }

    selectedOrder.rescheduleDate = rescheduleDate || null;
    (selectedOrder as any).fabricArrivalDate = fabricArrivalDate || null;
    setRescheduleHistory(newHistory);
    toast.success('Dados salvos');
    setSelectedOrder(null);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const destStatus = result.destination.droppableId as DeliveryStatus;
    const orderId = result.draggableId;
    const order = filteredOrders.find(o => o.id === orderId);
    if (!order) return;

    if (destStatus === 'faturado' && getDeliveryStatus(order) !== 'faturado') {
      await supabase.from('orders').update({ order_type: 'PRONTA ENTREGA' }).eq('id', orderId);
      order.orderType = 'PRONTA ENTREGA';
      toast.success('Pedido marcado como faturado');
    }
  };

  const overdueCount = useMemo(() => filteredOrders.filter(o => getDeliveryStatus(o) === 'atrasado').length, [filteredOrders]);
  const isFabricProvided = selectedOrder?.fabricProvided === 'SIM';

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar pedido, cliente, produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={repFilter} onValueChange={setRepFilter}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Todos os representantes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os representantes</SelectItem>
              {repNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filteredOrders.length} pedido(s)</span>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1"><Bell className="h-3 w-3" /> {overdueCount} atrasado(s)</Badge>
          )}
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Emissão de</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !issueDateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-3 w-3" />{issueDateFrom ? format(issueDateFrom, "dd/MM/yyyy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={issueDateFrom} onSelect={setIssueDateFrom} locale={ptBR} className={cn("p-3 pointer-events-auto")} /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Emissão até</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !issueDateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-3 w-3" />{issueDateTo ? format(issueDateTo, "dd/MM/yyyy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={issueDateTo} onSelect={setIssueDateTo} locale={ptBR} className={cn("p-3 pointer-events-auto")} /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Entrega de</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !deliveryDateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-3 w-3" />{deliveryDateFrom ? format(deliveryDateFrom, "dd/MM/yyyy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={deliveryDateFrom} onSelect={setDeliveryDateFrom} locale={ptBR} className={cn("p-3 pointer-events-auto")} /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Entrega até</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !deliveryDateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-3 w-3" />{deliveryDateTo ? format(deliveryDateTo, "dd/MM/yyyy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={deliveryDateTo} onSelect={setDeliveryDateTo} locale={ptBR} className={cn("p-3 pointer-events-auto")} /></PopoverContent>
            </Popover>
          </div>
          {hasDateFilters && (
            <Button variant="ghost" size="sm" onClick={clearDateFilters} className="text-muted-foreground"><X className="h-3 w-3 mr-1" /> Limpar datas</Button>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {COLUMN_ORDER.map(status => {
            const config = STATUS_CONFIG[status];
            const columnOrders = columns[status];
            return (
              <div key={status} className="min-w-[260px] sm:min-w-[220px] snap-start">
                <div className={`flex items-center gap-2 p-2 rounded-t-lg border ${config.color}`}>
                  {config.icon}
                  <span className="text-sm font-semibold">{config.label}</span>
                  <span className="ml-auto text-xs font-bold bg-background/50 rounded-full px-2 py-0.5">{columnOrders.length}</span>
                </div>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[200px] transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-muted/20'}`}>
                      {columnOrders.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Nenhum pedido</p>
                      ) : (
                        columnOrders.map((order, index) => (
                          <Draggable key={order.id} draggableId={order.id} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <Card className={`cursor-pointer hover:shadow-md transition-shadow ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}`} onClick={() => handleOpenCard(order)}>
                                  <CardContent className="p-3 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-primary">#{order.orderNumber || '—'}</span>
                                      <div className="flex gap-1">
                                        {order.rescheduleDate && <Badge variant="outline" className="text-[10px] px-1">Reprog.</Badge>}
                                        {order.fabricProvided === 'SIM' && <Badge variant="secondary" className="text-[10px] px-1">Tec. Forn.</Badge>}
                                      </div>
                                    </div>
                                    <p className="text-sm font-medium truncate">{order.clientName}</p>
                                    <p className="text-xs text-muted-foreground truncate"><Package className="inline h-3 w-3 mr-1" />{order.product || '—'}</p>
                                    {order.oc && <p className="text-xs text-muted-foreground">OC: {order.oc}</p>}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>Entrega: {formatDate(order.rescheduleDate || order.deliveryDate)}</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido #{selectedOrder?.orderNumber || '—'}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-xs text-muted-foreground">Cliente</Label><p className="font-medium">{selectedOrder.clientName}</p></div>
                <div><Label className="text-xs text-muted-foreground">Produto</Label><p className="font-medium">{selectedOrder.product || '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">OC</Label><p className="font-medium">{selectedOrder.oc || '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Tipo</Label><p className="font-medium">{selectedOrder.orderType}</p></div>
                <div><Label className="text-xs text-muted-foreground">Data Entrega Original</Label><p className="font-medium">{formatDate(selectedOrder.deliveryDate)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Quantidade</Label><p className="font-medium">{selectedOrder.quantity}</p></div>
                <div><Label className="text-xs text-muted-foreground">Tecido</Label><p className="font-medium">{selectedOrder.fabric || '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Tecido Fornecido</Label><p className="font-medium">{selectedOrder.fabricProvided === 'SIM' ? 'Sim' : 'Não'}</p></div>
              </div>

              {/* Reschedule History */}
              {rescheduleHistory.length > 0 && (
                <div className="border-t pt-3 space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" /> Histórico de Reprogramações</Label>
                  <div className="flex flex-wrap gap-1">
                    {rescheduleHistory.map((date, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{formatDate(date)}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Fabric Arrival Date (only for "tecido fornecido") */}
              {isFabricProvided && (
                <div className="border-t pt-3 space-y-2">
                  <Label htmlFor="fabricArrival">Data de Chegada do Tecido</Label>
                  <Input id="fabricArrival" type="date" value={fabricArrivalDate} onChange={e => setFabricArrivalDate(e.target.value)} />
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="reschedule">Reprogramação</Label>
                <Input id="reschedule" type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                <p className="text-xs text-muted-foreground">Defina uma nova data caso o embarque tenha sido reprogramado</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(null)}>Fechar</Button>
                <Button className="flex-1" onClick={handleSaveReschedule}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
