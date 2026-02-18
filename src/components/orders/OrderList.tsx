import { useState, useMemo, useCallback } from 'react';
import { Order, OrderFormData } from '@/types/order';
import { Client } from '@/hooks/useClients';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Search, Loader2, FileDown, Package, Calendar, User, Hash } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  orders: Order[];
  loading: boolean;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, order: OrderFormData, clientId?: string | null) => Promise<boolean>;
  clients: Client[];
}

export function OrderList({ orders, loading, onDelete, clients }: Props) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [repFilter, setRepFilter] = useState('all');

  const handleDownloadPdf = useCallback(async (pdfPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('pedidos')
        .createSignedUrl(pdfPath, 300);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      toast.error('Erro ao gerar link do PDF');
    }
  }, []);

  const uniqueClients = useMemo(() => {
    const names = [...new Set(orders.map(o => o.clientName))].sort();
    return names;
  }, [orders]);

  const uniqueReps = useMemo(() => {
    const names = [...new Set(orders.map(o => o.representative).filter(Boolean))].sort();
    return names;
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders;
    if (clientFilter !== 'all') {
      result = result.filter(o => o.clientName === clientFilter);
    }
    if (repFilter !== 'all') {
      result = result.filter(o => o.representative === repFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.clientName.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.oc.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, search, clientFilter, repFilter]);

  const totalValue = useMemo(() => filtered.reduce((s, o) => s + o.price, 0), [filtered]);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido, produto, OC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {uniqueClients.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Todos os representantes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os representantes</SelectItem>
            {uniqueReps.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} pedido(s)</span>
        <span>Total: <strong className="text-foreground">{formatCurrency(totalValue)}</strong></span>
      </div>

      {/* Mobile Cards */}
      {isMobile ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado</p>
          ) : (
            filtered.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3 w-3 text-primary" />
                      <span className="text-xs font-bold text-primary">{order.orderNumber || '—'}</span>
                      {order.oc && <span className="text-xs text-muted-foreground">OC: {order.oc}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {order.pdfUrl && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPdf(order.pdfUrl!)}>
                          <FileDown className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(order.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{order.clientName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs truncate">{order.product || '—'}</span>
                    {order.supplier && <Badge variant="secondary" className="text-[10px]">{order.supplier}</Badge>}
                    {order.fabric && <span className="text-xs text-muted-foreground">• {order.fabric}</span>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(order.issueDate)}
                    </span>
                    <span>Entrega: {formatDate(order.deliveryDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{order.orderType}</Badge>
                      <span className="text-xs text-muted-foreground">Qtd: {order.quantity}</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatCurrency(order.price)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Desktop Table */
        <div className="border rounded-lg overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>OC</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tecido</TableHead>
                <TableHead>Dimensão</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(order.issueDate)}</TableCell>
                    <TableCell className="font-medium">{order.clientName}</TableCell>
                    <TableCell>
                      {order.supplier ? (
                        <Badge variant="secondary" className="text-xs">{order.supplier}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{order.orderNumber || '-'}</TableCell>
                    <TableCell>{order.oc || '-'}</TableCell>
                    <TableCell>{order.product}</TableCell>
                    <TableCell>{order.fabric || '-'}</TableCell>
                    <TableCell>{order.dimensions || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(order.deliveryDate)}</TableCell>
                    <TableCell className="text-right">{order.quantity}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(order.price)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.orderType}</Badge>
                    </TableCell>
                    <TableCell>{order.paymentTerms || '-'}</TableCell>
                    <TableCell>
                      {order.pdfUrl ? (
                        <Button variant="ghost" size="icon" title="Baixar PDF" onClick={() => handleDownloadPdf(order.pdfUrl!)}>
                          <FileDown className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(order.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
