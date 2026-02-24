import { useState, useMemo } from 'react';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { useClients } from '@/hooks/useClients';
import { ServiceOrderForm } from './ServiceOrderForm';
import { ServiceOrderDetail } from './ServiceOrderDetail';
import { ServiceOrderDashboard } from './ServiceOrderDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, LayoutDashboard, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SERVICE_ORDER_STATUSES, getStatusColor } from '@/types/serviceOrder';
import type { ServiceOrder, ServiceOrderPhoto, ServiceOrderFormData } from '@/types/serviceOrder';

export function ServiceOrderManager() {
  const { orders, loading, createOrder, updateOrder, deleteOrder, fetchPhotos, uploadPhoto, deletePhoto, uploadSuppliesNf } = useServiceOrders();
  const { clients } = useClients();

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [photos, setPhotos] = useState<ServiceOrderPhoto[]>([]);
  const [subTab, setSubTab] = useState('dashboard');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (responsibleFilter !== 'all' && o.responsible_type !== responsibleFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const matches = [o.os_number, o.product, o.responsible_name, o.defect, ...(o.service_types || [])]
          .filter(Boolean).some(v => v!.toLowerCase().includes(s));
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, statusFilter, responsibleFilter, search]);

  const handleCreate = () => { setEditingOrder(null); setFormOpen(true); };
  const handleEdit = (o: ServiceOrder) => { setEditingOrder(o); setFormOpen(true); };

  const handleFormSubmit = async (data: ServiceOrderFormData) => {
    if (editingOrder) {
      await updateOrder(editingOrder.id, data, editingOrder);
    } else {
      await createOrder(data);
    }
  };

  const openDetail = async (o: ServiceOrder) => {
    setSelectedOrder(o);
    const p = await fetchPhotos(o.id);
    setPhotos(p);
    setDetailOpen(true);
  };

  const handleUploadPhoto = async (file: File, type: 'recebimento' | 'liberacao') => {
    if (!selectedOrder) return false;
    const ok = await uploadPhoto(selectedOrder.id, file, type);
    if (ok) {
      const p = await fetchPhotos(selectedOrder.id);
      setPhotos(p);
    }
    return ok;
  };

  const handleDeletePhoto = async (photoId: string) => {
    const ok = await deletePhoto(photoId);
    if (ok && selectedOrder) {
      const p = await fetchPhotos(selectedOrder.id);
      setPhotos(p);
    }
    return ok;
  };

  const handleUploadNf = async (file: File) => {
    if (!selectedOrder) return null;
    return uploadSuppliesNf(selectedOrder.id, file);
  };

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

  const clientList = clients.map(c => ({ id: c.id, company: c.company }));

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Ordens de Serviço</h2>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> Nova OS</Button>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Painel
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <ServiceOrderDashboard
            orders={orders}
            clients={clientList}
            onOrderClick={openDetail}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input placeholder="Buscar OS..." value={search} onChange={e => setSearch(e.target.value)} className="sm:max-w-xs" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {SERVICE_ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Fábrica">Fábrica</SelectItem>
                <SelectItem value="Consumidor">Consumidor</SelectItem>
                <SelectItem value="Lojista">Lojista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma OS encontrada</TableCell></TableRow>
                ) : filtered.map(o => (
                  <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(o)}>
                    <TableCell className="font-mono font-medium">{o.os_number}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(o.service_types || []).map(t => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                        {(!o.service_types || o.service_types.length === 0) && '—'}
                      </div>
                    </TableCell>
                    <TableCell>{o.product || '—'}</TableCell>
                    <TableCell>{o.responsible_type}</TableCell>
                    <TableCell><Badge className={getStatusColor(o.status)}>{o.status}</Badge></TableCell>
                    <TableCell>{formatDate(o.delivery_forecast)}</TableCell>
                    <TableCell className={cn('font-medium', o.net_result >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatBRL(o.net_result)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(o)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir OS?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteOrder(o.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma OS encontrada</p>
            ) : filtered.map(o => (
              <Card key={o.id} className="cursor-pointer" onClick={() => openDetail(o)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold">{o.os_number}</span>
                    <Badge className={getStatusColor(o.status)}>{o.status}</Badge>
                  </div>
                  {(o.service_types || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {o.service_types.map(t => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-sm">{o.product || '—'} — {o.responsible_type}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Previsão: {formatDate(o.delivery_forecast)}</span>
                    <span className={cn('font-medium', o.net_result >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatBRL(o.net_result)}
                    </span>
                  </div>
                  <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(o)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir OS?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteOrder(o.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Form dialog */}
      <ServiceOrderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        order={editingOrder}
        clients={clientList}
      />

      {/* Detail dialog */}
      <ServiceOrderDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        order={selectedOrder}
        photos={photos}
        onUploadPhoto={handleUploadPhoto}
        onDeletePhoto={handleDeletePhoto}
        onUploadNf={handleUploadNf}
      />
    </div>
  );
}
