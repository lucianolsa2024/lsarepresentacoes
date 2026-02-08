import { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useClients } from '@/hooks/useClients';
import { OrderList } from './OrderList';
import { OrderForm } from './OrderForm';
import { OrderImporter } from './OrderImporter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, Plus, Upload } from 'lucide-react';

export function OrderManager() {
  const { orders, loading, addOrder, addOrders, updateOrder, deleteOrder } = useOrders();
  const { clients, addClient } = useClients();
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Gestão de Pedidos</h2>

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
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <OrderList
            orders={orders}
            loading={loading}
            onDelete={deleteOrder}
            onUpdate={updateOrder}
            clients={clients}
          />
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <OrderForm
            clients={clients}
            onSave={async (order, clientId) => {
              const result = await addOrder(order, clientId);
              if (result) setActiveTab('list');
            }}
            onAddClient={addClient}
          />
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <OrderImporter
            clients={clients}
            onImport={addOrders}
            onAddClient={addClient}
            onComplete={() => setActiveTab('list')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
