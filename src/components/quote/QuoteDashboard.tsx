import { Quote } from '@/types/quote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, Calendar, Package } from 'lucide-react';

interface QuoteDashboardProps {
  quotes: Quote[];
}

export function QuoteDashboard({ quotes }: QuoteDashboardProps) {
  // Calculate statistics
  const totalQuotes = quotes.length;
  
  const totalRevenue = quotes.reduce((acc, quote) => acc + quote.total, 0);
  
  const averageTicket = totalQuotes > 0 ? totalRevenue / totalQuotes : 0;
  
  // Get quotes from current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const quotesThisMonth = quotes.filter((quote) => {
    const quoteDate = new Date(quote.createdAt);
    return quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear;
  });
  
  // Get total items across all quotes
  const totalItems = quotes.reduce((acc, quote) => acc + quote.items.length, 0);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Orçamentos</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalQuotes}</div>
          <p className="text-xs text-muted-foreground">
            {quotesThisMonth.length} este mês
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            Soma de todos os orçamentos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(averageTicket)}</div>
          <p className="text-xs text-muted-foreground">
            Por orçamento
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalItems}</div>
          <p className="text-xs text-muted-foreground">
            Em todos os orçamentos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
