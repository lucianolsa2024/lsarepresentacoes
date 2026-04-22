import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Building2, Tags, Layers, Bell, Plug, Database, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompaniesSettings } from './settings/CompaniesSettings';
import { CategoriesSettings } from './settings/CategoriesSettings';
import { CostCentersSettings } from './settings/CostCentersSettings';
import { PreferencesSettings } from './settings/PreferencesSettings';
import { IntegrationsSettings } from './settings/IntegrationsSettings';
import { BackupSettings } from './settings/BackupSettings';
import { AuditLog } from './settings/AuditLog';

type Tab =
  | 'empresas'
  | 'categorias'
  | 'centros'
  | 'integracoes'
  | 'notificacoes'
  | 'backup'
  | 'auditoria';

const TABS: Array<{ id: Tab; label: string; icon: typeof Settings }> = [
  { id: 'empresas', label: 'Empresas', icon: Building2 },
  { id: 'categorias', label: 'Categorias', icon: Tags },
  { id: 'centros', label: 'Centros de Custo', icon: Layers },
  { id: 'integracoes', label: 'Integrações', icon: Plug },
  { id: 'notificacoes', label: 'Notificações & Usuário', icon: Bell },
  { id: 'backup', label: 'Backup', icon: Database },
  { id: 'auditoria', label: 'Auditoria', icon: ShieldCheck },
];

export function FinanceSettings() {
  const [tab, setTab] = useState<Tab>('empresas');

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <div className="-mx-1 overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
            <div className="flex gap-1 px-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="whitespace-nowrap">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {tab === 'empresas' && <CompaniesSettings />}
      {tab === 'categorias' && <CategoriesSettings />}
      {tab === 'centros' && <CostCentersSettings />}
      {tab === 'integracoes' && <IntegrationsSettings />}
      {tab === 'notificacoes' && <PreferencesSettings />}
      {tab === 'backup' && <BackupSettings />}
      {tab === 'auditoria' && <AuditLog />}
    </div>
  );
}
