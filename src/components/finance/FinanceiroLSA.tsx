import { ShieldCheck, TrendingUp, Landmark, Target, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { canAccessFinanceiroLSA, FINANCEIRO_LSA_ALLOWED_EMAIL } from '@/lib/access';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const highlights = [
  {
    title: 'Governança prioritária',
    description: 'Espaço reservado para indicadores, aprovações críticas e decisões estratégicas da operação.',
    icon: ShieldCheck,
  },
  {
    title: 'Monitoramento executivo',
    description: 'Centralize projeções, desvios e alertas que não devem ficar visíveis para outros perfis.',
    icon: TrendingUp,
  },
  {
    title: 'Controles dedicados',
    description: 'Prepare aqui os componentes e relatórios exclusivos do financeiro da LSA.',
    icon: Landmark,
  },
] as const;

export function FinanceiroLSA() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const hasAccess = canAccessFinanceiroLSA(user?.email, isAdmin);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Workspace privado</p>
              <h1 className="text-3xl font-bold text-foreground">Área LSA — Financeiro</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Ambiente reservado para o administrador principal concentrar materiais
                estratégicos e relatórios financeiros confidenciais.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
              Usuário autorizado: <span className="font-semibold">{FINANCEIRO_LSA_ALLOWED_EMAIL}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Próximos módulos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Estrutura inicial pronta para receber os componentes do financeiro.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-medium text-foreground">Contas a Pagar / Receber</p>
              <p className="mt-1">Cadastro, vencimentos e baixas com conciliação bancária.</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-medium text-foreground">DRE & Fluxo de Caixa</p>
              <p className="mt-1">Demonstrativo de resultado e projeção de caixa por período.</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-medium text-foreground">Dashboard Executivo (IA)</p>
              <p className="mt-1">Indicadores estratégicos e alertas inteligentes.</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-medium text-foreground">Upload de Documentos</p>
              <p className="mt-1">Notas, boletos e extratos centralizados.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
