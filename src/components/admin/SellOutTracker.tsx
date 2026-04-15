import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, RefreshCcw, Star, Users, AlertTriangle } from 'lucide-react';
import { useSellOutTracker, SellOutFilters } from '@/hooks/useSellOutTracker';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function SellOutTracker() {
  const [filters, setFilters] = useState<SellOutFilters>({
    clienteId: '',
    produtoId: '',
    linha: '',
    periodo: 12,
  });

  const {
    loading, clientes, produtos, linhas,
    totalSellOut, totalSellIn, taxaGiro,
    topProdutoGiro, topClienteSellOut,
    giroPorProduto, showroomRisco, rankingClientes,
  } = useSellOutTracker(filters);

  const update = (key: keyof SellOutFilters, val: string | number) =>
    setFilters(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Select value={filters.clienteId || '_all'} onValueChange={v => update('clienteId', v === '_all' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os clientes</SelectItem>
            {clientes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.produtoId || '_all'} onValueChange={v => update('produtoId', v === '_all' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os produtos</SelectItem>
            {produtos.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.linha || '_all'} onValueChange={v => update('linha', v === '_all' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Linha" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as linhas</SelectItem>
            {linhas.map(l => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(filters.periodo)} onValueChange={v => update('periodo', Number(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Total Sell-out
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalSellOut)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" /> Taxa de Giro
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{taxaGiro.toFixed(1)}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> Maior Giro
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-lg font-semibold truncate">{topProdutoGiro}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Top Cliente
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-lg font-semibold truncate">{topClienteSellOut}</p></CardContent>
        </Card>
      </div>

      {/* Giro por produto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Giro por Produto</CardTitle>
        </CardHeader>
        <CardContent>
          {giroPorProduto.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado de sell-out/showroom encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Clientes c/ exposição</TableHead>
                  <TableHead className="text-right">Sell-out total</TableHead>
                  <TableHead className="text-center">Dias médios</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {giroPorProduto.slice(0, 30).map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nome}</TableCell>
                    <TableCell className="text-center">{row.exposicao}</TableCell>
                    <TableCell className="text-right">{fmt(row.totalSo)}</TableCell>
                    <TableCell className="text-center">{row.diasMedio || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.status === 'alto' ? 'default' : row.status === 'medio' ? 'secondary' : 'destructive'}>
                        {row.status === 'alto' ? 'Alto' : row.status === 'medio' ? 'Médio' : row.status === 'baixo' ? 'Baixo' : 'Sem venda'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Showroom em risco */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Produtos em Risco no Showroom
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showroomRisco.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto em risco identificado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Dias em exposição</TableHead>
                  <TableHead className="text-center">Nível</TableHead>
                  <TableHead>Ação sugerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showroomRisco.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.produto}</TableCell>
                    <TableCell>{row.cliente}</TableCell>
                    <TableCell className="text-center">{row.dias}d</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.nivel === 'critico' ? 'destructive' : 'secondary'}>
                        {row.nivel === 'critico' ? '🔴 Crítico' : '🟡 Alerta'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.acao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ranking clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de Clientes por Sell-out</CardTitle>
        </CardHeader>
        <CardContent>
          {rankingClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Sell-out</TableHead>
                  <TableHead className="text-right">Sell-in</TableHead>
                  <TableHead className="text-center">Taxa de Giro</TableHead>
                  <TableHead className="text-center">Tendência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingClientes.slice(0, 30).map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nome}</TableCell>
                    <TableCell className="text-right">{fmt(row.sellOut12m)}</TableCell>
                    <TableCell className="text-right">{fmt(row.sellIn12m)}</TableCell>
                    <TableCell className="text-center">{row.taxaGiro.toFixed(1)}%</TableCell>
                    <TableCell className="text-center text-lg">
                      {row.taxaGiro >= 80 ? '↑' : row.taxaGiro >= 40 ? '→' : '↓'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
