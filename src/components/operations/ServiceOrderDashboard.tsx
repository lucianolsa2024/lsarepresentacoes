import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, Package, Truck, AlertCircle } from 'lucide-react';
import { SERVICE_ORDER_STATUSES, getStatusColor } from '@/types/serviceOrder';
import type { ServiceOrder } from '@/types/serviceOrder';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  orders: ServiceOrder[];
  clients: { id: string; company: string }[];
  onOrderClick?: (order: ServiceOrder) => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'Aguardando': <Clock className="h-4 w-4" />,
  'Em andamento': <AlertCircle className="h-4 w-4" />,
  'Aguardando peças': <Package className="h-4 w-4" />,
  'Concluído': <CheckCircle className="h-4 w-4" />,
  'Entregue': <Truck className="h-4 w-4" />,
};

export function ServiceOrderDashboard({ orders, clients, onOrderClick }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach(c => map.set(c.id, c.company));
    return map;
  }, [clients]);

  // Summary cards by status
  const statusSummary = useMemo(() => {
    return SERVICE_ORDER_STATUSES.map(status => {
      const filtered = orders.filter(o => o.status === status);
      const totalNet = filtered.reduce((sum, o) => sum + o.net_result, 0);
      return { status, count: filtered.length, totalNet };
    });
  }, [orders]);

  const totalNetResult = useMemo(() =>
    orders.reduce((sum, o) => sum + o.net_result, 0),
    [orders]
  );

  // Calendar logic
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const ordersByDate = useMemo(() => {
    const map = new Map<string, ServiceOrder[]>();
    orders.forEach(o => {
      if (o.delivery_forecast) {
        const key = o.delivery_forecast;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(o);
      }
    });
    return map;
  }, [orders]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statusSummary.map(({ status, count, totalNet }) => (
          <Card key={status} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                {STATUS_ICONS[status]}
                <span className="text-xs font-medium truncate">{status}</span>
              </div>
              <div className="text-2xl font-bold">{count}</div>
              <div className={cn('text-xs font-medium', totalNet >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatBRL(totalNet)}
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="overflow-hidden border-primary/30 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium">Total Geral</span>
            </div>
            <div className="text-2xl font-bold">{orders.length}</div>
            <div className={cn('text-xs font-bold', totalNetResult >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatBRL(totalNetResult)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Calendário de Entregas</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {/* Week headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-px bg-border">
            {calendarDays.map((day, i) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayOrders = ordersByDate.get(key) || [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[80px] sm:min-h-[100px] p-1 bg-card',
                    !inMonth && 'opacity-40',
                    today && 'ring-2 ring-primary ring-inset',
                  )}
                >
                  <div className="text-xs font-medium mb-0.5">{format(day, 'd')}</div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayOrders.slice(0, 3).map(o => (
                      <div
                        key={o.id}
                        onClick={() => onOrderClick?.(o)}
                        className={cn(
                          'text-[10px] leading-tight p-0.5 rounded cursor-pointer hover:opacity-80 truncate',
                          getStatusColor(o.status),
                        )}
                        title={`${o.os_number} - ${o.product || '—'} | ${clientMap.get(o.client_id || '') || '—'} | ${o.service_types?.join(', ') || '—'} | ${formatBRL(o.net_result)}`}
                      >
                        <span className="font-semibold">{o.os_number}</span>
                        {' '}
                        <span>{o.product || '—'}</span>
                        <div className="truncate">
                          {clientMap.get(o.client_id || '') || '—'} · {formatBRL(o.net_result)}
                        </div>
                        {o.service_types?.length > 0 && (
                          <div className="truncate text-[9px] opacity-75">
                            {o.service_types.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                    {dayOrders.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{dayOrders.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
