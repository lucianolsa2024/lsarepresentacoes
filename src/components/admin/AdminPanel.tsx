import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesReport } from './SalesReport';
import { GoalManager } from './GoalManager';
import { OkrManager } from './OkrManager';
import { UserManager } from './UserManager';
import { PositivacaoReport } from './PositivacaoReport';
import { ClientCurveReport } from './ClientCurveReport';
import { ShareLojaReport } from './ShareLojaReport';
import { CommissionManager } from './CommissionManager';
import { MixAnalysis } from './MixAnalysis';
import { SellOutTracker } from './SellOutTracker';
import { ShowroomTracker } from './ShowroomTracker';
import { BarChart3, Target, Users, UserCheck, TrendingUp, Store, Crosshair, Percent, Grid3X3, ShoppingCart, Eye } from 'lucide-react';

export function AdminPanel() {
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
        <TabsTrigger value="okrs">
          <Crosshair className="h-4 w-4 mr-2" />
          OKRs
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
        <TabsTrigger value="comissionamento">
          <Percent className="h-4 w-4 mr-2" />
          Comissionamento
        </TabsTrigger>
        <TabsTrigger value="mix-analysis">
          <Grid3X3 className="h-4 w-4 mr-2" />
          Análise de Mix
        </TabsTrigger>
        <TabsTrigger value="sell-out">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Sell-out
        </TabsTrigger>
      </TabsList>

      <TabsContent value="sales-report" className="mt-0">
        <SalesReport />
      </TabsContent>
      <TabsContent value="goals" className="mt-0">
        <GoalManager />
      </TabsContent>
      <TabsContent value="okrs" className="mt-0">
        <OkrManager />
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
      <TabsContent value="comissionamento" className="mt-0">
        <CommissionManager />
      </TabsContent>
      <TabsContent value="mix-analysis" className="mt-0">
        <MixAnalysis />
      </TabsContent>
      <TabsContent value="sell-out" className="mt-0">
        <SellOutTracker />
      </TabsContent>
    </Tabs>
  );
}
