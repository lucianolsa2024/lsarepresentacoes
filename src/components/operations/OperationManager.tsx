import { useState } from 'react';
import { OrderManager } from '@/components/orders/OrderManager';
import { OrderDeliveryKanban } from '@/components/orders/OrderDeliveryKanban';
import { AssistanceManager } from './AssistanceManager';
import { ServiceOrderManager } from './ServiceOrderManager';
import { useOrders } from '@/hooks/useOrders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Wrench, Kanban, ClipboardList } from 'lucide-react';

export function OperationManager() {
  const [tab, setTab] = useState('kanban');
  const { orders, updateOrder } = useOrders();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Operação</h2>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="kanban">
            <Kanban className="h-4 w-4 mr-2" />
            Acompanhamento de Entregas
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="service-orders">
            <ClipboardList className="h-4 w-4 mr-2" />
            Ordens de Serviço
          </TabsTrigger>
          <TabsTrigger value="assistance">
            <Wrench className="h-4 w-4 mr-2" />
            Assistências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <OrderDeliveryKanban orders={orders} onUpdate={updateOrder} />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <OrderManager />
        </TabsContent>

        <TabsContent value="service-orders" className="mt-4">
          <ServiceOrderManager />
        </TabsContent>

        <TabsContent value="assistance" className="mt-4">
          <AssistanceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
