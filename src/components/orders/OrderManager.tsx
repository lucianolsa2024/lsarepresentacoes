import { useState, useMemo } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useClients } from '@/hooks/useClients';
import { useActivities } from '@/hooks/useActivities';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { OrderList } from './OrderList';
import { OrderForm } from './OrderForm';
import { OrderImporter } from './OrderImporter';
import { OrderCsvImporter } from './OrderCsvImporter';
import { OrderPasteImporter } from './OrderPasteImporter';
import { OrderPdfImporter } from './OrderPdfImporter';
import { FaturadosImporter } from './FaturadosImporter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { List, Plus, Upload, FileText, FileSpreadsheet, ClipboardPaste, Trash2, Receipt } from 'lucide-react';
import { OrderFormData } from '@/types/order';

export function OrderManager() {
  const { orders, loading, addOrder, addOrders, updateOrder, deleteOrder, deleteAllOrders, updateOrderNf } = useOrders();
  const { clients, addClient } = useClients();
  const { addActivity, activities } = useActivities();
  const isAdmin = useIsAdmin();
  const [activeTab, setActiveTab] = useState('list');

  // Build a set of existing order keys for deduplication
  const existingOrderKeys = useMemo(() => {
    const keys = new Set<string>();
    orders.forEach(o => {
      if (o.orderNumber) {
        keys.add(`${o.clientName.toLowerCase().trim()}::${o.orderNumber.trim()}`);
      }
    });
    return keys;
  }, [orders]);

  const createDeliveryActivity = async (order: { clientName: string; deliveryDate?: string | null; product?: string; orderNumber?: string; id?: string }, clientId?: string | null) => {
    if (!order.deliveryDate) return;
    // Check if activity already exists for this order
    const exists = activities.find(a =>
      a.title.includes(order.orderNumber || '') && a.type === 'tarefa' && a.title.includes('Entrega')
    );
    if (exists) return;

    await addActivity({
      type: 'tarefa',
      title: `Entrega pedido ${order.orderNumber ? `#${order.orderNumber}` : ''} - ${order.clientName}`,
      description: `Acompanhamento de entrega${order.product ? ` do produto: ${order.product}` : ''}`,
      due_date: order.deliveryDate,
      priority: 'media',
      client_id: clientId || undefined,
      assigned_to_email: 'posicao@lsarepresentacoes.com.br',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Gestão de Pedidos</h2>
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Base
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar toda a base de pedidos?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação excluirá TODOS os {orders.length} pedidos permanentemente. Não é possível desfazer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAllOrders} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir Todos
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="new">
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </TabsTrigger>
          <TabsTrigger value="import">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </TabsTrigger>
          <TabsTrigger value="csv">
            <Upload className="h-4 w-4 mr-2" />
            CSV
          </TabsTrigger>
          <TabsTrigger value="paste">
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Colar
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </TabsTrigger>
          <TabsTrigger value="faturados">
            <Receipt className="h-4 w-4 mr-2" />
            Faturados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <OrderList
            orders={orders}
            loading={loading}
            onDelete={deleteOrder}
            onUpdate={updateOrder}
            onUpdateNf={updateOrderNf}
            clients={clients}
          />
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <OrderForm
            clients={clients}
            onSave={async (order, clientId) => {
              const result = await addOrder(order, clientId);
              if (result) {
                await createDeliveryActivity({ ...order, id: result.id, orderNumber: order.orderNumber }, clientId);
                setActiveTab('list');
              }
            }}
            onAddClient={addClient}
          />
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <OrderImporter
            clients={clients}
            existingOrderKeys={existingOrderKeys}
            onImport={async (ordersData) => {
              const count = await addOrders(ordersData);
              for (const d of ordersData) {
                if (d.order.deliveryDate) {
                  await createDeliveryActivity({ ...d.order }, d.clientId);
                }
              }
              return count;
            }}
            onAddClient={addClient}
            onComplete={() => setActiveTab('list')}
          />
        </TabsContent>

        <TabsContent value="csv" className="mt-4">
          <OrderCsvImporter
            clients={clients}
            onImport={async (ordersData) => {
              const count = await addOrders(ordersData);
              for (const d of ordersData) {
                if (d.order.deliveryDate) {
                  await createDeliveryActivity({ ...d.order }, d.clientId);
                }
              }
              return count;
            }}
            onAddClient={addClient}
            onComplete={() => setActiveTab('list')}
          />
        </TabsContent>

        <TabsContent value="paste" className="mt-4">
          <OrderPasteImporter
            clients={clients}
            existingOrderKeys={existingOrderKeys}
            onImport={async (ordersData) => {
              const count = await addOrders(ordersData);
              for (const d of ordersData) {
                if (d.order.deliveryDate) {
                  await createDeliveryActivity({ ...d.order }, d.clientId);
                }
              }
              return count;
            }}
            onAddClient={addClient}
            onComplete={() => setActiveTab('list')}
          />
        </TabsContent>

        <TabsContent value="pdf" className="mt-4">
          <OrderPdfImporter
            clients={clients}
            onImport={async (ordersData) => {
              const count = await addOrders(ordersData);
              for (const d of ordersData) {
                if (d.order.deliveryDate) {
                  await createDeliveryActivity({ ...d.order }, d.clientId);
                }
              }
              return count;
            }}
            onAddClient={addClient}
            onComplete={() => setActiveTab('list')}
          />
        </TabsContent>

        <TabsContent value="faturados" className="mt-4">
          <FaturadosImporter onComplete={() => setActiveTab('list')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
