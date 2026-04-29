import { useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  TrendingUp,
  Wrench,
  Settings,
  Package,
  ShieldCheck,
  Landmark,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { canAccessFinanceiroLSA } from '@/lib/access';

interface NavItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isRep: boolean | null;
  isAdmin: boolean | null;
  isAssistencia?: boolean;
}

export function MobileBottomNav({ activeTab, onTabChange, isRep, isAdmin, isAssistencia }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const { user } = useAuth();
  const showFinanceiro = !isAssistencia && canAccessFinanceiroLSA(user?.email, isAdmin);

  const allItems: NavItem[] = isAssistencia
    ? [
        { value: 'activities', label: 'Atividades', icon: <ClipboardList className="h-5 w-5" /> },
        { value: 'service-orders', label: 'Ordens', icon: <Wrench className="h-5 w-5" /> },
      ]
    : [
    { value: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    ...(isRep !== false ? [{ value: 'comercial', label: 'Comercial', icon: <Briefcase className="h-5 w-5" /> }] : []),
    { value: 'activities', label: 'Atividades', icon: <ClipboardList className="h-5 w-5" /> },
    { value: 'funnels', label: 'Funis', icon: <TrendingUp className="h-5 w-5" /> },
    { value: 'service-orders', label: 'Ordens', icon: <Wrench className="h-5 w-5" /> },
    { value: 'operations', label: 'Operação', icon: <Settings className="h-5 w-5" /> },
    { value: 'products', label: 'Produtos', icon: <Package className="h-5 w-5" /> },
    ...(isAdmin ? [{ value: 'admin', label: 'Admin', icon: <ShieldCheck className="h-5 w-5" /> }] : []),
    ...(showFinanceiro ? [{ value: 'financeiro', label: 'Financeiro', icon: <Landmark className="h-5 w-5" /> }] : []),
  ];

  // Show first 4 items in the bar, rest in "More" menu
  const primaryItems = allItems.slice(0, 4);
  const moreItems = allItems.slice(4);

  const isActiveInMore = moreItems.some((item) => item.value === activeTab);

  return (
    <>
      {/* "More" overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-[99] bg-black/40" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+4rem)] left-2 right-2 bg-card rounded-xl shadow-2xl p-3 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-sm font-semibold text-foreground">Mais opções</span>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-full hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {moreItems.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  onTabChange(item.value);
                  setMoreOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === item.value
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-card border-t border-border md:hidden pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-stretch justify-around h-16">
          {primaryItems.map((item) => (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] transition-colors ${
                activeTab === item.value
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {moreItems.length > 0 && (
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] transition-colors ${
                isActiveInMore || moreOpen
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              <MoreHorizontal className="h-5 w-5" />
              Mais
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
