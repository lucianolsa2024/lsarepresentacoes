import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesReport } from './SalesReport';
import { GoalManager } from './GoalManager';
import { UserManager } from './UserManager';
import { PositivacaoReport } from './PositivacaoReport';
import { ClientCurveReport } from './ClientCurveReport';
import { ShareLojaReport } from './ShareLojaReport';
import { Order } from '@/types/order';
import { BarChart3, Target, Users, UserCheck, TrendingUp, Store } from 'lucide-react';

interface AdminPanelProps {
  orders: Order[];
}

export function AdminPanel({ orders }: AdminPanelProps) {
  return (
    <Tabs defaultValue="sales-report">
      <TabsList className="mb-4 flex-wrap">
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
        <TabsTrigger value="share-loja">
          <Store className="h-4 w-4 mr-2" />
          Share de Loja
        </TabsTrigger>
        <TabsTrigger value="curva">
          <TrendingUp className="h-4 w-4 mr-2" />
          Curva de Clientes
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
      <TabsContent value="positivacao" className="mt-0">
        <PositivacaoReport />
      </TabsContent>
      <TabsContent value="share-loja" className="mt-0">
        <ShareLojaReport />
      </TabsContent>
      <TabsContent value="curva" className="mt-0">
        <ClientCurveReport />
      </TabsContent>
    </Tabs>
  );
}
