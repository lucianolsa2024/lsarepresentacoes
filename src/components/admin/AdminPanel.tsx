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
import { AnalysisPanel } from './AnalysisPanel';
import { BarChart3, Target, Users, UserCheck, TrendingUp, Store, Crosshair, Percent, Grid3X3, ShoppingCart, Eye, LineChart } from 'lucide-react';

interface AdminPanelProps {
  isAdmin?: boolean;
}

export function AdminPanel({ isAdmin = true }: AdminPanelProps) {
  const defaultTab = isAdmin ? 'sales-report' : 'positivacao';

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-4 w-full justify-start overflow-x-auto flex-nowrap h-auto">
        {isAdmin && (
          <TabsTrigger value="sales-report" className="text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Relatório de Vendas
          </TabsTrigger>
        )}
        {isAdmin && (
          <TabsTrigger value="goals" className="text-xs">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Metas
          </TabsTrigger>
        )}
        {isAdmin && (
          <TabsTrigger value="okrs" className="text-xs">
            <Crosshair className="h-3.5 w-3.5 mr-1.5" />
            OKRs
          </TabsTrigger>
        )}
        {isAdmin && (
          <TabsTrigger value="users" className="text-xs">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Usuários
          </TabsTrigger>
        )}
        <TabsTrigger value="positivacao" className="text-xs">
          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
          Positivação
        </TabsTrigger>
        <TabsTrigger value="share-loja" className="text-xs">
          <Store className="h-3.5 w-3.5 mr-1.5" />
          Share de Loja
        </TabsTrigger>
        <TabsTrigger value="curva" className="text-xs">
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          Curva de Clientes
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="comissionamento" className="text-xs">
            <Percent className="h-3.5 w-3.5 mr-1.5" />
            Comissionamento
          </TabsTrigger>
        )}
        <TabsTrigger value="mix-analysis" className="text-xs">
          <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
          Análise de Mix
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="sell-out" className="text-xs">
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            Sell-out
          </TabsTrigger>
        )}
        <TabsTrigger value="showroom" className="text-xs">
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Showroom
        </TabsTrigger>
        <TabsTrigger value="analises" className="text-xs">
          <LineChart className="h-3.5 w-3.5 mr-1.5" />
          Análises
        </TabsTrigger>
      </TabsList>

      {isAdmin && (
        <TabsContent value="sales-report" className="mt-0">
          <SalesReport />
        </TabsContent>
      )}
      {isAdmin && (
        <TabsContent value="goals" className="mt-0">
          <GoalManager />
        </TabsContent>
      )}
      {isAdmin && (
        <TabsContent value="okrs" className="mt-0">
          <OkrManager />
        </TabsContent>
      )}
      {isAdmin && (
        <TabsContent value="users" className="mt-0">
          <UserManager />
        </TabsContent>
      )}
      <TabsContent value="positivacao" className="mt-0">
        <PositivacaoReport />
      </TabsContent>
      <TabsContent value="share-loja" className="mt-0">
        <ShareLojaReport />
      </TabsContent>
      <TabsContent value="curva" className="mt-0">
        <ClientCurveReport />
      </TabsContent>
      {isAdmin && (
        <TabsContent value="comissionamento" className="mt-0">
          <CommissionManager />
        </TabsContent>
      )}
      <TabsContent value="mix-analysis" className="mt-0">
        <MixAnalysis />
      </TabsContent>
      {isAdmin && (
        <TabsContent value="sell-out" className="mt-0">
          <SellOutTracker />
        </TabsContent>
      )}
      <TabsContent value="showroom" className="mt-0">
        <ShowroomTracker />
      </TabsContent>
      <TabsContent value="analises" className="mt-0">
        <AnalysisPanel />
      </TabsContent>
    </Tabs>
  );
}
