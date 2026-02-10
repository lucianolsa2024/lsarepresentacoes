import { useState } from 'react';
import { OrderManager } from '@/components/orders/OrderManager';
import { AssistanceManager } from './AssistanceManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Wrench } from 'lucide-react';

export function OperationManager() {
  const [tab, setTab] = useState('orders');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Operação</h2>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Acompanhamento de Pedidos
          </TabsTrigger>
          <TabsTrigger value="assistance">
            <Wrench className="h-4 w-4 mr-2" />
            Assistências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <OrderManager />
        </TabsContent>

        <TabsContent value="assistance" className="mt-4">
          <AssistanceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
