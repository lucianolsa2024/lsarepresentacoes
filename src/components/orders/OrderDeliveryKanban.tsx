import { useState, useMemo, useEffect } from 'react';
import { Order, OrderFormData, REPRESENTATIVES } from '@/types/order';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Package, Truck, AlertTriangle, CheckCircle2, Clock, Search, Bell } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, isBefore, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';

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
  // If order type indicates it's already delivered/invoiced
  if (order.orderType === 'PRONTA ENTREGA') return 'faturado';

  const deliveryDateStr = (order as any).rescheduleDate || order.deliveryDate;
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  // Overdue alert on mount
  useEffect(() => {
    const overdueCount = orders.filter(o => getDeliveryStatus(o) === 'atrasado').length;
    if (overdueCount > 0) {
      toast.warning(`⚠️ ${overdueCount} pedido(s) com entrega atrasada!`, {
        duration: 6000,
        id: 'overdue-alert',
      });
    }
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (repFilter !== 'all') {
      result = result.filter(o => o.representative === repFilter);
    }
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(o =>
      o.clientName.toLowerCase().includes(q) ||
      o.product.toLowerCase().includes(q) ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.oc.toLowerCase().includes(q)
    );
  }, [orders, search, repFilter]);

  const columns = useMemo(() => {
    const result: Record<DeliveryStatus, Order[]> = {
      atrasado: [],
      embarque_semana: [],
      embarque_proxima: [],
      embarque_futuro: [],
      faturado: [],
    };

    filteredOrders.forEach(order => {
      const status = getDeliveryStatus(order);
      result[status].push(order);
    });

    return result;
  }, [filteredOrders]);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const handleOpenCard = (order: Order) => {
    setSelectedOrder(order);
    setRescheduleDate((order as any).rescheduleDate || '');
  };

  const handleSaveReschedule = async () => {
    if (!selectedOrder) return;
    const formData: OrderFormData = {
      issueDate: selectedOrder.issueDate,
      clientName: selectedOrder.clientName,
      supplier: selectedOrder.supplier,
      representative: selectedOrder.representative,
      orderNumber: selectedOrder.orderNumber,
      oc: selectedOrder.oc,
      product: selectedOrder.product,
      fabricProvided: selectedOrder.fabricProvided,
      fabric: selectedOrder.fabric,
      dimensions: selectedOrder.dimensions,
      deliveryDate: selectedOrder.deliveryDate || '',
      quantity: selectedOrder.quantity,
      price: selectedOrder.price,
      orderType: selectedOrder.orderType,
      paymentTerms: selectedOrder.paymentTerms,
    };

    // We save reschedule_date via direct supabase call since it's not in OrderFormData
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase
      .from('orders')
      .update({ reschedule_date: rescheduleDate || null })
      .eq('id', selectedOrder.id);

    if (error) {
      const { toast } = await import('sonner');
      toast.error('Erro ao salvar reprogramação');
      return;
    }

    // Update local state
    (selectedOrder as any).rescheduleDate = rescheduleDate || null;
    const { toast } = await import('sonner');
    toast.success('Reprogramação salva');
    setSelectedOrder(null);
  };

  const handleDragEnd = async (result: DropResult) => {
    // Drag-and-drop is visual only for delivery kanban - status is date-driven
    // We could allow dragging to "faturado" to mark as invoiced
    if (!result.destination) return;
    const destStatus = result.destination.droppableId as DeliveryStatus;
    const orderId = result.draggableId;
    const order = filteredOrders.find(o => o.id === orderId);
    if (!order) return;

    if (destStatus === 'faturado' && getDeliveryStatus(order) !== 'faturado') {
      // Mark as "PRONTA ENTREGA" to move to faturado
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('orders').update({ order_type: 'PRONTA ENTREGA' }).eq('id', orderId);
      order.orderType = 'PRONTA ENTREGA';
      toast.success('Pedido marcado como faturado');
    }
  };

  const overdueCount = useMemo(() => filteredOrders.filter(o => getDeliveryStatus(o) === 'atrasado').length, [filteredOrders]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido, cliente, produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Todos os representantes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os representantes</SelectItem>
            {REPRESENTATIVES.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredOrders.length} pedido(s)</span>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Bell className="h-3 w-3" /> {overdueCount} atrasado(s)
          </Badge>
        )}
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
                  <span className="ml-auto text-xs font-bold bg-background/50 rounded-full px-2 py-0.5">
                    {columnOrders.length}
                  </span>
                </div>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[200px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-muted/20'
                      }`}
                    >
                      {columnOrders.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Nenhum pedido</p>
                      ) : (
                        columnOrders.map((order, index) => (
                          <Draggable key={order.id} draggableId={order.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <Card
                                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                  }`}
                                  onClick={() => handleOpenCard(order)}
                                >
                                  <CardContent className="p-3 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-primary">
                                        #{order.orderNumber || '—'}
                                      </span>
                                      {(order as any).rescheduleDate && (
                                        <Badge variant="outline" className="text-[10px] px-1">
                                          Reprog.
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium truncate">{order.clientName}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      <Package className="inline h-3 w-3 mr-1" />
                                      {order.product || '—'}
                                    </p>
                                    {order.oc && (
                                      <p className="text-xs text-muted-foreground">OC: {order.oc}</p>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>Entrega: {formatDate((order as any).rescheduleDate || order.deliveryDate)}</span>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pedido #{selectedOrder?.orderNumber || '—'}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedOrder.clientName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Produto</Label>
                  <p className="font-medium">{selectedOrder.product || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">OC</Label>
                  <p className="font-medium">{selectedOrder.oc || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{selectedOrder.orderType}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Entrega Original</Label>
                  <p className="font-medium">{formatDate(selectedOrder.deliveryDate)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <p className="font-medium">{selectedOrder.quantity}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="reschedule">Reprogramação</Label>
                <Input
                  id="reschedule"
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Defina uma nova data caso o embarque tenha sido reprogramado
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(null)}>
                  Fechar
                </Button>
                <Button className="flex-1" onClick={handleSaveReschedule}>
                  Salvar Reprogramação
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
