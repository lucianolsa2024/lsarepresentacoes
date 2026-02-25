import { useMemo, useState } from 'react';
import { Activity, ACTIVITY_TYPE_CONFIG } from '@/types/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, ClipboardCheck, Store, Package } from 'lucide-react';

interface ChecklistReportProps {
  activities: Activity[];
}

interface ParsedChecklist {
  activityId: string;
  clientName: string;
  clientId?: string;
  date: string;
  data: Record<string, any>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ChecklistReport({ activities }: ChecklistReportProps) {
  const [clientFilter, setClientFilter] = useState<string>('all');

  const checklists = useMemo<ParsedChecklist[]>(() => {
    return activities
      .filter(a => a.type === 'checklist_loja' && a.description)
      .map(a => {
        try {
          const data = JSON.parse(a.description!);
          return {
            activityId: a.id,
            clientName: data.cliente || a.client?.company || 'Desconhecido',
            clientId: a.client_id,
            date: data.dataVisita || a.due_date,
            data,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as ParsedChecklist[];
  }, [activities]);

  const clients = useMemo(() => {
    const unique = [...new Set(checklists.map(c => c.clientName))].sort();
    return unique;
  }, [checklists]);

  const filtered = useMemo(() => {
    if (clientFilter === 'all') return checklists;
    return checklists.filter(c => c.clientName === clientFilter);
  }, [checklists, clientFilter]);

  // Sort by date for timeline
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // Share evolution data
  const shareEvolution = useMemo(() => {
    return sorted
      .filter(c => c.data.qtdProdutosNossos != null && c.data.qtdProdutosConcorrentes != null)
      .map(c => {
        const total = (c.data.qtdProdutosNossos || 0) + (c.data.qtdProdutosConcorrentes || 0);
        const share = total > 0 ? Math.round((c.data.qtdProdutosNossos / total) * 100) : 0;
        return {
          date: format(parseISO(c.date), 'dd/MM/yy'),
          client: c.clientName,
          share,
          nossos: c.data.qtdProdutosNossos,
          concorrentes: c.data.qtdProdutosConcorrentes,
        };
      });
  }, [sorted]);

  // Product frequency
  const productFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(c => {
      (c.data.produtosExpostos || []).forEach((p: string) => {
        counts[p] = (counts[p] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));
  }, [filtered]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    filtered.forEach(c => {
      if (c.data.scoreLoja && counts[c.data.scoreLoja] !== undefined) {
        counts[c.data.scoreLoja]++;
      }
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: `Score ${name}`, value }));
  }, [filtered]);

  // Flow distribution
  const flowDistribution = useMemo(() => {
    const counts: Record<string, number> = { alto: 0, medio: 0, baixo: 0 };
    filtered.forEach(c => {
      if (c.data.fluxoLoja && counts[c.data.fluxoLoja] !== undefined) {
        counts[c.data.fluxoLoja]++;
      }
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [filtered]);

  // Humor distribution
  const humorDistribution = useMemo(() => {
    const counts: Record<string, number> = { positivo: 0, neutro: 0, negativo: 0 };
    filtered.forEach(c => {
      if (c.data.humorLojista && counts[c.data.humorLojista] !== undefined) {
        counts[c.data.humorLojista]++;
      }
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [filtered]);

  // Average share
  const avgShare = useMemo(() => {
    const shares = shareEvolution.map(s => s.share);
    if (shares.length === 0) return null;
    return Math.round(shares.reduce((a, b) => a + b, 0) / shares.length);
  }, [shareEvolution]);

  // Share trend
  const shareTrend = useMemo(() => {
    if (shareEvolution.length < 2) return null;
    const first = shareEvolution[0].share;
    const last = shareEvolution[shareEvolution.length - 1].share;
    return last - first;
  }, [shareEvolution]);

  // Competitors mentioned
  const competitors = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach(c => {
      if (c.data.concorrentesExpostos) {
        c.data.concorrentesExpostos.split(/[,;]/).forEach((comp: string) => {
          const trimmed = comp.trim();
          if (trimmed) set.add(trimmed);
        });
      }
      if (c.data.clienteComparaComMarca) {
        c.data.clienteComparaComMarca.split(/[,;]/).forEach((comp: string) => {
          const trimmed = comp.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return [...set].sort();
  }, [filtered]);

  if (checklists.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum checklist de loja preenchido ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" /> Relatório de Checklists
        </h3>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Checklists</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{new Set(filtered.map(c => c.clientName)).size}</p>
            <p className="text-xs text-muted-foreground">Lojas visitadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            {avgShare != null ? (
              <>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-2xl font-bold">{avgShare}%</p>
                  {shareTrend != null && (
                    shareTrend > 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> :
                    shareTrend < 0 ? <TrendingDown className="h-4 w-4 text-red-600" /> :
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Share médio</p>
                {shareTrend != null && (
                  <p className={`text-xs ${shareTrend > 0 ? 'text-green-600' : shareTrend < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {shareTrend > 0 ? '+' : ''}{shareTrend}pp
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Share médio</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{productFrequency.length}</p>
            <p className="text-xs text-muted-foreground">Produtos em exposição</p>
          </CardContent>
        </Card>
      </div>

      {/* Share Evolution Chart */}
      {shareEvolution.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evolução do Share</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={shareEvolution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} />
                <Line type="monotone" dataKey="share" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Products */}
        {productFrequency.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" /> Produtos mais expostos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productFrequency} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Aparições" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Score + Flow + Humor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Store className="h-4 w-4" /> Indicadores das Lojas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scoreDistribution.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Score</p>
                <div className="flex gap-3">
                  {scoreDistribution.map(s => (
                    <div key={s.name} className="flex-1 text-center p-2 rounded bg-muted">
                      <p className="text-lg font-bold">{s.value}</p>
                      <p className="text-xs">{s.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {flowDistribution.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Fluxo da Loja</p>
                <div className="flex gap-3">
                  {flowDistribution.map(f => (
                    <div key={f.name} className="flex-1 text-center p-2 rounded bg-muted">
                      <p className="text-lg font-bold">{f.value}</p>
                      <p className="text-xs">{f.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {humorDistribution.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Humor do Lojista</p>
                <div className="flex gap-3">
                  {humorDistribution.map(h => (
                    <div key={h.name} className="flex-1 text-center p-2 rounded bg-muted">
                      <p className="text-lg font-bold">{h.value}</p>
                      <p className="text-xs">{h.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Competitors */}
      {competitors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Concorrentes identificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {competitors.map(c => (
                <Badge key={c} variant="outline">{c}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Histórico de Visitas</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {sorted.reverse().map(c => {
                const total = (c.data.qtdProdutosNossos || 0) + (c.data.qtdProdutosConcorrentes || 0);
                const share = total > 0 ? Math.round((c.data.qtdProdutosNossos / total) * 100) : null;

                return (
                  <div key={c.activityId} className="p-3 rounded-lg border text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{c.clientName}</span>
                      <span className="text-xs text-muted-foreground">{format(parseISO(c.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {share != null && <Badge variant="secondary">Share: {share}%</Badge>}
                      {c.data.scoreLoja && <Badge variant="outline">Score {c.data.scoreLoja}</Badge>}
                      {c.data.fluxoLoja && <Badge variant="outline">Fluxo: {c.data.fluxoLoja}</Badge>}
                      {c.data.humorLojista && <Badge variant="outline">Humor: {c.data.humorLojista}</Badge>}
                      {c.data.ticketMedio && <Badge variant="outline">Ticket: {c.data.ticketMedio}</Badge>}
                    </div>
                    {c.data.oportunidadeIdentificada && (
                      <p className="text-xs text-muted-foreground mt-1">💡 {c.data.oportunidadeIdentificada}</p>
                    )}
                    {c.data.proximoPasso && (
                      <p className="text-xs text-muted-foreground">➡️ {c.data.proximoPasso}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
