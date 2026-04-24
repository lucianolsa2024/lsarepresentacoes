import { useState, useMemo } from 'react';
import { Quote } from '@/types/quote';
import { Activity } from '@/types/activity';
import { Order } from '@/types/order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, TrendingUp, Calendar, Package, ShoppingCart } from 'lucide-react';
import { ActivityWidget } from '@/components/activities/ActivityWidget';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface QuoteDashboardProps {
  quotes: Quote[];
  activities?: Activity[];
  orders?: Order[];
  onViewActivities?: () => void;
}

export function QuoteDashboard({ quotes, activities = [], orders = [], onViewActivities }: QuoteDashboardProps) {
  const [orderStartDate, setOrderStartDate] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [orderEndDate, setOrderEndDate] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );

  const totalQuotes = quotes.length;
  const totalRevenue = quotes.reduce((acc, quote) => acc + quote.total, 0);
  const averageTicket = totalQuotes > 0 ? totalRevenue / totalQuotes : 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const quotesThisMonth = quotes.filter((quote) => {
    const quoteDate = new Date(quote.createdAt);
    return quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear;
  });

  const totalItems = quotes.reduce((acc, quote) => acc + quote.items.length, 0);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o.issueDate) return false;
      return o.issueDate >= orderStartDate && o.issueDate <= orderEndDate;
    });
  }, [orders, orderStartDate, orderEndDate]);

  const orderStats = useMemo(() => {
    const total = filteredOrders.length;
    const totalValue = filteredOrders.reduce((s, o) => s + (o.price || 0), 0);
    const totalQty = filteredOrders.reduce((s, o) => s + (o.quantity || 0), 0);
    const uniqueClients = new Set(filteredOrders.map(o => o.clientName)).size;
    return { total, totalValue, totalQty, uniqueClients };
  }, [filteredOrders]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Orçamentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-lg sm:text-2xl font-bold">{totalQuotes}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{quotesThisMonth.length} este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-base sm:text-2xl font-bold truncate">{formatCurrency(totalRevenue)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Soma de todos os orçamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Ticket Médio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-base sm:text-2xl font-bold truncate">{formatCurrency(averageTicket)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Por orçamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-lg sm:text-2xl font-bold">{totalItems}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Em todos os orçamentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Pedidos
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs">De:</Label>
                <Input
                  type="date"
                  value={orderStartDate}
                  onChange={e => setOrderStartDate(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">Até:</Label>
                <Input
                  type="date"
                  value={orderEndDate}
                  onChange={e => setOrderEndDate(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
              <p className="text-lg sm:text-2xl font-bold">{orderStats.total}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Pedidos</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
              <p className="text-sm sm:text-2xl font-bold truncate">{formatCurrency(orderStats.totalValue)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Valor Total</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
              <p className="text-lg sm:text-2xl font-bold">{orderStats.totalQty}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Peças</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
              <p className="text-lg sm:text-2xl font-bold">{orderStats.uniqueClients}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Clientes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Widget */}
      {activities.length >= 0 && onViewActivities && (
        <ActivityWidget
          activities={activities}
          onViewAll={onViewActivities}
        />
      )}
    </div>
  );
}
