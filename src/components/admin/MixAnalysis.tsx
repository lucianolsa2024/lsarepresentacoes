import { useState, useMemo } from 'react';
import { useMixAnalysis, computeMixData } from '@/hooks/useMixAnalysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Grid3X3, Lightbulb, BarChart3 } from 'lucide-react';

const SEGMENT_COLORS: Record<string, string> = {
  A: 'bg-blue-500 text-white',
  B: 'bg-yellow-500 text-white',
  C: 'bg-gray-400 text-white',
};

function heatColor(value: number, max: number): string {
  if (value === 0) return 'bg-muted/30';
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.25) return 'bg-green-200 dark:bg-green-900';
  if (ratio < 0.5) return 'bg-green-400 dark:bg-green-700';
  if (ratio < 0.75) return 'bg-green-600 dark:bg-green-500 text-white';
  return 'bg-green-800 dark:bg-green-300 text-white dark:text-green-900';
}

export function MixAnalysis() {
  const { orders, representantes, loading } = useMixAnalysis();
  const [segmento, setSegmento] = useState('Todos');
  const [linha, setLinha] = useState('');
  const [periodo, setPeriodo] = useState(12);
  const [representante, setRepresentante] = useState('');

  const data = useMemo(
    () => computeMixData(orders, { segmento, linha, periodo, representante }),
    [orders, segmento, linha, periodo, representante]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayClients = data.clients.slice(0, 30);
  const displayProducts = data.products.slice(0, 40);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Segmento</label>
              <Select value={segmento} onValueChange={setSegmento}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Linha/Fornecedor</label>
              <Select value={linha || '__all__'} onValueChange={(v) => setLinha(v === '__all__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {data.lines.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Período</label>
              <Select value={String(periodo)} onValueChange={(v) => setPeriodo(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Representante</label>
              <Select value={representante || '__all__'} onValueChange={(v) => setRepresentante(v === '__all__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {representantes.map((r) => (
                    <SelectItem key={r.nome} value={r.nome}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{data.coverage.coveragePct}%</p>
            <p className="text-xs text-muted-foreground">Cobertura portfólio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{data.coverage.clients3LinesPct}%</p>
            <p className="text-xs text-muted-foreground">Clientes 3+ linhas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm font-bold truncate">{data.coverage.mostSold}</p>
            <p className="text-xs text-muted-foreground">Mais vendido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm font-bold truncate">{data.coverage.leastPenetrated}</p>
            <p className="text-xs text-muted-foreground">Menos penetrado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heatmap */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" /> Heatmap Produto × Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayProducts.length === 0 || displayClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados para o período selecionado.</p>
            ) : (
              <ScrollArea className="w-full">
                <TooltipProvider delayDuration={100}>
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-background z-10 px-2 py-1 text-left min-w-[120px] border-b">Produto</th>
                        {displayClients.map((c) => (
                          <th key={c.name} className="px-1 py-1 text-center border-b min-w-[28px] max-w-[28px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col items-center">
                                  <Badge className={`${SEGMENT_COLORS[c.segment]} text-[9px] px-1 py-0`}>{c.segment}</Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="font-medium">{c.name}</p>
                                <p>Total: {c.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayProducts.map((prod, idx) => {
                        const showLineHeader = idx === 0 || prod.line !== displayProducts[idx - 1].line;
                        return (
                          <>
                            {showLineHeader && (
                              <tr key={`line-${prod.line}`}>
                                <td colSpan={displayClients.length + 1} className="bg-muted/50 px-2 py-1 font-semibold text-muted-foreground border-b">
                                  {prod.line}
                                </td>
                              </tr>
                            )}
                            <tr key={prod.name}>
                              <td className="sticky left-0 bg-background z-10 px-2 py-1 truncate max-w-[140px] border-b" title={prod.name}>
                                {prod.name.length > 18 ? prod.name.slice(0, 18) + '…' : prod.name}
                              </td>
                              {displayClients.map((cli) => {
                                const cell = data.cells.get(`${prod.name}||${cli.name}`);
                                const val = cell?.value || 0;
                                return (
                                  <td key={cli.name} className="px-0 py-0 border-b border-r">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={`w-7 h-6 ${val > 0 ? heatColor(val, data.maxCellValue) : 'bg-muted/20'}`} />
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="font-medium">{cli.name}</p>
                                        <p>{prod.name}</p>
                                        {val > 0 ? (
                                          <p className="text-green-600">{val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        ) : (
                                          <p className="text-orange-500">Oportunidade</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </td>
                                );
                              })}
                            </tr>
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </TooltipProvider>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Opportunities panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> Top 10 Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma oportunidade identificada.</p>
            ) : (
              <div className="space-y-2">
                {data.opportunities.map((opp, i) => (
                  <div key={i} className="border rounded-md p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className={SEGMENT_COLORS[opp.segment]}>{opp.segment}</Badge>
                      <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    </div>
                    <p className="text-xs font-medium truncate" title={opp.client}>{opp.client}</p>
                    <p className="text-xs text-muted-foreground truncate" title={opp.product}>→ {opp.product}</p>
                    <p className="text-[10px] text-muted-foreground">{opp.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
