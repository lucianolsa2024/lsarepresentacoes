import { useState, useMemo, useCallback } from 'react';
import { Order, OrderFormData } from '@/types/order';
import { Client } from '@/hooks/useClients';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Trash2, Search, Loader2, FileDown, Package, Calendar, User, Hash, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  orders: Order[];
  loading: boolean;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, order: OrderFormData, clientId?: string | null) => Promise<boolean>;
  onUpdateNf: (id: string, nfNumber: string, nfPdfUrl: string | null, status: string) => Promise<boolean>;
  clients: Client[];
}

const ORDER_STATUSES = ['pendente', 'em_producao', 'faturado', 'entregue'] as const;
const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Produção',
  faturado: 'Faturado',
  entregue: 'Entregue',
};

export function OrderList({ orders, loading, onDelete, onUpdate, onUpdateNf, clients }: Props) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [repFilter, setRepFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [nfDialog, setNfDialog] = useState<Order | null>(null);
  const [nfNumber, setNfNumber] = useState('');
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [savingNf, setSavingNf] = useState(false);

  const handleDownloadPdf = useCallback(async (pdfPath: string) => {
    try {
      const { data, error } = await supabase.storage.from('pedidos').createSignedUrl(pdfPath, 300);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      toast.error('Erro ao gerar link do PDF');
    }
  }, []);

  const openNfDialog = (order: Order) => {
    setNfDialog(order);
    setNfNumber(order.nfNumber || '');
    setNfFile(null);
  };

  const handleSaveNf = async () => {
    if (!nfDialog) return;
    setSavingNf(true);
    try {
      let nfPdfUrl = nfDialog.nfPdfUrl;
      if (nfFile) {
        const ext = nfFile.name.split('.').pop();
        const path = `nf/${nfDialog.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('pedidos').upload(path, nfFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        nfPdfUrl = path;
      }
      await onUpdateNf(nfDialog.id, nfNumber, nfPdfUrl, 'faturado');
      setNfDialog(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar NF');
    } finally {
      setSavingNf(false);
    }
  };

  const handleStatusChange = async (order: Order, newStatus: string) => {
    if (newStatus === 'faturado') {
      openNfDialog(order);
    } else {
      await onUpdateNf(order.id, order.nfNumber || '', order.nfPdfUrl, newStatus);
    }
  };

  const uniqueClients = useMemo(() => [...new Set(orders.map(o => o.clientName))].sort(), [orders]);
  const uniqueReps = useMemo(() => [...new Set(orders.map(o => o.representative).filter(Boolean))].sort(), [orders]);

  const filtered = useMemo(() => {
    let result = orders;
    if (clientFilter !== 'all') result = result.filter(o => o.clientName === clientFilter);
    if (repFilter !== 'all') result = result.filter(o => o.representative === repFilter);
    if (dateFrom) result = result.filter(o => o.issueDate >= dateFrom);
    if (dateTo) result = result.filter(o => o.issueDate <= dateTo);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.clientName.toLowerCase().includes(q) || o.product.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) || o.oc.toLowerCase().includes(q) ||
        (o.nfNumber || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, search, clientFilter, repFilter, dateFrom, dateTo]);

  const totalValue = useMemo(() => filtered.reduce((s, o) => s + o.price, 0), [filtered]);
  const formatDate = (d: string | null) => { if (!d) return '-'; try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; } };
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar pedido, produto, OC, NF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-[250px]"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {uniqueClients.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Todos os representantes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os representantes</SelectItem>
            {uniqueReps.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">Emissão de</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 h-9" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">até</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 h-9" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Limpar datas</Button>
        )}
      </div>

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
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(order.issueDate)}</span>
                    <span>Entrega: {formatDate(order.deliveryDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Select value={order.status} onValueChange={(v) => handleStatusChange(order, v)}>
                        <SelectTrigger className="h-6 text-[10px] w-auto min-w-[90px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {order.nfNumber && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> NF: {order.nfNumber}
                        </span>
                      )}
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
                <TableHead>Entrega</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado</TableCell>
                </TableRow>
              ) : (
                filtered.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(order.issueDate)}</TableCell>
                    <TableCell className="font-medium">{order.clientName}</TableCell>
                    <TableCell>
                      {order.supplier ? <Badge variant="secondary" className="text-xs">{order.supplier}</Badge> : '-'}
                    </TableCell>
                    <TableCell>{order.orderNumber || '-'}</TableCell>
                    <TableCell>{order.oc || '-'}</TableCell>
                    <TableCell>{order.product}</TableCell>
                    <TableCell>{order.fabric || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(order.deliveryDate)}</TableCell>
                    <TableCell className="text-right">{order.quantity}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(order.price)}</TableCell>
                    <TableCell>
                      <Select value={order.status} onValueChange={(v) => handleStatusChange(order, v)}>
                        <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {order.nfNumber ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{order.nfNumber}</span>
                          {order.nfPdfUrl && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadPdf(order.nfPdfUrl!)}>
                              <FileText className="h-3 w-3 text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openNfDialog(order)}>
                            <Hash className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => openNfDialog(order)}>
                          + NF
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.pdfUrl ? (
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(order.pdfUrl!)}>
                          <FileDown className="h-4 w-4 text-primary" />
                        </Button>
                      ) : '-'}
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

      {/* NF Dialog */}
      <Dialog open={!!nfDialog} onOpenChange={(open) => !open && setNfDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota Fiscal - Pedido {nfDialog?.orderNumber || ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Número da NF</Label>
              <Input value={nfNumber} onChange={e => setNfNumber(e.target.value)} placeholder="Ex: 12345" />
            </div>
            <div>
              <Label>PDF da NF</Label>
              <div className="mt-1">
                <Input type="file" accept=".pdf" onChange={e => setNfFile(e.target.files?.[0] || null)} />
              </div>
              {nfDialog?.nfPdfUrl && !nfFile && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> PDF já anexado
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleDownloadPdf(nfDialog.nfPdfUrl!)}>
                    Visualizar
                  </Button>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNfDialog(null)}>Cancelar</Button>
            <Button onClick={handleSaveNf} disabled={savingNf || !nfNumber.trim()}>
              {savingNf ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
