import { useState } from 'react';
import {
  Lock,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  GitCompareArrows,
  FileBarChart,
  TrendingUp,
  Upload,
  Landmark,
  Settings,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { canAccessFinanceiroLSA, FINANCEIRO_LSA_ALLOWED_EMAIL } from '@/lib/access';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FinanceDashboard } from './FinanceDashboard';
import { EntriesManager } from './EntriesManager';
import { DocumentUpload } from './DocumentUpload';
import { BankReconciliation } from './BankReconciliation';
import { DreReport } from './DreReport';
import { CashflowProjection } from './CashflowProjection';
import { FinanceSettings } from './FinanceSettings';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { CashEntriesManager } from './CashEntriesManager';

type Section =
  | 'dashboard'
  | 'executivo'
  | 'pagar'
  | 'receber'
  | 'caixa'
  | 'conciliacao'
  | 'dre'
  | 'fluxo'
  | 'upload'
  | 'config';

const NAV: Array<{ id: Section; label: string; icon: typeof LayoutDashboard; description: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Visão consolidada do financeiro.' },
  { id: 'executivo', label: 'Executivo (IA)', icon: Sparkles, description: 'KPIs, insights de IA e relatório executivo.' },
  { id: 'pagar', label: 'Contas a Pagar', icon: ArrowDownCircle, description: 'Gestão de despesas, vencimentos e baixas.' },
  { id: 'receber', label: 'Contas a Receber', icon: ArrowUpCircle, description: 'Acompanhamento de recebíveis e cobranças.' },
  { id: 'caixa', label: 'Caixa', icon: Wallet, description: 'Lançamentos rápidos de entrada e saída de dinheiro.' },
  { id: 'conciliacao', label: 'Conciliação', icon: GitCompareArrows, description: 'Conciliação bancária e cartões.' },
  { id: 'dre', label: 'DRE', icon: FileBarChart, description: 'Demonstrativo de Resultado do Exercício.' },
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: TrendingUp, description: 'Projeção e realizado de caixa por período.' },
  { id: 'upload', label: 'Upload de Documentos', icon: Upload, description: 'Notas fiscais, boletos e extratos.' },
  { id: 'config', label: 'Configurações', icon: Settings, description: 'Empresas, categorias, integrações e auditoria.' },
];

export function FinanceiroLSA() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const hasAccess = canAccessFinanceiroLSA(user?.email, isAdmin);
  const [section, setSection] = useState<Section>('dashboard');

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="max-w-2xl space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Acesso restrito</p>
            <h1 className="text-2xl font-bold text-foreground">Área exclusiva do administrador principal</h1>
            <p className="text-sm text-muted-foreground">
              Esta página fica disponível somente para o usuário autorizado da LSA.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const current = NAV.find((n) => n.id === section)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Workspace privado</p>
                <h1 className="text-xl font-bold text-foreground">Área LSA — Financeiro</h1>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
              Autorizado: <span className="font-semibold">{FINANCEIRO_LSA_ALLOWED_EMAIL}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout: sidebar (desktop) + content */}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === section;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSection(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Mobile horizontal nav */}
        <div className="lg:hidden -mx-1 overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
          <div className="flex gap-2 px-1 pb-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.id === section;
              return (
                <Button
                  key={item.id}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => setSection(item.id)}
                  className="shrink-0 gap-1.5"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <section className="min-w-0 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <current.icon className="h-4 w-4" />
            <span className="font-medium text-foreground">{current.label}</span>
            <span>·</span>
            <span>{current.description}</span>
          </div>

          {section === 'dashboard' && <FinanceDashboard onNavigate={(s) => setSection(s as Section)} />}
          {section === 'executivo' && <ExecutiveDashboard />}
          {section === 'pagar' && <EntriesManager entryType="a_pagar" />}
          {section === 'receber' && <EntriesManager entryType="a_receber" />}
          {section === 'conciliacao' && <BankReconciliation />}
          {section === 'dre' && <DreReport />}
          {section === 'fluxo' && <CashflowProjection />}
          {section === 'upload' && <DocumentUpload />}
          {section === 'config' && <FinanceSettings />}
        </section>
      </div>
    </div>
  );
}
