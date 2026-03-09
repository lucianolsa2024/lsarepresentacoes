import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesReport } from './SalesReport';
import { GoalManager } from './GoalManager';
import { UserManager } from './UserManager';
import { PositivacaoReport } from './PositivacaoReport';
import { Order } from '@/types/order';
import { BarChart3, Target, Users, UserCheck } from 'lucide-react';

interface AdminPanelProps {
  orders: Order[];
}

export function AdminPanel({ orders }: AdminPanelProps) {
  return (
    <Tabs defaultValue="sales-report">
      <TabsList className="mb-4">
        <TabsTrigger value="sales-report">
          <BarChart3 className="h-4 w-4 mr-2" />
          Relatório de Vendas
        </TabsTrigger>
        <TabsTrigger value="goals">
          <Target className="h-4 w-4 mr-2" />
          Metas
        </TabsTrigger>
        <TabsTrigger value="users">
          <Users className="h-4 w-4 mr-2" />
          Usuários
        </TabsTrigger>
        <TabsTrigger value="positivacao">
          <UserCheck className="h-4 w-4 mr-2" />
          Positivação
        </TabsTrigger>
      </TabsList>

      <TabsContent value="sales-report" className="mt-0">
        <SalesReport orders={orders} />
      </TabsContent>
      <TabsContent value="goals" className="mt-0">
        <GoalManager />
      </TabsContent>
      <TabsContent value="users" className="mt-0">
        <UserManager />
      </TabsContent>
    </Tabs>
  );
}
