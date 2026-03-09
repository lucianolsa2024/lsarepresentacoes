import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Store, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PRODUCT_CATEGORIES } from '@/types/storeChecklist';

const getShareColor = (share: number) => {
  if (share >= 50) return 'bg-green-600 text-white hover:bg-green-600';
  if (share >= 20) return 'bg-yellow-500 text-white hover:bg-yellow-500';
  return 'bg-red-600 text-white hover:bg-red-600';
};

interface CategoryShare {
  label: string;
  nossos: number;
  concorrentes: number;
  share: number;
}

interface ShareEntry {
  clientName: string;
  share: number;
  date: string;
  categories: CategoryShare[];
}

export function RepShareWidget() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ShareEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('activities')
        .select('description, due_date')
        .eq('type', 'checklist_loja')
        .not('description', 'is', null)
        .order('due_date', { ascending: false });

      const parsed: ShareEntry[] = [];
      const seenClients = new Set<string>();

      (data || []).forEach((a: any) => {
        try {
          const d = JSON.parse(a.description);
          const nossos = d.qtdProdutosNossos || 0;
          const concorrentes = d.qtdProdutosConcorrentes || 0;
          const total = nossos + concorrentes;
          if (total === 0) return;
          const clientName = d.cliente || 'Desconhecido';
          if (seenClients.has(clientName)) return;
          seenClients.add(clientName);

          // Parse per-category data
          const categories: CategoryShare[] = [];
          if (d.qtdPorCategoria) {
            for (const cat of PRODUCT_CATEGORIES) {
              const c = d.qtdPorCategoria[cat.key];
              if (c) {
                const n = c.nossos || 0;
                const co = c.concorrentes || 0;
                const t = n + co;
                categories.push({
                  label: cat.label,
                  nossos: n,
                  concorrentes: co,
                  share: t > 0 ? Math.round((n / t) * 100) : 0,
                });
              }
            }
          }

          parsed.push({
            clientName,
            share: Math.round((nossos / total) * 100),
            date: d.dataVisita || a.due_date,
            categories,
          });
        } catch { /* skip */ }
      });

      setEntries(parsed);
      setLoading(false);
    };
    load();
  }, [user?.email]);

  const avgShare = useMemo(() => {
    if (entries.length === 0) return null;
    return Math.round(entries.reduce((s, e) => s + e.share, 0) / entries.length);
  }, [entries]);

  const lowestShare = useMemo(() => {
    return [...entries].sort((a, b) => a.share - b.share).slice(0, 5);
  }, [entries]);

  if (loading || entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Store className="h-5 w-5" />
          Share de Loja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {avgShare !== null && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Share médio da carteira:</span>
            <Badge className={getShareColor(avgShare)}>{avgShare}%</Badge>
            <span className="text-xs text-muted-foreground">({entries.length} lojas)</span>
          </div>
        )}

        {lowestShare.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
              <TrendingDown className="h-3.5 w-3.5" /> Oportunidades de melhoria
            </p>
            <div className="space-y-1">
              {lowestShare.map((e, i) => {
                const isExpanded = expandedClient === e.clientName;
                return (
                  <Collapsible
                    key={i}
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedClient(open ? e.clientName : null)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted transition-colors cursor-pointer">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-sm">{e.clientName}</span>
                        </div>
                        <Badge className={`text-xs ${getShareColor(e.share)}`}>{e.share}%</Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {e.categories.length > 0 ? (
                        <div className="ml-6 mb-2 space-y-1 border-l-2 border-muted pl-3">
                          {e.categories.map((cat, ci) => (
                            <div key={ci} className="flex items-center justify-between text-xs py-1">
                              <span className="text-muted-foreground">{cat.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{cat.nossos}/{cat.nossos + cat.concorrentes}</span>
                                <Badge className={`text-[10px] px-1.5 py-0 ${getShareColor(cat.share)}`}>
                                  {cat.share}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="ml-6 mb-2 text-xs text-muted-foreground italic">
                          Sem detalhamento por categoria
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
